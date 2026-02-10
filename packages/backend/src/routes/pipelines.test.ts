import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

const {
  mockCreatePipeline, mockGetPipeline, mockUpdatePipeline, mockDeletePipeline,
  mockListPipelines, mockListExecutions, mockGetExecution,
  mockExecutePipeline, mockCancelExecution, mockWsManager,
} = vi.hoisted(() => ({
  mockCreatePipeline: vi.fn(),
  mockGetPipeline: vi.fn(),
  mockUpdatePipeline: vi.fn(),
  mockDeletePipeline: vi.fn(),
  mockListPipelines: vi.fn(),
  mockListExecutions: vi.fn(),
  mockGetExecution: vi.fn(),
  mockExecutePipeline: vi.fn(),
  mockCancelExecution: vi.fn(),
  mockWsManager: {
    notifyPipelineCreated: vi.fn(),
    notifyPipelineUpdated: vi.fn(),
    notifyPipelineDeleted: vi.fn(),
  },
}));

vi.mock('../models/pipeline.js', () => ({
  createPipeline: (...args: unknown[]) => mockCreatePipeline(...args),
  getPipeline: (...args: unknown[]) => mockGetPipeline(...args),
  updatePipeline: (...args: unknown[]) => mockUpdatePipeline(...args),
  deletePipeline: (...args: unknown[]) => mockDeletePipeline(...args),
  listPipelines: (...args: unknown[]) => mockListPipelines(...args),
  listExecutions: (...args: unknown[]) => mockListExecutions(...args),
  getExecution: (...args: unknown[]) => mockGetExecution(...args),
}));

vi.mock('../services/pipeline-executor.js', () => ({
  executePipeline: (...args: unknown[]) => mockExecutePipeline(...args),
  cancelExecution: (...args: unknown[]) => mockCancelExecution(...args),
}));

vi.mock('../services/websocket.js', () => ({
  wsManager: mockWsManager,
}));

import { registerPipelineRoutes } from './pipelines.js';

describe('pipeline routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await registerPipelineRoutes(app);
    await app.ready();
  });

  const samplePipeline = {
    id: 1,
    name: 'Test Pipeline',
    description: null,
    epic_id: null,
    steps: [{ step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Do it' }] }],
    graph_data: null,
    status: 'draft',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  };

  describe('POST /api/pipelines', () => {
    it('should create a pipeline', async () => {
      mockCreatePipeline.mockReturnValue(samplePipeline);

      const response = await app.inject({
        method: 'POST',
        url: '/api/pipelines',
        payload: {
          name: 'Test Pipeline',
          steps: [{ step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Do it' }] }],
        },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toEqual(samplePipeline);
      expect(mockCreatePipeline).toHaveBeenCalled();
      expect(mockWsManager.notifyPipelineCreated).toHaveBeenCalledWith(samplePipeline);
    });

    it('should return 400 when name is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pipelines',
        payload: { steps: [{ step: 1, parallel: false, agents: [] }] },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error).toBe('bad_request');
    });

    it('should return 400 when steps are missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pipelines',
        payload: { name: 'No Steps' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).message).toContain('steps');
    });

    it('should return 400 when steps is empty array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/pipelines',
        payload: { name: 'Empty Steps', steps: [] },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/pipelines', () => {
    it('should list pipelines', async () => {
      const listResult = { total: 1, page: 1, page_size: 50, pages: 1, items: [samplePipeline] };
      mockListPipelines.mockReturnValue(listResult);

      const response = await app.inject({ method: 'GET', url: '/api/pipelines' });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(listResult);
    });

    it('should pass query params to listPipelines', async () => {
      mockListPipelines.mockReturnValue({ total: 0, page: 2, page_size: 10, pages: 0, items: [] });

      await app.inject({
        method: 'GET',
        url: '/api/pipelines?epic_id=5&status=draft&page=2&page_size=10',
      });

      expect(mockListPipelines).toHaveBeenCalledWith({
        epic_id: 5,
        status: 'draft',
        page: 2,
        page_size: 10,
      });
    });
  });

  describe('GET /api/pipelines/:id', () => {
    it('should return a pipeline by id', async () => {
      mockGetPipeline.mockReturnValue(samplePipeline);

      const response = await app.inject({ method: 'GET', url: '/api/pipelines/1' });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(samplePipeline);
      expect(mockGetPipeline).toHaveBeenCalledWith(1);
    });

    it('should return 404 when pipeline not found', async () => {
      mockGetPipeline.mockReturnValue(undefined);

      const response = await app.inject({ method: 'GET', url: '/api/pipelines/999' });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload).error).toBe('not_found');
    });
  });

  describe('PATCH /api/pipelines/:id', () => {
    it('should update a pipeline', async () => {
      const updated = { ...samplePipeline, name: 'Updated' };
      mockUpdatePipeline.mockReturnValue(updated);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/pipelines/1',
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload).name).toBe('Updated');
      expect(mockWsManager.notifyPipelineUpdated).toHaveBeenCalledWith(updated);
    });

    it('should return 404 when pipeline not found', async () => {
      mockUpdatePipeline.mockReturnValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/pipelines/999',
        payload: { name: 'Nope' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/pipelines/:id', () => {
    it('should delete a pipeline', async () => {
      mockDeletePipeline.mockReturnValue(true);

      const response = await app.inject({ method: 'DELETE', url: '/api/pipelines/1' });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload).success).toBe(true);
      expect(mockWsManager.notifyPipelineDeleted).toHaveBeenCalledWith(1);
    });

    it('should return 404 when pipeline not found', async () => {
      mockDeletePipeline.mockReturnValue(false);

      const response = await app.inject({ method: 'DELETE', url: '/api/pipelines/999' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/pipelines/:id/execute', () => {
    it('should execute a pipeline', async () => {
      const execution = { id: 10, pipeline_id: 1, status: 'running' };
      mockExecutePipeline.mockResolvedValue(execution);

      const response = await app.inject({
        method: 'POST',
        url: '/api/pipelines/1/execute',
        payload: { project_path: '/tmp/project', simulate: true },
      });

      expect(response.statusCode).toBe(202);
      expect(JSON.parse(response.payload)).toEqual(execution);
      expect(mockExecutePipeline).toHaveBeenCalledWith(1, '/tmp/project', true);
    });

    it('should use defaults when no body provided', async () => {
      const execution = { id: 10, pipeline_id: 1, status: 'running' };
      mockExecutePipeline.mockResolvedValue(execution);

      const response = await app.inject({
        method: 'POST',
        url: '/api/pipelines/1/execute',
        payload: {},
      });

      expect(response.statusCode).toBe(202);
      // Default simulate is true, project_path defaults to cwd
      expect(mockExecutePipeline).toHaveBeenCalledWith(1, expect.any(String), true);
    });

    it('should return 400 when execution fails', async () => {
      mockExecutePipeline.mockRejectedValue(new Error('Pipeline not found'));

      const response = await app.inject({
        method: 'POST',
        url: '/api/pipelines/999/execute',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error).toBe('execution_error');
    });
  });

  describe('POST /api/pipelines/:id/cancel', () => {
    it('should cancel a running execution', async () => {
      mockListExecutions.mockReturnValue([{ id: 10, status: 'running' }]);
      mockCancelExecution.mockReturnValue(true);

      const response = await app.inject({ method: 'POST', url: '/api/pipelines/1/cancel' });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ success: true, execution_id: 10 });
    });

    it('should return 404 when no running execution', async () => {
      mockListExecutions.mockReturnValue([{ id: 10, status: 'completed' }]);

      const response = await app.inject({ method: 'POST', url: '/api/pipelines/1/cancel' });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 when cancel fails', async () => {
      mockListExecutions.mockReturnValue([{ id: 10, status: 'running' }]);
      mockCancelExecution.mockReturnValue(false);

      const response = await app.inject({ method: 'POST', url: '/api/pipelines/1/cancel' });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error).toBe('cancel_failed');
    });
  });

  describe('GET /api/pipelines/:id/executions', () => {
    it('should list executions for a pipeline', async () => {
      const executions = [{ id: 10, pipeline_id: 1, status: 'completed' }];
      mockListExecutions.mockReturnValue(executions);

      const response = await app.inject({ method: 'GET', url: '/api/pipelines/1/executions' });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(executions);
    });
  });

  describe('GET /api/pipeline-executions/:id', () => {
    it('should return an execution by id', async () => {
      const execution = { id: 10, pipeline_id: 1, status: 'completed' };
      mockGetExecution.mockReturnValue(execution);

      const response = await app.inject({ method: 'GET', url: '/api/pipeline-executions/10' });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(execution);
    });

    it('should return 404 when execution not found', async () => {
      mockGetExecution.mockReturnValue(undefined);

      const response = await app.inject({ method: 'GET', url: '/api/pipeline-executions/999' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/pipeline-presets', () => {
    it('should return preset list', async () => {
      const response = await app.inject({ method: 'GET', url: '/api/pipeline-presets' });

      expect(response.statusCode).toBe(200);
      const presets = JSON.parse(response.payload);
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);
      expect(presets[0]).toHaveProperty('id');
      expect(presets[0]).toHaveProperty('name');
      expect(presets[0]).toHaveProperty('steps');
    });
  });
});
