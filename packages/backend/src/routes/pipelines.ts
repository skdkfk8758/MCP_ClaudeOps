import type { FastifyInstance } from 'fastify';
import { createPipeline, getPipeline, updatePipeline, deletePipeline, listPipelines, listExecutions, getExecution } from '../models/pipeline.js';
import { executePipeline, cancelExecution } from '../services/pipeline-executor.js';
import { wsManager } from '../services/websocket.js';
import type { PipelinePreset } from '@claudeops/shared';

const PIPELINE_PRESETS: PipelinePreset[] = [
  {
    id: 'feature-development',
    name: 'Feature Development',
    description: 'Full feature development pipeline: analyze, plan, implement, test, review',
    category: 'development',
    steps: [
      { step: 1, parallel: false, agents: [{ type: 'analyst', model: 'sonnet', prompt: 'Analyze the requirements and identify acceptance criteria' }] },
      { step: 2, parallel: false, agents: [{ type: 'planner', model: 'sonnet', prompt: 'Create an implementation plan based on the analysis' }] },
      { step: 3, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Implement the feature following the plan' }] },
      { step: 4, parallel: true, agents: [
        { type: 'test-engineer', model: 'sonnet', prompt: 'Write and run tests for the implementation' },
        { type: 'quality-reviewer', model: 'sonnet', prompt: 'Review code quality and suggest improvements' },
      ] },
      { step: 5, parallel: false, agents: [{ type: 'verifier', model: 'sonnet', prompt: 'Verify all tests pass and requirements are met' }] },
    ],
  },
  {
    id: 'bug-fix',
    name: 'Bug Investigation & Fix',
    description: 'Debug, fix, and verify a bug report',
    category: 'development',
    steps: [
      { step: 1, parallel: true, agents: [
        { type: 'explore', model: 'haiku', prompt: 'Search codebase for relevant code paths' },
        { type: 'debugger', model: 'sonnet', prompt: 'Analyze the bug report and identify root cause' },
      ] },
      { step: 2, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Implement the fix based on the analysis' }] },
      { step: 3, parallel: false, agents: [{ type: 'test-engineer', model: 'sonnet', prompt: 'Add regression tests for the fix' }] },
      { step: 4, parallel: false, agents: [{ type: 'verifier', model: 'haiku', prompt: 'Verify the fix resolves the issue' }] },
    ],
  },
  {
    id: 'code-review',
    name: 'Comprehensive Code Review',
    description: 'Multi-perspective code review covering style, quality, security, and performance',
    category: 'review',
    steps: [
      { step: 1, parallel: true, agents: [
        { type: 'style-reviewer', model: 'haiku', prompt: 'Review code formatting, naming, and conventions' },
        { type: 'quality-reviewer', model: 'sonnet', prompt: 'Review logic, maintainability, and anti-patterns' },
        { type: 'security-reviewer', model: 'sonnet', prompt: 'Review security vulnerabilities and trust boundaries' },
        { type: 'performance-reviewer', model: 'sonnet', prompt: 'Review performance hotspots and optimization opportunities' },
      ] },
    ],
  },
  {
    id: 'refactor',
    name: 'Safe Refactoring',
    description: 'Plan, execute, and verify a refactoring operation',
    category: 'development',
    steps: [
      { step: 1, parallel: false, agents: [{ type: 'architect', model: 'opus', prompt: 'Analyze the current architecture and design the refactoring approach' }] },
      { step: 2, parallel: false, agents: [{ type: 'planner', model: 'sonnet', prompt: 'Create a step-by-step refactoring plan' }] },
      { step: 3, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Execute the refactoring following the plan' }] },
      { step: 4, parallel: true, agents: [
        { type: 'test-engineer', model: 'sonnet', prompt: 'Run existing tests and add new ones' },
        { type: 'quality-reviewer', model: 'sonnet', prompt: 'Review the refactored code for quality' },
      ] },
      { step: 5, parallel: false, agents: [{ type: 'verifier', model: 'sonnet', prompt: 'Verify all tests pass and no regressions' }] },
    ],
  },
];

export async function registerPipelineRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/pipelines
  app.post('/api/pipelines', async (request, reply) => {
    const body = request.body as { name?: string; description?: string; epic_id?: number; steps?: unknown[]; graph_data?: string };
    if (!body.name) return reply.status(400).send({ error: 'bad_request', message: 'name is required' });
    if (!body.steps || !Array.isArray(body.steps) || body.steps.length === 0) return reply.status(400).send({ error: 'bad_request', message: 'steps are required' });
    const pipeline = createPipeline(body as Parameters<typeof createPipeline>[0]);
    wsManager.notifyPipelineCreated(pipeline);
    return reply.status(201).send(pipeline);
  });

  // GET /api/pipelines
  app.get('/api/pipelines', async (request) => {
    const query = request.query as { epic_id?: string; status?: string; page?: string; page_size?: string };
    return listPipelines({
      epic_id: query.epic_id ? parseInt(query.epic_id) : undefined,
      status: query.status,
      page: query.page ? parseInt(query.page) : undefined,
      page_size: query.page_size ? parseInt(query.page_size) : undefined,
    });
  });

  // GET /api/pipelines/:id
  app.get('/api/pipelines/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const pipeline = getPipeline(parseInt(id));
    if (!pipeline) return reply.status(404).send({ error: 'not_found', message: 'Pipeline not found' });
    return pipeline;
  });

  // PATCH /api/pipelines/:id
  app.patch('/api/pipelines/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const pipeline = updatePipeline(parseInt(id), body as Parameters<typeof updatePipeline>[1]);
    if (!pipeline) return reply.status(404).send({ error: 'not_found', message: 'Pipeline not found' });
    wsManager.notifyPipelineUpdated(pipeline);
    return pipeline;
  });

  // DELETE /api/pipelines/:id
  app.delete('/api/pipelines/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id);
    const deleted = deletePipeline(numId);
    if (!deleted) return reply.status(404).send({ error: 'not_found', message: 'Pipeline not found' });
    wsManager.notifyPipelineDeleted(numId);
    return { success: true };
  });

  // POST /api/pipelines/:id/execute
  app.post('/api/pipelines/:id/execute', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { project_path?: string; simulate?: boolean } | undefined;
    const projectPath = body?.project_path || process.cwd();
    const simulate = body?.simulate ?? true;

    try {
      const execution = await executePipeline(parseInt(id), projectPath, simulate);
      return reply.status(202).send(execution);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: 'execution_error', message });
    }
  });

  // POST /api/pipelines/:id/cancel
  app.post('/api/pipelines/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    const executions = listExecutions(parseInt(id));
    const running = executions.find((e) => e.status === 'running');
    if (!running) return reply.status(404).send({ error: 'not_found', message: 'No running execution found' });
    const cancelled = cancelExecution(running.id);
    if (!cancelled) return reply.status(400).send({ error: 'cancel_failed', message: 'Could not cancel execution' });
    return { success: true, execution_id: running.id };
  });

  // GET /api/pipelines/:id/executions
  app.get('/api/pipelines/:id/executions', async (request) => {
    const { id } = request.params as { id: string };
    return listExecutions(parseInt(id));
  });

  // GET /api/pipeline-executions/:id
  app.get('/api/pipeline-executions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const execution = getExecution(parseInt(id));
    if (!execution) return reply.status(404).send({ error: 'not_found', message: 'Execution not found' });
    return execution;
  });

  // GET /api/pipeline-presets
  app.get('/api/pipeline-presets', async () => {
    return PIPELINE_PRESETS;
  });
}
