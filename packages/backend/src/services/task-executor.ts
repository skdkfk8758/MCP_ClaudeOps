import { spawn, execSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { getDb } from '../database/index.js';
import { getTask } from '../models/task.js';
import { getEpic } from '../models/epic.js';
import { wsManager } from './websocket.js';
import { createExecutionLog, updateExecutionLog } from '../models/task-execution-log.js';
import { scanTaskCommits } from './commit-tracker-service.js';
import { runVerification } from './verification-executor.js';
import type { DesignResult, DesignStep, PipelineStep, ScopeAnalysis } from '@claudeops/shared';
import { linkEpicSession } from '../models/epic-session.js';

const activeTaskProcesses = new Map<number, ChildProcess>();

interface ExecuteOptions {
  model?: string;
  additionalContext?: string;
  dryRun?: boolean;
}

interface ExecuteResult {
  task_id: number;
  session_id?: string;
  status: 'started' | 'dry_run' | 'failed';
  prompt?: string;
  error?: string;
}

export function assembleTaskPrompt(taskId: number, projectPath: string, additionalContext?: string): string {
  const db = getDb();
  const task = getTask(taskId);
  if (!task) throw new Error(`Task #${taskId} not found`);

  const sections: string[] = [];

  // Task info
  sections.push(`# Task #${task.id}: ${task.title}`);
  sections.push(`**Priority:** ${task.priority}`);
  sections.push(`**Status:** ${task.status}`);
  if (task.estimated_effort) sections.push(`**Effort:** ${task.estimated_effort}`);
  if (task.labels?.length) sections.push(`**Labels:** ${task.labels.join(', ')}`);
  if (task.description) sections.push(`\n## Description\n${task.description}`);

  // Epic info
  if (task.epic_id) {
    const epic = getEpic(task.epic_id);
    if (epic) {
      sections.push(`\n## Parent Epic: ${epic.title}`);
      if (epic.description) sections.push(epic.description);
      if (epic.tech_approach) sections.push(`\n### Tech Approach\n${epic.tech_approach}`);
      if (epic.architecture_notes) sections.push(`\n### Architecture Notes\n${epic.architecture_notes}`);

      // PRD info
      if (epic.prd_id) {
        const prd = db.prepare('SELECT * FROM prds WHERE id = ?').get(epic.prd_id) as Record<string, unknown> | undefined;
        if (prd) {
          sections.push(`\n## PRD: ${prd.title}`);
          if (prd.vision) sections.push(`**Vision:** ${prd.vision}`);
          if (prd.description) sections.push(`${prd.description}`);
          if (prd.success_criteria) sections.push(`\n### Success Criteria\n${prd.success_criteria}`);
          if (prd.constraints) sections.push(`\n### Constraints\n${prd.constraints}`);
        }
      }
    }
  }

  // Project context
  const contexts = db.prepare('SELECT * FROM project_contexts WHERE project_path = ?').all(projectPath) as Record<string, unknown>[];
  if (contexts.length > 0) {
    sections.push('\n## Project Context');
    for (const ctx of contexts) {
      sections.push(`\n### ${ctx.title}\n${ctx.content}`);
    }
  }

  // Additional context
  if (additionalContext) {
    sections.push(`\n## Additional Instructions\n${additionalContext}`);
  }

  // Git 커밋 규칙
  if (task.branch_name) {
    sections.push(`\n## Git 커밋 규칙`);
    sections.push(`모든 커밋 메시지에 \`[TASK-${task.id}]\` prefix를 붙여주세요.`);
    sections.push(`예시: \`[TASK-${task.id}] feat: 로그인 검증 구현\``);
    sections.push(`작업 브랜치: \`${task.branch_name}\``);
  }

  // Final instruction
  sections.push(`\n---\n**Instruction:** Please implement Task #${task.id} ("${task.title}") in the project at \`${projectPath}\`. Follow the description, architecture notes, and constraints above.`);

  return sections.join('\n');
}

export async function executeTask(taskId: number, projectPath: string, options: ExecuteOptions = {}): Promise<ExecuteResult> {
  const db = getDb();
  const task = getTask(taskId);
  if (!task) throw new Error(`Task #${taskId} not found`);

  const prompt = assembleTaskPrompt(taskId, projectPath, options.additionalContext);

  // Dry run: just return the prompt
  if (options.dryRun) {
    return { task_id: taskId, status: 'dry_run', prompt };
  }

  // Validate project path
  if (!existsSync(projectPath)) {
    throw new Error(`Project path not found: ${projectPath}`);
  }

  // Check claude CLI is available
  try {
    execSync('which claude', { encoding: 'utf-8', timeout: 5000 });
  } catch {
    throw new Error('Claude CLI not found. Please install it first: https://docs.anthropic.com/en/docs/claude-code');
  }

  // Generate a session ID
  const sessionId = randomUUID();

  // Update task execution status
  db.prepare("UPDATE tasks SET execution_status = 'running', last_execution_at = datetime('now'), execution_session_id = ?, updated_at = datetime('now') WHERE id = ?")
    .run(sessionId, taskId);

  // Spawn claude CLI process — feed prompt via stdin for reliability
  const args = ['-p', '-', '--output-format', 'text'];
  if (options.model) {
    args.push('--model', options.model);
  }

  const child = spawn('claude', args, {
    cwd: projectPath,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  activeTaskProcesses.set(taskId, child);

  // Write prompt to stdin then close
  child.stdin.write(prompt);
  child.stdin.end();

  // Stream stdout chunks
  child.stdout.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    wsManager.notifyTaskStreamChunk({
      task_id: taskId,
      phase: 'implementation',
      chunk: text,
      timestamp: new Date().toISOString(),
    });
  });

  // Capture stderr for diagnostics
  let stderrOutput = '';
  child.stderr.on('data', (chunk: Buffer) => { stderrOutput += chunk.toString(); });

  // Handle process completion asynchronously
  child.on('close', (code) => {
    activeTaskProcesses.delete(taskId);
    const status = code === 0 ? 'completed' : 'failed';
    db.prepare("UPDATE tasks SET execution_status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(status, taskId);

    if (status === 'completed') {
      // 커밋 스캔
      try { scanTaskCommits(taskId, projectPath); } catch { /* non-critical */ }
      wsManager.notifyTaskExecutionCompleted({ task_id: taskId, session_id: sessionId });
    } else {
      console.error(`Task #${taskId} execution failed (exit ${code}):`, stderrOutput.slice(0, 500));
      wsManager.notifyTaskExecutionFailed({ task_id: taskId, session_id: sessionId, exit_code: code });
    }
  });

  child.on('error', (err) => {
    activeTaskProcesses.delete(taskId);
    db.prepare("UPDATE tasks SET execution_status = 'failed', updated_at = datetime('now') WHERE id = ?")
      .run(taskId);
    console.error(`Task #${taskId} execution error:`, err.message);
    wsManager.notifyTaskExecutionFailed({ task_id: taskId, session_id: sessionId, error: err.message });
  });

  return { task_id: taskId, session_id: sessionId, status: 'started' };
}

/**
 * 설계 프롬프트 조립 — assembleTaskPrompt 재사용 + 설계 모드 출력 형식 지시
 */
export function assembleDesignPrompt(taskId: number, projectPath: string): string {
  const task = getTask(taskId);
  if (!task) throw new Error(`Task #${taskId} not found`);

  // 사용자가 입력한 work_prompt 사용
  const workPrompt = task.work_prompt ?? '';

  // 기본 프롬프트 기반 + 설계 지시
  const basePrompt = assembleTaskPrompt(taskId, projectPath, workPrompt);

  // 에픽 범위 경계 지시 (epic_id가 있을 때만)
  let scopeBoundary = '';
  if (task.epic_id) {
    const epic = getEpic(task.epic_id);
    if (epic) {
      scopeBoundary = `

---
**에픽 범위 경계 (Scope Boundary)**
이 태스크는 에픽 "${epic.title}"에 속합니다.
에픽 설명: ${epic.description || '(없음)'}
기술 접근: ${epic.tech_approach || '(없음)'}
중요: 각 구현 단계가 이 에픽의 범위 내에 있는지 판단하세요.
범위를 벗어나는 단계에는 반드시 범위 태그를 out-of-scope 또는 partial로 표시하세요.
`;
    }
  }

  // scope 관련 필드는 epic_id가 있을 때만 추가
  const scopeFields = task.epic_id ? `
- **범위 태그**: {in-scope/out-of-scope/partial}
- **범위 사유**: {판단 근거 - out-of-scope/partial일 때만}` : '';

  const designInstructions = `
${scopeBoundary}
---
**모드: 설계 (Plan Mode)**

위 태스크에 대한 구현 계획을 작성해주세요. 다음 형식으로 출력하세요:

## 개요
[전체 구현 방향 요약]

## 구현 단계
각 단계를 다음 형식으로 작성:

### Step {n}: {제목}
- **에이전트**: {agent_type} (예: executor, analyst, test-engineer 등)
- **모델**: {model} (haiku, sonnet, opus 중 선택)
- **병렬 실행**: {yes/no}
- **설명**: {상세 설명}
- **프롬프트**: {해당 에이전트에게 전달할 구체적 프롬프트}
- **예상 결과**: {기대하는 산출물}${scopeFields}

## 위험 요소
- [위험 1]
- [위험 2]

## 성공 기준
- [기준 1]
- [기준 2]
`;

  return basePrompt + designInstructions;
}

/**
 * 마크다운 설계 결과 → DesignResult 구조체 파싱
 */
export function parseDesignResult(markdown: string): DesignResult {
  const result: DesignResult = {
    overview: '',
    steps: [],
    risks: [],
    success_criteria: [],
    raw_markdown: markdown,
  };

  // 개요 파싱
  const overviewMatch = markdown.match(/## 개요\s*\n([\s\S]*?)(?=\n## |$)/);
  if (overviewMatch) {
    result.overview = overviewMatch[1].trim();
  }

  // 단계 파싱
  const stepRegex = /### Step (\d+):\s*(.+)\n([\s\S]*?)(?=\n### Step |\n## |$)/g;
  let match;
  while ((match = stepRegex.exec(markdown)) !== null) {
    const stepBody = match[3];
    const step: DesignStep = {
      step: parseInt(match[1]),
      title: match[2].trim(),
      agent_type: extractField(stepBody, '에이전트') || 'executor',
      model: (extractField(stepBody, '모델') || 'sonnet') as DesignStep['model'],
      parallel: (extractField(stepBody, '병렬 실행') || 'no').toLowerCase().includes('yes'),
      description: extractField(stepBody, '설명') || '',
      prompt: extractField(stepBody, '프롬프트') || '',
      expected_output: extractField(stepBody, '예상 결과') || '',
      scope_tag: (extractField(stepBody, '범위 태그') || 'in-scope') as DesignStep['scope_tag'],
      scope_reason: extractField(stepBody, '범위 사유') || undefined,
    };
    result.steps.push(step);
  }

  // 위험 요소 파싱
  const risksMatch = markdown.match(/## 위험 요소\s*\n([\s\S]*?)(?=\n## |$)/);
  if (risksMatch) {
    result.risks = risksMatch[1].split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim());
  }

  // 성공 기준 파싱
  const criteriaMatch = markdown.match(/## 성공 기준\s*\n([\s\S]*?)(?=\n## |$)/);
  if (criteriaMatch) {
    result.success_criteria = criteriaMatch[1].split('\n')
      .filter(l => l.trim().startsWith('-'))
      .map(l => l.replace(/^-\s*/, '').trim());
  }

  return result;
}

/**
 * 설계 결과에서 범위 초과 분석
 */
export function analyzeScopeResult(designResult: DesignResult): ScopeAnalysis | undefined {
  const outOfScopeSteps = designResult.steps
    .filter(s => s.scope_tag === 'out-of-scope')
    .map(s => s.step);
  const partialSteps = designResult.steps
    .filter(s => s.scope_tag === 'partial')
    .map(s => s.step);

  if (outOfScopeSteps.length === 0 && partialSteps.length === 0) {
    return undefined;
  }

  // 범위 초과 단계의 제목/설명에서 제안 에픽 정보 추출
  const outSteps = designResult.steps.filter(s => s.scope_tag === 'out-of-scope');
  const titles = outSteps.map(s => s.title).join(', ');
  const allOutOfScope = outOfScopeSteps.length === designResult.steps.length;

  return {
    out_of_scope_steps: outOfScopeSteps,
    partial_steps: partialSteps,
    suggested_epic_title: `범위 분리: ${titles.slice(0, 100)}`,
    suggested_epic_description: outSteps.map(s => `- ${s.title}: ${s.description}`).join('\n'),
    reason: outSteps.map(s => s.scope_reason).filter(Boolean).join('; ') || '범위 초과 단계가 감지되었습니다',
    confidence: allOutOfScope ? 'low' : outOfScopeSteps.length >= 3 ? 'high' : 'medium',
  };
}

function extractField(text: string, fieldName: string): string | null {
  const regex = new RegExp(`\\*\\*${fieldName}\\*\\*:\\s*(.+)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * DesignStep[] → PipelineStep[] 변환
 * 병렬 가능한 연속 단계를 그룹핑
 */
export function designStepsToPipelineSteps(steps: DesignStep[]): PipelineStep[] {
  const pipelineSteps: PipelineStep[] = [];
  let currentGroup: DesignStep[] = [];
  let isCurrentParallel = false;

  const flushGroup = () => {
    if (currentGroup.length === 0) return;
    pipelineSteps.push({
      step: pipelineSteps.length + 1,
      parallel: isCurrentParallel && currentGroup.length > 1,
      agents: currentGroup.map(s => ({
        type: s.agent_type,
        model: s.model,
        prompt: s.prompt || s.description,
      })),
    });
    currentGroup = [];
  };

  for (const step of steps) {
    if (step.parallel === isCurrentParallel && step.parallel) {
      currentGroup.push(step);
    } else {
      flushGroup();
      isCurrentParallel = step.parallel;
      currentGroup = [step];
    }
  }
  flushGroup();

  return pipelineSteps;
}

/**
 * 설계 실행 — Claude CLI plan mode
 */
export async function runDesign(taskId: number, projectPath: string, model?: string): Promise<ExecuteResult> {
  const db = getDb();
  const task = getTask(taskId);
  if (!task) throw new Error(`Task #${taskId} not found`);

  if (!task.work_prompt) throw new Error('work_prompt이 비어있습니다. 먼저 작업 프롬프트를 입력하세요.');

  if (!existsSync(projectPath)) {
    throw new Error(`Project path not found: ${projectPath}`);
  }

  const prompt = assembleDesignPrompt(taskId, projectPath);
  const sessionId = randomUUID();

  // 상태 업데이트
  db.prepare("UPDATE tasks SET design_status = 'running', execution_session_id = ?, updated_at = datetime('now') WHERE id = ?")
    .run(sessionId, taskId);

  // 실행 로그 생성
  const log = createExecutionLog({
    task_id: taskId,
    phase: 'design',
    agent_type: 'planner',
    model: model || 'sonnet',
    input_prompt: prompt,
  });

  wsManager.notifyDesignStarted({ task_id: taskId, session_id: sessionId });

  // Claude CLI 호출 — plan mode
  const args = ['-p', '-', '--output-format', 'text'];
  if (model) args.push('--model', model);

  const child = spawn('claude', args, {
    cwd: projectPath,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  activeTaskProcesses.set(taskId, child);

  child.stdin.write(prompt);
  child.stdin.end();

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stdout += text;
    wsManager.notifyDesignProgress({ task_id: taskId, chunk: text });
    wsManager.notifyTaskStreamChunk({
      task_id: taskId,
      phase: 'design',
      chunk: text,
      timestamp: new Date().toISOString(),
    });
  });
  child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

  const startTime = Date.now();

  child.on('close', (code) => {
    activeTaskProcesses.delete(taskId);
    const duration = Date.now() - startTime;
    if (code === 0) {
      // 설계 결과 파싱 및 저장
      const designResult = parseDesignResult(stdout);

      // 범위 분석 (에픽이 있는 태스크만)
      if (task.epic_id) {
        const scopeAnalysis = analyzeScopeResult(designResult);
        if (scopeAnalysis) {
          designResult.scope_analysis = scopeAnalysis;
        }
        // 에픽 세션 링크
        linkEpicSession(task.epic_id, sessionId, taskId);
      }

      db.prepare("UPDATE tasks SET design_status = 'completed', design_result = ?, status = 'design', updated_at = datetime('now') WHERE id = ?")
        .run(JSON.stringify(designResult), taskId);

      updateExecutionLog(log.id, {
        status: 'completed',
        output_summary: designResult.overview,
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      });

      wsManager.notifyDesignCompleted({ task_id: taskId, result: designResult });

      // 범위 초과 알림
      if (designResult.scope_analysis) {
        wsManager.notifyScopeSplitProposed({
          task_id: taskId,
          epic_id: task.epic_id,
          scope_analysis: designResult.scope_analysis,
        });
      }
    } else {
      db.prepare("UPDATE tasks SET design_status = 'failed', updated_at = datetime('now') WHERE id = ?")
        .run(taskId);

      updateExecutionLog(log.id, {
        status: 'failed',
        error: stderr.slice(0, 1000),
        duration_ms: duration,
        completed_at: new Date().toISOString(),
      });

      wsManager.notifyDesignFailed({ task_id: taskId, error: stderr.slice(0, 500) });
    }
  });

  child.on('error', (err) => {
    activeTaskProcesses.delete(taskId);
    db.prepare("UPDATE tasks SET design_status = 'failed', updated_at = datetime('now') WHERE id = ?")
      .run(taskId);
    wsManager.notifyDesignFailed({ task_id: taskId, error: err.message });
  });

  return { task_id: taskId, session_id: sessionId, status: 'started' };
}

export function cancelTaskExecution(taskId: number): boolean {
  const child = activeTaskProcesses.get(taskId);
  if (!child) return false;

  child.kill('SIGTERM');
  activeTaskProcesses.delete(taskId);

  const db = getDb();
  db.prepare("UPDATE tasks SET execution_status = 'failed', design_status = CASE WHEN design_status = 'running' THEN 'failed' ELSE design_status END, updated_at = datetime('now') WHERE id = ?")
    .run(taskId);

  wsManager.notifyTaskExecutionCancelled({ task_id: taskId });
  return true;
}

/**
 * PipelineStep[] → React Flow graph_data (nodes + edges) 변환
 * 프론트엔드 loadStepsToCanvas 로직과 동일한 레이아웃
 */
export function pipelineStepsToGraphData(steps: PipelineStep[]): { nodes: Array<Record<string, unknown>>; edges: Array<Record<string, unknown>> } {
  const AGENT_DEFS: Record<string, { label: string; category: string; color: string }> = {
    explore: { label: 'Explore', category: 'build-analysis', color: '#3b82f6' },
    analyst: { label: 'Analyst', category: 'build-analysis', color: '#1d4ed8' },
    planner: { label: 'Planner', category: 'build-analysis', color: '#2563eb' },
    architect: { label: 'Architect', category: 'build-analysis', color: '#1e40af' },
    debugger: { label: 'Debugger', category: 'build-analysis', color: '#60a5fa' },
    executor: { label: 'Executor', category: 'build-analysis', color: '#3b82f6' },
    'deep-executor': { label: 'Deep Executor', category: 'build-analysis', color: '#1e3a8a' },
    verifier: { label: 'Verifier', category: 'build-analysis', color: '#93c5fd' },
    'style-reviewer': { label: 'Style Reviewer', category: 'review', color: '#a855f7' },
    'quality-reviewer': { label: 'Quality Reviewer', category: 'review', color: '#9333ea' },
    'api-reviewer': { label: 'API Reviewer', category: 'review', color: '#7c3aed' },
    'security-reviewer': { label: 'Security Reviewer', category: 'review', color: '#6d28d9' },
    'performance-reviewer': { label: 'Performance Reviewer', category: 'review', color: '#8b5cf6' },
    'code-reviewer': { label: 'Code Reviewer', category: 'review', color: '#581c87' },
    'dependency-expert': { label: 'Dependency Expert', category: 'domain', color: '#22c55e' },
    'test-engineer': { label: 'Test Engineer', category: 'domain', color: '#16a34a' },
    'build-fixer': { label: 'Build Fixer', category: 'domain', color: '#4ade80' },
    designer: { label: 'Designer', category: 'domain', color: '#86efac' },
    writer: { label: 'Writer', category: 'domain', color: '#bbf7d0' },
    'qa-tester': { label: 'QA Tester', category: 'domain', color: '#34d399' },
    scientist: { label: 'Scientist', category: 'domain', color: '#059669' },
    'git-master': { label: 'Git Master', category: 'domain', color: '#10b981' },
    critic: { label: 'Critic', category: 'coordination', color: '#ef4444' },
    vision: { label: 'Vision', category: 'coordination', color: '#f97316' },
  };

  const nodes: Array<Record<string, unknown>> = [];
  const edges: Array<Record<string, unknown>> = [];
  let prevIds: string[] = [];
  let y = 0;

  for (const step of steps) {
    const currentIds: string[] = [];
    const xStart = -(step.agents.length - 1) * 110;

    step.agents.forEach((agent, i) => {
      const nodeId = `import-${step.step}-${i}`;
      const def = AGENT_DEFS[agent.type];
      currentIds.push(nodeId);
      nodes.push({
        id: nodeId,
        type: 'agent',
        position: { x: xStart + i * 220, y },
        data: {
          agentType: agent.type,
          label: def?.label ?? agent.type,
          model: agent.model,
          prompt: agent.prompt,
          category: def?.category ?? 'custom',
          color: def?.color ?? '#6b7280',
          ...(agent.task_id != null ? { task_id: agent.task_id } : {}),
        },
      });
    });

    for (const prevId of prevIds) {
      for (const curId of currentIds) {
        edges.push({ id: `e-${prevId}-${curId}`, source: prevId, target: curId, animated: true });
      }
    }

    prevIds = currentIds;
    y += 120;
  }

  return { nodes, edges };
}

/**
 * 구현 실행 — 설계 세션을 resume하여 구현
 */
export async function runImplementation(taskId: number, projectPath: string, _model?: string): Promise<ExecuteResult> {
  const db = getDb();
  const task = getTask(taskId);
  if (!task) throw new Error(`Task #${taskId} not found`);
  if (!task.pipeline_id) throw new Error('파이프라인이 생성되지 않았습니다. 먼저 설계를 승인하세요.');

  if (!existsSync(projectPath)) {
    throw new Error(`Project path not found: ${projectPath}`);
  }

  // 기존 executePipeline 재사용
  const { executePipeline } = await import('./pipeline-executor.js');
  const execution = await executePipeline(task.pipeline_id, projectPath, false, taskId);

  // 태스크 상태 업데이트
  db.prepare("UPDATE tasks SET status = 'implementation', execution_status = 'running', last_execution_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
    .run(taskId);

  wsManager.notifyImplementationProgress({ task_id: taskId, execution_id: execution.id });

  // 파이프라인 완료 감시 → 커밋 스캔 + 검증 자동 트리거
  const checkInterval = setInterval(async () => {
    try {
      const { getExecution } = await import('../models/pipeline.js');
      const exec = getExecution(execution.id);
      if (exec && (exec.status === 'completed' || exec.status === 'failed')) {
        clearInterval(checkInterval);
        // 커밋 스캔
        try { scanTaskCommits(taskId, projectPath); } catch { /* non-critical */ }
        // 구현 완료 시 검증 자동 실행
        if (exec.status === 'completed') {
          try { await runVerification(taskId, projectPath); } catch { /* non-critical */ }
        }
      }
    } catch {
      clearInterval(checkInterval);
    }
  }, 5000);

  // 최대 30분 후 인터벌 정리
  setTimeout(() => clearInterval(checkInterval), 30 * 60 * 1000);

  return { task_id: taskId, session_id: randomUUID(), status: 'started' };
}
