import { getPipeline, createExecution, updateExecution } from '../models/pipeline.js';
import { listTeamAgents } from '../models/team.js';
import { wsManager } from './websocket.js';
import { spawn } from 'node:child_process';
import type { PipelineExecution, PipelineStepResult, AgentTier, StepStatus } from '@claudeops/shared';

const activeExecutions = new Map<number, AbortController>();

// ─── 모델별 타임아웃 (가드레일) ───
const MODEL_TIMEOUTS: Record<AgentTier, number> = {
  haiku: 2 * 60 * 1000,   // 2분
  sonnet: 5 * 60 * 1000,  // 5분
  opus: 15 * 60 * 1000,   // 15분
};

// ─── 전역 동시 실행 제한 ───
let globalConcurrent = 0;
const MAX_GLOBAL_CONCURRENT = 5;

function getSimulationDelay(model: AgentTier): number {
  switch (model) {
    case 'haiku': return 800 + Math.random() * 700;
    case 'sonnet': return 1500 + Math.random() * 1500;
    case 'opus': return 2500 + Math.random() * 2500;
  }
}

/**
 * system_prompt가 있으면 XML 구분자로 감싸서 프롬프트 앞에 주입
 */
function buildFullPrompt(prompt: string, systemPrompt?: string, contextPrompt?: string): string {
  let fullPrompt = '';
  if (systemPrompt) {
    fullPrompt += `<system_prompt>${systemPrompt}</system_prompt>\n\n`;
  }
  if (contextPrompt) {
    fullPrompt += `<context>${contextPrompt}</context>\n\n`;
  }
  fullPrompt += prompt;
  return fullPrompt;
}

function runAgent(agentType: string, model: string, prompt: string, projectPath: string, signal: AbortSignal, taskId?: number): Promise<{ stdout: string; stderr: string }> {
  const timeout = MODEL_TIMEOUTS[model as AgentTier] ?? MODEL_TIMEOUTS.sonnet;

  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Execution cancelled')); return; }

    // 전역 동시 실행 제한 확인
    if (globalConcurrent >= MAX_GLOBAL_CONCURRENT) {
      reject(new Error(`전역 동시 실행 제한 초과 (최대 ${MAX_GLOBAL_CONCURRENT})`));
      return;
    }
    globalConcurrent++;

    const proc = spawn('claude', ['-p', prompt, '--model', model], {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    // 모델별 타임아웃 설정
    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Agent ${agentType} (${model}) 타임아웃 (${timeout / 1000}초)`));
    }, timeout);

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      if (taskId) {
        wsManager.notifyTaskStreamChunk({
          task_id: taskId,
          phase: 'implementation',
          chunk: text,
          timestamp: new Date().toISOString(),
          agent_type: agentType,
        });
      }
    });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const onAbort = () => { clearTimeout(timeoutId); proc.kill('SIGTERM'); reject(new Error('Execution cancelled')); };
    signal.addEventListener('abort', onAbort, { once: true });

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      globalConcurrent--;
      signal.removeEventListener('abort', onAbort);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Agent ${agentType} exited with code ${code}: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      globalConcurrent--;
      signal.removeEventListener('abort', onAbort);
      reject(err);
    });
  });
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('Execution cancelled')); return; }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => { clearTimeout(timer); reject(new Error('Execution cancelled')); };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function executePipeline(pipelineId: number, projectPath: string, simulate = false, taskId?: number, teamId?: number): Promise<PipelineExecution> {
  const pipeline = getPipeline(pipelineId);
  if (!pipeline) throw new Error('Pipeline not found');
  if (pipeline.steps.length === 0) throw new Error('Pipeline has no steps');

  // 팀 컨텍스트: teamId가 있으면 팀 에이전트의 system_prompt/context_prompt 조회
  const teamAgentMap = new Map<string, { system_prompt?: string; context_prompt?: string }>();
  if (teamId) {
    const teamAgents = listTeamAgents(teamId);
    for (const ta of teamAgents) {
      const key = ta.persona?.agent_type ?? '';
      if (key) {
        teamAgentMap.set(key, {
          system_prompt: ta.persona?.system_prompt ?? undefined,
          context_prompt: ta.context_prompt ?? undefined,
        });
      }
    }
  }

  const execution = createExecution(pipelineId, pipeline.steps.length);
  const controller = new AbortController();
  activeExecutions.set(execution.id, controller);

  wsManager.notifyPipelineExecutionStarted(execution);

  const results: PipelineStepResult[] = pipeline.steps.map((step) => ({
    step: step.step,
    status: 'pending' as StepStatus,
    agents: step.agents.map((agent) => ({
      type: agent.type,
      status: 'pending' as StepStatus,
    })),
  }));

  // Run async - don't block the caller
  (async () => {
    try {
      for (let i = 0; i < pipeline.steps.length; i++) {
        if (controller.signal.aborted) throw new Error('Execution cancelled');

        const step = pipeline.steps[i];
        results[i].status = 'running';

        // Update current step
        updateExecution(execution.id, { current_step: i + 1, results });
        wsManager.notifyPipelineExecutionProgress(getExecutionSnapshot(execution.id, i + 1, results));

        const runSingleAgent = async (agentIndex: number) => {
          const agent = step.agents[agentIndex];
          results[i].agents[agentIndex].status = 'running';
          results[i].agents[agentIndex].started_at = new Date().toISOString();

          try {
            if (simulate) {
              await delay(getSimulationDelay(agent.model as AgentTier), controller.signal);
            } else {
              // 팀 컨텍스트에서 system_prompt/context_prompt 주입
              const teamContext = teamAgentMap.get(agent.type);
              const fullPrompt = buildFullPrompt(
                agent.prompt,
                teamContext?.system_prompt,
                teamContext?.context_prompt
              );
              await runAgent(agent.type, agent.model, fullPrompt, projectPath, controller.signal, taskId);
            }
            results[i].agents[agentIndex].status = 'completed';
            results[i].agents[agentIndex].completed_at = new Date().toISOString();
          } catch (err) {
            results[i].agents[agentIndex].status = 'failed';
            results[i].agents[agentIndex].completed_at = new Date().toISOString();
            results[i].agents[agentIndex].error = err instanceof Error ? err.message : String(err);
            throw err;
          }
        };

        if (step.parallel) {
          await Promise.all(step.agents.map((_, idx) => runSingleAgent(idx)));
        } else {
          for (let j = 0; j < step.agents.length; j++) {
            await runSingleAgent(j);
          }
        }

        results[i].status = 'completed';
        updateExecution(execution.id, { results });
        wsManager.notifyPipelineExecutionProgress(getExecutionSnapshot(execution.id, i + 1, results));
      }

      // All steps completed
      updateExecution(execution.id, {
        status: 'completed',
        results,
        completed_at: new Date().toISOString(),
      });
      wsManager.notifyPipelineExecutionCompleted(getExecutionSnapshot(execution.id, pipeline.steps.length, results, 'completed'));
    } catch (err) {
      const isCancelled = controller.signal.aborted;
      const finalStatus = isCancelled ? 'cancelled' : 'failed';

      // Mark remaining pending steps as failed
      for (const result of results) {
        if (result.status === 'pending' || result.status === 'running') {
          result.status = 'failed';
          for (const agent of result.agents) {
            if (agent.status === 'pending' || agent.status === 'running') {
              agent.status = 'failed';
              agent.error = isCancelled ? 'Execution cancelled' : (err instanceof Error ? err.message : String(err));
            }
          }
        }
      }

      updateExecution(execution.id, {
        status: finalStatus,
        results,
        completed_at: new Date().toISOString(),
      });
      wsManager.notifyPipelineExecutionFailed(getExecutionSnapshot(execution.id, 0, results, finalStatus));
    } finally {
      activeExecutions.delete(execution.id);
    }
  })();

  return execution;
}

export function cancelExecution(executionId: number): boolean {
  const controller = activeExecutions.get(executionId);
  if (!controller) return false;
  controller.abort();
  return true;
}

function getExecutionSnapshot(id: number, currentStep: number, results: PipelineStepResult[], status?: string): Record<string, unknown> {
  return {
    id,
    current_step: currentStep,
    results,
    ...(status ? { status } : {}),
  };
}
