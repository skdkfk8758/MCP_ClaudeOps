import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing
vi.mock('../client/api-client.js', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock('../services/response-formatter.js', () => ({
  formatToolResponse: vi.fn((data, title) => ({
    content: [{ type: 'text', text: `${title}: ${JSON.stringify(data)}` }],
  })),
}));

import { registerPipelineTools } from './pipeline.js';
import { apiPost, apiGet } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

const mockedApiPost = vi.mocked(apiPost);
const mockedApiGet = vi.mocked(apiGet);
const mockedFormat = vi.mocked(formatToolResponse);

describe('registerPipelineTools', () => {
  let toolHandlers: Map<string, { handler: (params: Record<string, unknown>) => Promise<unknown>; description: string; schema: unknown }>;
  let mockServer: { tool: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    toolHandlers = new Map();

    mockServer = {
      tool: vi.fn((name: string, description: string, schema: unknown, handler: (params: Record<string, unknown>) => Promise<unknown>) => {
        toolHandlers.set(name, { handler, description, schema });
      }),
    };

    registerPipelineTools(mockServer as never);
  });

  it('should register all 7 pipeline tools', () => {
    expect(mockServer.tool).toHaveBeenCalledTimes(7);
    expect(toolHandlers.has('claudeops_create_pipeline')).toBe(true);
    expect(toolHandlers.has('claudeops_list_pipelines')).toBe(true);
    expect(toolHandlers.has('claudeops_get_pipeline')).toBe(true);
    expect(toolHandlers.has('claudeops_execute_pipeline')).toBe(true);
    expect(toolHandlers.has('claudeops_cancel_pipeline')).toBe(true);
    expect(toolHandlers.has('claudeops_get_pipeline_status')).toBe(true);
    expect(toolHandlers.has('claudeops_get_presets')).toBe(true);
  });

  describe('claudeops_create_pipeline', () => {
    it('should call apiPost with pipeline data', async () => {
      const mockResult = { id: 1, name: 'Test Pipeline', status: 'draft' };
      mockedApiPost.mockResolvedValue(mockResult);

      const params = {
        name: 'Test Pipeline',
        description: 'A test',
        steps: [{ step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Do work' }] }],
      };

      const handler = toolHandlers.get('claudeops_create_pipeline')!.handler;
      await handler(params);

      expect(mockedApiPost).toHaveBeenCalledWith('/api/pipelines', params);
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Pipeline Created');
    });

    it('should pass epic_id and graph_data when provided', async () => {
      mockedApiPost.mockResolvedValue({ id: 2 });
      const params = {
        name: 'EP Pipeline',
        epic_id: 5,
        graph_data: '{"nodes":[],"edges":[]}',
        steps: [{ step: 1, parallel: false, agents: [{ type: 'explore', model: 'haiku', prompt: 'Search' }] }],
      };

      await toolHandlers.get('claudeops_create_pipeline')!.handler(params);
      expect(mockedApiPost).toHaveBeenCalledWith('/api/pipelines', params);
    });
  });

  describe('claudeops_list_pipelines', () => {
    it('should call apiGet with no filters', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_pipelines')!.handler({});

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('/api/pipelines'));
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipelines', undefined);
    });

    it('should pass epic_id filter', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_pipelines')!.handler({ epic_id: 3 });

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('epic_id=3'));
    });

    it('should pass status filter', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_pipelines')!.handler({ status: 'running' });

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('status=running'));
    });

    it('should pass limit as page_size', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_pipelines')!.handler({ limit: 10 });

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('page_size=10'));
    });

    it('should pass response_format to formatToolResponse', async () => {
      mockedApiGet.mockResolvedValue({ items: [] });

      await toolHandlers.get('claudeops_list_pipelines')!.handler({ response_format: 'json' });

      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipelines', 'json');
    });
  });

  describe('claudeops_get_pipeline', () => {
    it('should call apiGet with pipeline ID', async () => {
      mockedApiGet.mockResolvedValue({ id: 42, name: 'My Pipeline' });

      await toolHandlers.get('claudeops_get_pipeline')!.handler({ pipeline_id: 42 });

      expect(mockedApiGet).toHaveBeenCalledWith('/api/pipelines/42');
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipeline Details', undefined);
    });

    it('should pass response_format', async () => {
      mockedApiGet.mockResolvedValue({ id: 1 });

      await toolHandlers.get('claudeops_get_pipeline')!.handler({ pipeline_id: 1, response_format: 'json' });

      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipeline Details', 'json');
    });
  });

  describe('claudeops_execute_pipeline', () => {
    it('should call apiPost with execution params', async () => {
      mockedApiPost.mockResolvedValue({ id: 1, status: 'running' });

      await toolHandlers.get('claudeops_execute_pipeline')!.handler({
        pipeline_id: 10,
        project_path: '/my/project',
        simulate: true,
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/pipelines/10/execute', {
        project_path: '/my/project',
        simulate: true,
      });
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipeline Execution Started');
    });

    it('should work without simulate flag', async () => {
      mockedApiPost.mockResolvedValue({ id: 2 });

      await toolHandlers.get('claudeops_execute_pipeline')!.handler({
        pipeline_id: 5,
        project_path: '/work',
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/pipelines/5/execute', {
        project_path: '/work',
      });
    });
  });

  describe('claudeops_cancel_pipeline', () => {
    it('should call apiPost to cancel', async () => {
      mockedApiPost.mockResolvedValue({ success: true });

      await toolHandlers.get('claudeops_cancel_pipeline')!.handler({ pipeline_id: 7 });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/pipelines/7/cancel', {});
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipeline Execution Cancelled');
    });
  });

  describe('claudeops_get_pipeline_status', () => {
    it('should get specific execution when execution_id provided', async () => {
      mockedApiGet.mockResolvedValue({ id: 99, status: 'completed' });

      await toolHandlers.get('claudeops_get_pipeline_status')!.handler({
        pipeline_id: 10,
        execution_id: 99,
      });

      expect(mockedApiGet).toHaveBeenCalledWith('/api/pipeline-executions/99');
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipeline Execution Status', undefined);
    });

    it('should list all executions when no execution_id', async () => {
      mockedApiGet.mockResolvedValue([]);

      await toolHandlers.get('claudeops_get_pipeline_status')!.handler({
        pipeline_id: 10,
      });

      expect(mockedApiGet).toHaveBeenCalledWith('/api/pipelines/10/executions');
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipeline Executions', undefined);
    });

    it('should pass response_format for execution status', async () => {
      mockedApiGet.mockResolvedValue({ id: 1 });

      await toolHandlers.get('claudeops_get_pipeline_status')!.handler({
        pipeline_id: 1,
        execution_id: 1,
        response_format: 'json',
      });

      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipeline Execution Status', 'json');
    });
  });

  describe('claudeops_get_presets', () => {
    it('should call apiGet for presets', async () => {
      mockedApiGet.mockResolvedValue([{ id: 'feature-development' }]);

      await toolHandlers.get('claudeops_get_presets')!.handler({});

      expect(mockedApiGet).toHaveBeenCalledWith('/api/pipeline-presets');
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipeline Presets', undefined);
    });

    it('should pass response_format for presets', async () => {
      mockedApiGet.mockResolvedValue([]);

      await toolHandlers.get('claudeops_get_presets')!.handler({ response_format: 'json' });

      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Pipeline Presets', 'json');
    });
  });
});
