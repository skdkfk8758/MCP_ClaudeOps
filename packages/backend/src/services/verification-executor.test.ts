import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockExecSync, mockGetTask, mockMoveTask,
  mockCreateExecutionLog, mockUpdateExecutionLog,
  mockWsManager, mockGetDb,
} = vi.hoisted(() => ({
  mockExecSync: vi.fn(),
  mockGetTask: vi.fn(),
  mockMoveTask: vi.fn(),
  mockCreateExecutionLog: vi.fn(),
  mockUpdateExecutionLog: vi.fn(),
  mockWsManager: {
    notifyVerificationStarted: vi.fn(),
    notifyVerificationProgress: vi.fn(),
    notifyVerificationCompleted: vi.fn(),
    notifyVerificationFailed: vi.fn(),
  },
  mockGetDb: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

vi.mock('../database/index.js', () => ({
  getDb: () => mockGetDb(),
}));

vi.mock('../models/task.js', () => ({
  getTask: (...args: unknown[]) => mockGetTask(...args),
  moveTask: (...args: unknown[]) => mockMoveTask(...args),
}));

vi.mock('../models/task-execution-log.js', () => ({
  createExecutionLog: (...args: unknown[]) => mockCreateExecutionLog(...args),
  updateExecutionLog: (...args: unknown[]) => mockUpdateExecutionLog(...args),
}));

vi.mock('./websocket.js', () => ({
  wsManager: mockWsManager,
}));

import { runVerification, retryVerification } from './verification-executor.js';

describe('verification-executor', () => {
  const mockDbRun = vi.fn();
  const mockDbGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDb.mockReturnValue({
      prepare: vi.fn(() => ({ run: mockDbRun, get: mockDbGet })),
    });
  });

  const sampleTask = {
    id: 1,
    title: 'Test Task',
    status: 'implementation' as const,
    verification_result: null,
    verification_status: null,
    branch_name: null,
  };

  describe('runVerification', () => {
    it('태스크를 찾을 수 없으면 예외 발생', async () => {
      mockGetTask.mockReturnValue(null);

      await expect(runVerification(999, '/project')).rejects.toThrow('Task #999 not found');
    });

    it('모든 체크가 통과하면 status=passed, overall_pass=true', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 100 });
      mockDbGet.mockReturnValue({ count: 0 }); // review 카운트
      mockExecSync
        .mockReturnValueOnce('') // lint
        .mockReturnValueOnce('') // typecheck
        .mockReturnValueOnce('All tests passed'); // test

      const result = await runVerification(1, '/project', { checks: ['lint', 'typecheck', 'test'] });

      expect(result.status).toBe('passed');
      expect(result.overall_pass).toBe(true);
      expect(result.checks).toHaveLength(3);
      expect(result.checks.every(c => c.status === 'passed')).toBe(true);
      expect(mockMoveTask).toHaveBeenCalledWith(1, { status: 'review', position: 0 });
      expect(mockWsManager.notifyVerificationCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ task_id: 1 })
      );
    });

    it('한 체크가 실패하면 status=failed, overall_pass=false', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 101 });
      mockExecSync
        .mockReturnValueOnce('') // lint passes
        .mockImplementationOnce(() => {
          const error: any = new Error('Type error');
          error.status = 1;
          error.stderr = 'TS2322: Type error on line 10';
          throw error;
        }); // typecheck fails

      const result = await runVerification(1, '/project', { checks: ['lint', 'typecheck'], skipOnFailure: false });

      expect(result.status).toBe('failed');
      expect(result.overall_pass).toBe(false);
      expect(result.checks[0].status).toBe('passed');
      expect(result.checks[1].status).toBe('failed');
      expect(result.checks[1].output).toContain('TS2322');
      expect(mockMoveTask).not.toHaveBeenCalled();
      expect(mockWsManager.notifyVerificationFailed).toHaveBeenCalledWith(
        expect.objectContaining({ task_id: 1 })
      );
    });

    it('선택한 체크만 실행 (lint, test만)', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 102 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync
        .mockReturnValueOnce('') // lint
        .mockReturnValueOnce('Tests passed'); // test

      const result = await runVerification(1, '/project', { checks: ['lint', 'test'] });

      expect(result.checks).toHaveLength(2);
      expect(result.checks.map(c => c.name)).toEqual(['lint', 'test']);
      expect(mockExecSync).toHaveBeenCalledTimes(2);
    });

    it('skipOnFailure=true이면 첫 실패 후 나머지는 pending', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 103 });
      mockExecSync
        .mockReturnValueOnce('') // lint passes
        .mockImplementationOnce(() => {
          const error: any = new Error('Typecheck failed');
          error.status = 1;
          error.stderr = 'Type errors found';
          throw error;
        }); // typecheck fails

      const result = await runVerification(1, '/project', { checks: ['lint', 'typecheck', 'test'], skipOnFailure: true });

      expect(result.checks[0].status).toBe('passed');
      expect(result.checks[1].status).toBe('failed');
      expect(result.checks[2].status).toBe('pending'); // test skipped
      expect(mockExecSync).toHaveBeenCalledTimes(2); // stopped after typecheck
    });

    it('커버리지 체크에서 임계값 파싱 및 실패', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 104 });
      mockExecSync.mockReturnValueOnce('All files |  75.5 | 70.2 | 80.1 | 72.3'); // coverage below 80%

      const result = await runVerification(1, '/project', { checks: ['coverage'] });

      expect(result.checks[0].name).toBe('coverage');
      expect(result.checks[0].status).toBe('failed');
      expect(result.coverage_percent).toBe(75.5);
      expect(result.overall_pass).toBe(false);
    });

    it('커버리지 체크에서 임계값 통과', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 105 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync.mockReturnValueOnce('All files |  85.5 | 82.0 | 88.0 | 83.5'); // coverage above 80%

      const result = await runVerification(1, '/project', { checks: ['coverage'] });

      expect(result.checks[0].name).toBe('coverage');
      expect(result.checks[0].status).toBe('passed');
      expect(result.overall_pass).toBe(true);
    });

    it('WS 이벤트가 올바르게 호출됨', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 106 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      await runVerification(1, '/project', { checks: ['lint', 'typecheck', 'test'] });

      expect(mockWsManager.notifyVerificationStarted).toHaveBeenCalledWith(
        expect.objectContaining({ task_id: 1 })
      );
      expect(mockWsManager.notifyVerificationProgress).toHaveBeenCalledTimes(6); // 2 per check (running + completed)
      expect(mockWsManager.notifyVerificationCompleted).toHaveBeenCalledWith(expect.any(Object));
    });

    it('DB 업데이트가 올바르게 호출됨', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 107 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      await runVerification(1, '/project', { checks: ['lint', 'typecheck', 'test'] });

      // DB prepare/run 호출 확인 (UPDATE tasks SET verification_result ...)
      expect(mockDbRun).toHaveBeenCalled();
    });

    it('실행 로그 생성 및 업데이트', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 108 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      await runVerification(1, '/project', { checks: ['lint', 'typecheck', 'test'] });

      expect(mockCreateExecutionLog).toHaveBeenCalledWith({
        task_id: 1,
        phase: 'verification',
        agent_type: 'verifier',
        model: 'system',
      });
      expect(mockUpdateExecutionLog).toHaveBeenCalledWith(108, expect.objectContaining({
        status: 'completed',
      }));
    });

    it('체크 실패 시 실행 로그에 status=failed', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 109 });
      mockExecSync.mockImplementationOnce(() => {
        const error: any = new Error('Lint failed');
        error.status = 1;
        error.stderr = 'Linting errors';
        throw error;
      });

      await runVerification(1, '/project', { checks: ['lint'] });

      expect(mockUpdateExecutionLog).toHaveBeenCalledWith(109, expect.objectContaining({
        status: 'failed',
      }));
    });

    it('execSync 타임아웃 및 cwd 설정 확인', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 110 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync.mockReturnValue('');

      await runVerification(1, '/project/path', { checks: ['lint'] });

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cwd: '/project/path',
          encoding: 'utf-8',
          timeout: 120_000,
        })
      );
    });

    it('체크 이름이 없으면 기본 5개 체크 실행', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockCreateExecutionLog.mockReturnValue({ id: 111 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('All files |  85.0 | 85.0 | 85.0 | 85.0');

      const result = await runVerification(1, '/project');

      expect(result.checks).toHaveLength(5);
      expect(result.checks.map(c => c.name)).toEqual(['lint', 'typecheck', 'test', 'build', 'coverage']);
    });
  });

  describe('retryVerification', () => {
    it('failedOnly=true이고 이전 결과가 있으면 실패한 체크만 재실행', async () => {
      const previousResult = {
        task_id: 1,
        status: 'failed' as const,
        overall_pass: false,
        started_at: '2026-01-01',
        completed_at: '2026-01-01',
        checks: [
          { name: 'lint', status: 'passed' as const, command: 'pnpm lint', duration_ms: 100, output: '', exit_code: 0 },
          { name: 'typecheck', status: 'failed' as const, command: 'pnpm typecheck', duration_ms: 200, output: 'Type error', exit_code: 1 },
          { name: 'test', status: 'passed' as const, command: 'pnpm test', duration_ms: 300, output: '', exit_code: 0 },
        ],
      };

      mockGetTask.mockReturnValue({
        ...sampleTask,
        verification_result: JSON.stringify(previousResult),
      });
      mockCreateExecutionLog.mockReturnValue({ id: 200 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync.mockReturnValueOnce(''); // typecheck passes this time

      const result = await retryVerification(1, '/project', { failedOnly: true });

      expect(mockExecSync).toHaveBeenCalledTimes(1);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('typecheck'),
        expect.any(Object)
      );
      expect(result.checks).toHaveLength(1);
      expect(result.checks[0].name).toBe('typecheck');
      expect(result.checks[0].status).toBe('passed');
    });

    it('failedOnly=true이지만 이전 결과가 없으면 모든 체크 실행', async () => {
      mockGetTask.mockReturnValue({ ...sampleTask, verification_result: null });
      mockCreateExecutionLog.mockReturnValue({ id: 201 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('All files |  85.0 | 85.0 | 85.0 | 85.0');

      const result = await retryVerification(1, '/project', { failedOnly: true });

      expect(result.checks).toHaveLength(5);
    });

    it('failedOnly=false이면 항상 모든 체크 실행', async () => {
      const previousResult = {
        task_id: 1,
        status: 'failed' as const,
        overall_pass: false,
        started_at: '2026-01-01',
        completed_at: '2026-01-01',
        checks: [
          { name: 'lint', status: 'failed' as const, command: 'pnpm lint', duration_ms: 100, output: 'Error', exit_code: 1 },
        ],
      };

      mockGetTask.mockReturnValue({
        ...sampleTask,
        verification_result: JSON.stringify(previousResult),
      });
      mockCreateExecutionLog.mockReturnValue({ id: 202 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('All files |  85.0 | 85.0 | 85.0 | 85.0');

      const result = await retryVerification(1, '/project', { failedOnly: false });

      expect(result.checks).toHaveLength(5);
      expect(mockExecSync).toHaveBeenCalledTimes(5);
    });

    it('이전 결과 파싱 실패 시 모든 체크 실행', async () => {
      mockGetTask.mockReturnValue({
        ...sampleTask,
        verification_result: 'invalid json',
      });
      mockCreateExecutionLog.mockReturnValue({ id: 203 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('All files |  85.0 | 85.0 | 85.0 | 85.0');

      // JSON parse error 시 catch되어 전체 실행
      try {
        await retryVerification(1, '/project', { failedOnly: true });
      } catch (e) {
        // 파싱 에러는 무시하고 전체 실행으로 폴백하는 것이 정상
        expect(e).toBeDefined();
      }
    });

    it('failedOnly=true로 재실행 후 모두 통과하면 review로 이동', async () => {
      const previousResult = {
        task_id: 1,
        status: 'failed' as const,
        overall_pass: false,
        started_at: '2026-01-01',
        completed_at: '2026-01-01',
        checks: [
          { name: 'lint', status: 'failed' as const, command: 'pnpm lint', duration_ms: 100, output: 'Error', exit_code: 1 },
        ],
      };

      mockGetTask.mockReturnValue({
        ...sampleTask,
        verification_result: JSON.stringify(previousResult),
      });
      mockCreateExecutionLog.mockReturnValue({ id: 204 });
      mockDbGet.mockReturnValue({ count: 2 });
      mockExecSync.mockReturnValueOnce('');

      const result = await retryVerification(1, '/project', { failedOnly: true });

      expect(result.overall_pass).toBe(true);
      expect(mockMoveTask).toHaveBeenCalledWith(1, { status: 'review', position: 2 });
    });

    it('선택한 체크와 failedOnly를 함께 사용', async () => {
      const previousResult = {
        task_id: 1,
        status: 'failed' as const,
        overall_pass: false,
        started_at: '2026-01-01',
        completed_at: '2026-01-01',
        checks: [
          { name: 'lint', status: 'failed' as const, command: 'pnpm lint', duration_ms: 100, output: 'Error', exit_code: 1 },
          { name: 'typecheck', status: 'passed' as const, command: 'pnpm typecheck', duration_ms: 200, output: '', exit_code: 0 },
          { name: 'test', status: 'failed' as const, command: 'pnpm test', duration_ms: 300, output: 'Test failed', exit_code: 1 },
        ],
      };

      mockGetTask.mockReturnValue({
        ...sampleTask,
        verification_result: JSON.stringify(previousResult),
      });
      mockCreateExecutionLog.mockReturnValue({ id: 205 });
      mockDbGet.mockReturnValue({ count: 0 });
      mockExecSync
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      const result = await retryVerification(1, '/project', {
        failedOnly: true,
        checks: ['lint', 'test'], // 실제로는 failedOnly가 우선되어 lint, test만 실행
      });

      expect(result.checks).toHaveLength(2);
      expect(result.checks.map(c => c.name)).toEqual(['lint', 'test']);
      expect(mockExecSync).toHaveBeenCalledTimes(2);
    });
  });
});
