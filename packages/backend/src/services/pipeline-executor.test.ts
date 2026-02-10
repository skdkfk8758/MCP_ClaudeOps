import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { mockGetPipeline, mockCreateExecution, mockUpdateExecution, mockWsManager } = vi.hoisted(() => ({
  mockGetPipeline: vi.fn(),
  mockCreateExecution: vi.fn(),
  mockUpdateExecution: vi.fn(),
  mockWsManager: {
    notifyPipelineExecutionStarted: vi.fn(),
    notifyPipelineExecutionProgress: vi.fn(),
    notifyPipelineExecutionCompleted: vi.fn(),
    notifyPipelineExecutionFailed: vi.fn(),
  },
}));

vi.mock('../models/pipeline.js', () => ({
  getPipeline: (...args: unknown[]) => mockGetPipeline(...args),
  createExecution: (...args: unknown[]) => mockCreateExecution(...args),
  updateExecution: (...args: unknown[]) => mockUpdateExecution(...args),
}));

vi.mock('./websocket.js', () => ({
  wsManager: mockWsManager,
}));

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

import { executePipeline, cancelExecution } from './pipeline-executor.js';

describe('pipeline-executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const samplePipeline = {
    id: 1,
    name: 'Test Pipeline',
    description: null,
    epic_id: null,
    steps: [
      {
        step: 1,
        parallel: false,
        agents: [{ type: 'executor', model: 'sonnet', prompt: 'Do thing' }],
      },
    ],
    graph_data: null,
    status: 'draft' as const,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
  };

  const sampleExecution = {
    id: 10,
    pipeline_id: 1,
    status: 'running' as const,
    current_step: 0,
    total_steps: 1,
    started_at: '2025-01-01T00:00:00.000Z',
    completed_at: null,
    results: [],
  };

  describe('executePipeline', () => {
    it('should throw when pipeline not found', async () => {
      mockGetPipeline.mockReturnValue(undefined);
      await expect(executePipeline(999, '/tmp', true)).rejects.toThrow('Pipeline not found');
    });

    it('should throw when pipeline has no steps', async () => {
      mockGetPipeline.mockReturnValue({ ...samplePipeline, steps: [] });
      await expect(executePipeline(1, '/tmp', true)).rejects.toThrow('Pipeline has no steps');
    });

    it('should create execution and return it immediately in simulate mode', async () => {
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });

      const execution = await executePipeline(1, '/tmp', true);

      expect(execution.id).toBe(10);
      expect(mockCreateExecution).toHaveBeenCalledWith(1, 1);
      expect(mockWsManager.notifyPipelineExecutionStarted).toHaveBeenCalled();
    });

    it('should run simulation and complete all steps', async () => {
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });

      await executePipeline(1, '/tmp', true);

      // Let simulation delays resolve
      await vi.advanceTimersByTimeAsync(10000);

      // Should have called updateExecution with completed status eventually
      const completedCall = mockUpdateExecution.mock.calls.find(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.status === 'completed'
      );
      expect(completedCall).toBeDefined();
      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });

    it('should handle parallel steps', async () => {
      const parallelPipeline = {
        ...samplePipeline,
        steps: [
          {
            step: 1,
            parallel: true,
            agents: [
              { type: 'analyst', model: 'haiku', prompt: 'Analyze' },
              { type: 'executor', model: 'sonnet', prompt: 'Execute' },
            ],
          },
        ],
      };
      mockGetPipeline.mockReturnValue(parallelPipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });

      await executePipeline(1, '/tmp', true);

      await vi.advanceTimersByTimeAsync(10000);

      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });

    it('should handle multi-step sequential pipeline', async () => {
      const multiStepPipeline = {
        ...samplePipeline,
        steps: [
          { step: 1, parallel: false, agents: [{ type: 'analyst', model: 'haiku', prompt: 'Step 1' }] },
          { step: 2, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Step 2' }] },
        ],
      };
      mockGetPipeline.mockReturnValue(multiStepPipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution, total_steps: 2 });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution, total_steps: 2 });

      await executePipeline(1, '/tmp', true);

      await vi.advanceTimersByTimeAsync(20000);

      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });
  });

  describe('cancelExecution', () => {
    it('should return false when no active execution', () => {
      expect(cancelExecution(999)).toBe(false);
    });

    it('should cancel an active execution', async () => {
      mockGetPipeline.mockReturnValue({
        ...samplePipeline,
        steps: [
          { step: 1, parallel: false, agents: [{ type: 'executor', model: 'opus', prompt: 'Slow step' }] },
          { step: 2, parallel: false, agents: [{ type: 'executor', model: 'opus', prompt: 'Never reached' }] },
        ],
      });
      mockCreateExecution.mockReturnValue({ ...sampleExecution, id: 20, total_steps: 2 });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution, id: 20, total_steps: 2 });

      await executePipeline(1, '/tmp', true);

      // Cancel while first step is still running
      const cancelled = cancelExecution(20);
      expect(cancelled).toBe(true);

      await vi.advanceTimersByTimeAsync(20000);

      // Should have called with cancelled/failed status
      const failedCall = mockUpdateExecution.mock.calls.find(
        (call: unknown[]) => {
          const data = call[1] as Record<string, unknown>;
          return data?.status === 'cancelled' || data?.status === 'failed';
        }
      );
      expect(failedCall).toBeDefined();
      expect(mockWsManager.notifyPipelineExecutionFailed).toHaveBeenCalled();
    });
  });
});
