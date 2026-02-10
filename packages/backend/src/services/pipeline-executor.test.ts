import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const { mockGetPipeline, mockCreateExecution, mockUpdateExecution, mockWsManager, mockListTeamAgents } = vi.hoisted(() => ({
  mockGetPipeline: vi.fn(),
  mockCreateExecution: vi.fn(),
  mockUpdateExecution: vi.fn(),
  mockWsManager: {
    notifyPipelineExecutionStarted: vi.fn(),
    notifyPipelineExecutionProgress: vi.fn(),
    notifyPipelineExecutionCompleted: vi.fn(),
    notifyPipelineExecutionFailed: vi.fn(),
    notifyTaskStreamChunk: vi.fn(),
  },
  mockListTeamAgents: vi.fn(),
}));

vi.mock('../models/pipeline.js', () => ({
  getPipeline: (...args: unknown[]) => mockGetPipeline(...args),
  createExecution: (...args: unknown[]) => mockCreateExecution(...args),
  updateExecution: (...args: unknown[]) => mockUpdateExecution(...args),
}));

vi.mock('../models/team.js', () => ({
  listTeamAgents: (...args: unknown[]) => mockListTeamAgents(...args),
}));

vi.mock('./websocket.js', () => ({
  wsManager: mockWsManager,
}));

const { mockSpawn } = vi.hoisted(() => ({
  mockSpawn: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
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

    it('should inject team context when teamId is provided', async () => {
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });
      mockListTeamAgents.mockReturnValue([
        {
          id: 1,
          team_id: 1,
          persona_id: 1,
          role: 'worker',
          context_prompt: 'Team context',
          persona: {
            id: 1,
            agent_type: 'executor',
            name: 'Executor',
            system_prompt: 'System prompt for executor',
          },
        },
      ]);

      const execution = await executePipeline(1, '/tmp', true, undefined, 1);
      expect(execution.id).toBe(10);
      expect(mockListTeamAgents).toHaveBeenCalledWith(1);

      await vi.advanceTimersByTimeAsync(10000);
      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });

    it('should pass taskId for streaming notifications', async () => {
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });

      const execution = await executePipeline(1, '/tmp', true, 42);
      expect(execution.id).toBe(10);

      await vi.advanceTimersByTimeAsync(10000);
      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });

    it('should handle teamId with no matching agents', async () => {
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });
      mockListTeamAgents.mockReturnValue([]);

      const execution = await executePipeline(1, '/tmp', true, undefined, 99);
      expect(mockListTeamAgents).toHaveBeenCalledWith(99);

      await vi.advanceTimersByTimeAsync(10000);
      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });

    it('should handle team agents with no persona', async () => {
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });
      mockListTeamAgents.mockReturnValue([
        { id: 1, team_id: 1, persona_id: 1, role: 'worker', context_prompt: null, persona: null },
      ]);

      const execution = await executePipeline(1, '/tmp', true, undefined, 1);
      await vi.advanceTimersByTimeAsync(10000);
      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });

    it('should handle opus model simulation with longer delay', async () => {
      const opusPipeline = {
        ...samplePipeline,
        steps: [{ step: 1, parallel: false, agents: [{ type: 'architect', model: 'opus', prompt: 'Design' }] }],
      };
      mockGetPipeline.mockReturnValue(opusPipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });

      await executePipeline(1, '/tmp', true);
      await vi.advanceTimersByTimeAsync(20000);
      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });

    it('should run agent in non-simulate mode', async () => {
      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProc);
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });

      // 프로세스 이벤트 시뮬레이션
      mockProc.on.mockImplementation((event: string, callback: (code?: number) => void) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockProc;
      });

      await executePipeline(1, '/tmp', false);
      await vi.advanceTimersByTimeAsync(100);

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['-p', 'Do thing', '--model', 'sonnet'],
        { cwd: '/tmp', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });

    it('should inject team context in non-simulate mode', async () => {
      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProc);
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });
      mockListTeamAgents.mockReturnValue([
        {
          id: 1,
          team_id: 1,
          persona_id: 1,
          role: 'worker',
          context_prompt: 'Team context',
          persona: {
            id: 1,
            agent_type: 'executor',
            name: 'Executor',
            system_prompt: 'System prompt',
          },
        },
      ]);

      mockProc.on.mockImplementation((event: string, callback: (code?: number) => void) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockProc;
      });

      await executePipeline(1, '/tmp', false, undefined, 1);
      await vi.advanceTimersByTimeAsync(100);

      const expectedPrompt = '<system_prompt>System prompt</system_prompt>\n\n<context>Team context</context>\n\nDo thing';
      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['-p', expectedPrompt, '--model', 'sonnet'],
        { cwd: '/tmp', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });

    it('should handle agent failure in non-simulate mode', async () => {
      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProc);
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });

      mockProc.stderr.on.mockImplementation((event: string, callback: (data: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('Error message')), 5);
        }
        return mockProc;
      });

      mockProc.on.mockImplementation((event: string, callback: (code?: number) => void) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 10);
        }
        return mockProc;
      });

      await executePipeline(1, '/tmp', false);
      await vi.advanceTimersByTimeAsync(100);

      expect(mockWsManager.notifyPipelineExecutionFailed).toHaveBeenCalled();
    });

    it('should handle taskId streaming in non-simulate mode', async () => {
      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProc);
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });

      mockProc.stdout.on.mockImplementation((event: string, callback: (data: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => callback(Buffer.from('output chunk')), 5);
        }
        return mockProc;
      });

      mockProc.on.mockImplementation((event: string, callback: (code?: number) => void) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 10);
        }
        return mockProc;
      });

      await executePipeline(1, '/tmp', false, 42);
      await vi.advanceTimersByTimeAsync(100);

      expect(mockWsManager.notifyTaskStreamChunk).toHaveBeenCalledWith({
        task_id: 42,
        phase: 'implementation',
        chunk: 'output chunk',
        timestamp: expect.any(String),
        agent_type: 'executor',
      });
      expect(mockWsManager.notifyPipelineExecutionCompleted).toHaveBeenCalled();
    });

    it('should handle process error in non-simulate mode', async () => {
      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProc);
      mockGetPipeline.mockReturnValue(samplePipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });

      mockProc.on.mockImplementation((event: string, callback: (err?: Error) => void) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Spawn error')), 5);
        }
        return mockProc;
      });

      await executePipeline(1, '/tmp', false);
      await vi.advanceTimersByTimeAsync(100);

      expect(mockWsManager.notifyPipelineExecutionFailed).toHaveBeenCalled();
    });

    it('should handle agent timeout in non-simulate mode', async () => {
      const opusPipeline = {
        ...samplePipeline,
        steps: [{ step: 1, parallel: false, agents: [{ type: 'architect', model: 'opus', prompt: 'Long task' }] }],
      };

      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProc);
      mockGetPipeline.mockReturnValue(opusPipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution });

      // 프로세스가 타임아웃까지 완료되지 않음 (opus는 15분 타임아웃)
      mockProc.on.mockImplementation(() => mockProc);

      await executePipeline(1, '/tmp', false);

      // 타임아웃 트리거 (15분 + 100ms)
      await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 100);

      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockWsManager.notifyPipelineExecutionFailed).toHaveBeenCalled();
    });

    it('should enforce global concurrent limit in non-simulate mode', async () => {
      // 6개 에이전트를 병렬로 실행 (MAX_GLOBAL_CONCURRENT는 5)
      const parallelPipeline = {
        ...samplePipeline,
        steps: [
          {
            step: 1,
            parallel: true,
            agents: [
              { type: 'agent1', model: 'haiku', prompt: 'Task 1' },
              { type: 'agent2', model: 'haiku', prompt: 'Task 2' },
              { type: 'agent3', model: 'haiku', prompt: 'Task 3' },
              { type: 'agent4', model: 'haiku', prompt: 'Task 4' },
              { type: 'agent5', model: 'haiku', prompt: 'Task 5' },
              { type: 'agent6', model: 'haiku', prompt: 'Task 6' },
            ],
          },
        ],
      };

      const mockProc = {
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      };

      mockSpawn.mockReturnValue(mockProc);
      mockGetPipeline.mockReturnValue(parallelPipeline);
      mockCreateExecution.mockReturnValue({ ...sampleExecution, total_steps: 1 });
      mockUpdateExecution.mockReturnValue({ ...sampleExecution, total_steps: 1 });

      // 프로세스가 즉시 완료되지 않도록 설정 (globalConcurrent가 증가하도록)
      mockProc.on.mockImplementation(() => mockProc);

      await executePipeline(1, '/tmp', false);
      await vi.advanceTimersByTimeAsync(100);

      // 6개 에이전트 중 일부가 동시 실행 제한(5)으로 차단되어 전체 실행 실패
      expect(mockSpawn.mock.calls.length).toBeLessThan(6);
      expect(mockWsManager.notifyPipelineExecutionFailed).toHaveBeenCalled();
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
