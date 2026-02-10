import type { FastifyInstance } from 'fastify';
import { createTask, getTask, updateTask, deleteTask, listTasks, getTaskBoard, moveTask, getTaskHistory, linkTaskSession, getTaskStats } from '../models/task.js';
import { wsManager } from '../services/websocket.js';
import { runDesign, runImplementation, designStepsToPipelineSteps, pipelineStepsToGraphData, cancelTaskExecution } from '../services/task-executor.js';
import { runVerification, retryVerification } from '../services/verification-executor.js';
import { scanTaskCommits, linkCommit, generateBranchName } from '../services/commit-tracker-service.js';
import { getTaskCommits } from '../models/commit-tracker.js';
import { createPipeline } from '../models/pipeline.js';
import { listExecutionLogs, listExecutionGroups } from '../models/task-execution-log.js';
import { getDb } from '../database/index.js';
import { getEpic } from '../models/epic.js';
import { getPrd } from '../models/prd.js';
import type { DesignResult, DesignResultUpdate, TaskUpdate, VerificationResult, ScopeProposal, ScopeSplitResult } from '@claudeops/shared';
import { createEpic } from '../models/epic.js';

export async function registerTaskRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/tasks
  app.post('/api/tasks', async (request, reply) => {
    const body = request.body as { title?: string; description?: string; status?: string; priority?: string; assignee?: string; due_date?: string; estimated_effort?: string; labels?: string[]; epic_id?: number };
    if (!body.title) return reply.status(400).send({ error: 'bad_request', message: 'title is required' });
    const task = createTask(body as Parameters<typeof createTask>[0]);
    wsManager.notifyTaskCreated(task);
    return reply.status(201).send(task);
  });

  // GET /api/tasks
  app.get('/api/tasks', async (request) => {
    const query = request.query as { status?: string; priority?: string; assignee?: string; label?: string; epic_id?: string; page?: string; page_size?: string };
    return listTasks({
      status: query.status, priority: query.priority, assignee: query.assignee, label: query.label,
      epic_id: query.epic_id ? parseInt(query.epic_id) : undefined,
      page: query.page ? parseInt(query.page) : undefined,
      page_size: query.page_size ? parseInt(query.page_size) : undefined,
    });
  });

  // GET /api/tasks/board — with optional filters
  app.get('/api/tasks/board', async (request) => {
    const query = request.query as {
      epic_id?: string; priority?: string; assignee_id?: string;
      label?: string; team_id?: string; effort?: string;
    };
    const filters: Record<string, unknown> = {};
    if (query.epic_id) filters.epic_id = parseInt(query.epic_id);
    if (query.priority) filters.priority = query.priority;
    if (query.assignee_id) filters.assignee_id = parseInt(query.assignee_id);
    if (query.label) filters.label = query.label;
    if (query.team_id) filters.team_id = parseInt(query.team_id);
    if (query.effort) filters.effort = query.effort;

    return getTaskBoard(Object.keys(filters).length > 0 ? filters as Parameters<typeof getTaskBoard>[0] : undefined);
  });

  // GET /api/tasks/stats
  app.get('/api/tasks/stats', async () => {
    return getTaskStats();
  });

  // GET /api/tasks/:id
  app.get('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = getTask(parseInt(id));
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    return task;
  });

  // GET /api/tasks/:id/resolve-project-path — Task → Epic → PRD 체인으로 project_path 해석
  app.get('/api/tasks/:id/resolve-project-path', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = getTask(parseInt(id));
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });

    let projectPath: string | null = null;
    if (task.epic_id) {
      const epic = getEpic(task.epic_id);
      if (epic?.prd_id) {
        const prd = getPrd(epic.prd_id);
        if (prd?.project_path) {
          projectPath = prd.project_path;
        }
      }
    }
    return { project_path: projectPath };
  });

  // PATCH /api/tasks/:id
  app.patch('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const task = updateTask(parseInt(id), body as Parameters<typeof updateTask>[1]);
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    wsManager.notifyTaskUpdated(task);
    return task;
  });

  // DELETE /api/tasks/:id
  app.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id);
    const deleted = deleteTask(numId);
    if (!deleted) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    wsManager.notifyTaskDeleted(numId);
    return { success: true };
  });

  // POST /api/tasks/:id/move
  app.post('/api/tasks/:id/move', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status: string; position: number };
    if (!body.status || body.position === undefined) return reply.status(400).send({ error: 'bad_request', message: 'status and position required' });
    try {
      const task = moveTask(parseInt(id), body as Parameters<typeof moveTask>[1]);
      if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
      wsManager.notifyTaskMoved(task);
      return task;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: 'move_blocked', message });
    }
  });

  // GET /api/tasks/:id/history
  app.get('/api/tasks/:id/history', async (request) => {
    const { id } = request.params as { id: string };
    return getTaskHistory(parseInt(id));
  });

  // POST /api/tasks/:id/link-session
  app.post('/api/tasks/:id/link-session', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { session_id?: string };
    if (!body.session_id) return reply.status(400).send({ error: 'bad_request', message: 'session_id is required' });
    const linked = linkTaskSession(parseInt(id), body.session_id);
    if (!linked) return reply.status(400).send({ error: 'link_failed', message: 'Failed to link session' });
    return { success: true };
  });

  // POST /api/tasks/:id/branch — set branch name
  app.post('/api/tasks/:id/branch', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { branch_name?: string };
    if (!body.branch_name) return reply.status(400).send({ error: 'bad_request', message: 'branch_name is required' });
    const task = updateTask(parseInt(id), { branch_name: body.branch_name } as Parameters<typeof updateTask>[1]);
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    wsManager.notifyTaskUpdated(task);
    return task;
  });

  // DELETE /api/tasks/:id/branch — remove branch name
  app.delete('/api/tasks/:id/branch', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = updateTask(parseInt(id), { branch_name: null } as Parameters<typeof updateTask>[1]);
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    wsManager.notifyTaskUpdated(task);
    return task;
  });

  // POST /api/tasks/:id/execute — execute task via Claude CLI
  app.post('/api/tasks/:id/execute', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { project_path?: string; model?: string; additional_context?: string; dry_run?: boolean };
    if (!body.project_path) return reply.status(400).send({ error: 'bad_request', message: 'project_path is required' });

    try {
      const { executeTask } = await import('../services/task-executor.js');
      const result = await executeTask(parseInt(id), body.project_path, {
        model: body.model,
        additionalContext: body.additional_context,
        dryRun: body.dry_run,
      });
      if (result.status === 'started') {
        wsManager.notifyTaskExecutionStarted({ task_id: parseInt(id), session_id: result.session_id });
      }
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: 'execution_failed', message });
    }
  });

  // GET /api/tasks/:id/execution-status
  app.get('/api/tasks/:id/execution-status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = getTask(parseInt(id));
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    return {
      execution_status: task.execution_status,
      last_execution_at: task.last_execution_at,
      execution_session_id: task.execution_session_id,
    };
  });

  // --- 설계 워크플로우 API ---

  // POST /api/tasks/:id/design — 설계 실행
  app.post('/api/tasks/:id/design', async (request, reply) => {
    const { id } = request.params as { id: string };
    const taskId = parseInt(id);
    const body = request.body as { project_path: string; model?: string; work_prompt?: string };

    if (!body.project_path) {
      return reply.status(400).send({ error: 'bad_request', message: 'project_path is required' });
    }

    // work_prompt 저장 (전달된 경우)
    if (body.work_prompt) {
      updateTask(taskId, { work_prompt: body.work_prompt } as TaskUpdate);
    }

    try {
      const result = await runDesign(taskId, body.project_path, body.model);
      wsManager.notifyTaskUpdated(getTask(taskId)!);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: 'design_failed', message });
    }
  });

  // PATCH /api/tasks/:id/design — 설계 결과 수정
  app.patch('/api/tasks/:id/design', async (request, reply) => {
    const { id } = request.params as { id: string };
    const taskId = parseInt(id);
    const task = getTask(taskId);

    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    if (!task.design_result) return reply.status(400).send({ error: 'bad_request', message: 'No design result to update' });

    const body = request.body as DesignResultUpdate;
    const existing: DesignResult = JSON.parse(task.design_result as string);

    // 부분 업데이트 적용
    if (body.steps !== undefined) existing.steps = body.steps;
    if (body.overview !== undefined) existing.overview = body.overview;
    if (body.risks !== undefined) existing.risks = body.risks;
    if (body.success_criteria !== undefined) existing.success_criteria = body.success_criteria;

    const db = getDb();
    db.prepare("UPDATE tasks SET design_result = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(existing), taskId);

    const updated = getTask(taskId)!;
    wsManager.notifyTaskUpdated(updated);
    return reply.send(updated);
  });

  // POST /api/tasks/:id/design/approve — 설계 승인 + 파이프라인 생성
  app.post('/api/tasks/:id/design/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const taskId = parseInt(id);
    const task = getTask(taskId);

    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    if (!task.design_result) return reply.status(400).send({ error: 'bad_request', message: 'No design result to approve' });

    // 설계 결과 파싱
    const designResult: DesignResult = JSON.parse(task.design_result as string);
    const pipelineSteps = designStepsToPipelineSteps(designResult.steps);

    // 파이프라인 생성 (graph_data 포함하여 에디터에서 즉시 시각화)
    const graphData = pipelineStepsToGraphData(pipelineSteps);
    const pipeline = createPipeline({
      name: `Task #${taskId}: ${task.title}`,
      description: designResult.overview,
      epic_id: task.epic_id ?? undefined,
      steps: pipelineSteps,
      task_id: taskId,
      graph_data: JSON.stringify(graphData),
    });

    // 태스크에 pipeline_id 연결
    const db = getDb();
    db.prepare("UPDATE tasks SET pipeline_id = ?, updated_at = datetime('now') WHERE id = ?")
      .run(pipeline.id, taskId);

    wsManager.notifyPipelineCreated(pipeline);
    wsManager.notifyTaskUpdated(getTask(taskId)!);

    return reply.send({ task_id: taskId, pipeline_id: pipeline.id, pipeline });
  });

  // GET /api/tasks/:id/design/scope-proposal — 범위 초과 제안 조회
  app.get('/api/tasks/:id/design/scope-proposal', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = getTask(parseInt(id));
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    if (!task.design_result) return reply.send({ has_proposal: false });

    const designResult: DesignResult = JSON.parse(task.design_result as string);
    if (!designResult.scope_analysis || designResult.scope_analysis.out_of_scope_steps.length === 0) {
      return reply.send({ has_proposal: false });
    }

    const sa = designResult.scope_analysis;
    const outSteps = designResult.steps.filter(s => s.scope_tag === 'out-of-scope');
    const partialSteps = designResult.steps.filter(s => s.scope_tag === 'partial');

    const proposal: ScopeProposal = {
      task_id: parseInt(id),
      original_epic_id: task.epic_id!,
      out_of_scope_steps: outSteps,
      partial_steps: partialSteps,
      suggested_epic: {
        title: sa.suggested_epic_title,
        description: sa.suggested_epic_description,
        prd_id: undefined,
      },
      suggested_tasks: outSteps.map(s => ({ title: s.title, description: s.description })),
    };

    // prd_id 추출
    if (task.epic_id) {
      const epic = getEpic(task.epic_id);
      if (epic?.prd_id) proposal.suggested_epic.prd_id = epic.prd_id;
    }

    return reply.send({ has_proposal: true, proposal });
  });

  // POST /api/tasks/:id/design/scope-split — 범위 분리 실행
  app.post('/api/tasks/:id/design/scope-split', async (request, reply) => {
    const { id } = request.params as { id: string };
    const taskId = parseInt(id);
    const task = getTask(taskId);
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    if (!task.design_result) return reply.status(400).send({ error: 'bad_request', message: 'No design result' });
    if (!task.epic_id) return reply.status(400).send({ error: 'bad_request', message: 'Task has no epic' });

    const body = request.body as { epic_title?: string; epic_description?: string; include_partial?: boolean };
    const designResult: DesignResult = JSON.parse(task.design_result as string);

    if (!designResult.scope_analysis) {
      return reply.status(400).send({ error: 'bad_request', message: 'No scope analysis found' });
    }

    const includePartial = body.include_partial ?? false;

    // 1. 새 에픽 생성
    const originalEpic = getEpic(task.epic_id);
    const newEpic = createEpic({
      title: body.epic_title || designResult.scope_analysis.suggested_epic_title,
      description: body.epic_description || designResult.scope_analysis.suggested_epic_description,
      prd_id: originalEpic?.prd_id ?? undefined,
    });

    // 2. out-of-scope steps → 새 태스크 생성
    const outStepNumbers = new Set(designResult.scope_analysis.out_of_scope_steps);
    const partialStepNumbers = includePartial ? new Set(designResult.scope_analysis.partial_steps) : new Set<number>();
    const stepsToMove = new Set([...outStepNumbers, ...partialStepNumbers]);

    const newTaskIds: number[] = [];
    for (const step of designResult.steps) {
      if (stepsToMove.has(step.step)) {
        const { createTask } = await import('../models/task.js');
        const newTask = createTask({
          title: step.title,
          description: step.description,
          epic_id: newEpic.id,
          labels: ['scope-split'],
          priority: task.priority as 'P0' | 'P1' | 'P2' | 'P3',
        });
        newTaskIds.push(newTask.id);
      }
    }

    // 3. 원래 design_result에서 이동된 steps 제거 + 번호 재정렬
    const remainingSteps = designResult.steps
      .filter(s => !stepsToMove.has(s.step))
      .map((s, i) => ({ ...s, step: i + 1 }));

    designResult.steps = remainingSteps;
    // scope_analysis 클리어
    designResult.scope_analysis = undefined;

    // 4. 업데이트 저장
    const db = getDb();
    db.prepare("UPDATE tasks SET design_result = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(designResult), taskId);

    // 5. WebSocket 알림
    wsManager.notifyEpicCreated(newEpic);
    wsManager.notifyTaskUpdated(getTask(taskId)!);
    for (const ntId of newTaskIds) {
      wsManager.notifyTaskCreated(getTask(ntId)!);
    }
    wsManager.broadcast('task', 'scope_split_completed', {
      task_id: taskId,
      new_epic_id: newEpic.id,
      new_task_ids: newTaskIds,
    });

    const result: ScopeSplitResult = {
      new_epic_id: newEpic.id,
      new_task_ids: newTaskIds,
      updated_design_result: designResult,
    };

    return reply.send(result);
  });

  // POST /api/tasks/:id/implement — 구현 실행
  app.post('/api/tasks/:id/implement', async (request, reply) => {
    const { id } = request.params as { id: string };
    const taskId = parseInt(id);
    const body = request.body as { project_path: string; model?: string };

    if (!body.project_path) {
      return reply.status(400).send({ error: 'bad_request', message: 'project_path is required' });
    }

    try {
      const result = await runImplementation(taskId, body.project_path, body.model);
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: 'implementation_failed', message });
    }
  });

  // GET /api/tasks/:id/execution-logs — 실행 로그 조회
  app.get('/api/tasks/:id/execution-logs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const taskId = parseInt(id);
    const query = request.query as {
      phase?: string;
      agent_type?: string;
      model?: string;
      status?: string;
      search?: string;
      execution_id?: string;
      page?: string;
      page_size?: string;
    };

    const logs = listExecutionLogs(taskId, {
      phase: query.phase,
      agent_type: query.agent_type,
      model: query.model,
      status: query.status,
      search: query.search,
      execution_id: query.execution_id ? parseInt(query.execution_id) : undefined,
      page: query.page ? parseInt(query.page) : undefined,
      page_size: query.page_size ? parseInt(query.page_size) : undefined,
    });

    return reply.send(logs);
  });

  // GET /api/tasks/:id/execution-groups — 실행 그룹 조회
  app.get('/api/tasks/:id/execution-groups', async (request, reply) => {
    const { id } = request.params as { id: string };
    const groups = listExecutionGroups(parseInt(id));
    return reply.send(groups);
  });

  // POST /api/tasks/:id/cancel — 태스크 실행 취소
  app.post('/api/tasks/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const taskId = parseInt(id);
    const task = getTask(taskId);
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });

    const isRunning = task.execution_status === 'running' || task.design_status === 'running';
    if (!isRunning) return reply.status(400).send({ error: 'not_running', message: 'Task is not currently running' });

    // 파이프라인 실행 취소 시도
    if (task.pipeline_id) {
      try {
        const { cancelExecution } = await import('../services/pipeline-executor.js');
        const { listExecutions } = await import('../models/pipeline.js');
        const executions = listExecutions(task.pipeline_id);
        const runningExec = executions.find(e => e.status === 'running');
        if (runningExec) {
          cancelExecution(runningExec.id);
        }
      } catch { /* 파이프라인 취소 실패는 무시 */ }
    }

    // 직접 실행 프로세스 취소
    const cancelled = cancelTaskExecution(taskId);

    return reply.send({ success: true, cancelled });
  });

  // --- 검증 워크플로우 API ---

  // POST /api/tasks/:id/verify — 검증 실행
  app.post('/api/tasks/:id/verify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { project_path?: string; checks?: string[]; coverage_threshold?: number };
    if (!body.project_path) return reply.status(400).send({ error: 'bad_request', message: 'project_path is required' });

    try {
      const result = await runVerification(parseInt(id), body.project_path, {
        checks: body.checks,
        coverageThreshold: body.coverage_threshold,
      });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: 'verification_failed', message });
    }
  });

  // GET /api/tasks/:id/verification — 검증 결과 조회
  app.get('/api/tasks/:id/verification', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = getTask(parseInt(id));
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    if (!task.verification_result) return reply.send({ status: null, result: null });

    const result: VerificationResult = JSON.parse(task.verification_result);
    return reply.send({ status: task.verification_status, result });
  });

  // POST /api/tasks/:id/verify/retry — 검증 재실행
  app.post('/api/tasks/:id/verify/retry', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { project_path?: string; failed_only?: boolean; coverage_threshold?: number };
    if (!body.project_path) return reply.status(400).send({ error: 'bad_request', message: 'project_path is required' });

    try {
      const result = await retryVerification(parseInt(id), body.project_path, {
        failedOnly: body.failed_only,
        coverageThreshold: body.coverage_threshold,
      });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: 'verification_failed', message });
    }
  });

  // --- 커밋 추적 API ---

  // GET /api/tasks/:id/commits — 커밋 목록 조회
  app.get('/api/tasks/:id/commits', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = getTask(parseInt(id));
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    const commits = getTaskCommits(parseInt(id));
    return reply.send({ task_id: parseInt(id), commits });
  });

  // POST /api/tasks/:id/commits/scan — 커밋 스캔
  app.post('/api/tasks/:id/commits/scan', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { project_path?: string };
    if (!body.project_path) return reply.status(400).send({ error: 'bad_request', message: 'project_path is required' });

    try {
      const result = scanTaskCommits(parseInt(id), body.project_path);
      wsManager.notifyCommitsScanned({ task_id: parseInt(id), ...result });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: 'scan_failed', message });
    }
  });

  // POST /api/tasks/:id/commits/link — 수동 커밋 연결
  app.post('/api/tasks/:id/commits/link', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { commit_hash?: string; project_path?: string };
    if (!body.commit_hash || !body.project_path) {
      return reply.status(400).send({ error: 'bad_request', message: 'commit_hash and project_path are required' });
    }

    try {
      const commit = linkCommit(parseInt(id), body.commit_hash, body.project_path);
      return reply.send(commit);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: 'link_failed', message });
    }
  });

  // POST /api/tasks/:id/branch/auto — 브랜치 자동 생성
  app.post('/api/tasks/:id/branch/auto', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = getTask(parseInt(id));
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });

    const branchName = generateBranchName(task.id, task.title);
    const updated = updateTask(task.id, { branch_name: branchName } as Parameters<typeof updateTask>[1]);
    if (!updated) return reply.status(500).send({ error: 'update_failed', message: 'Failed to set branch name' });

    wsManager.notifyTaskUpdated(updated);
    return reply.send({ task_id: task.id, branch_name: branchName });
  });
}
