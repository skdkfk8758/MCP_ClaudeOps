import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// vi.hoisted로 모든 mock 함수 생성
const {
  mockCreateTask,
  mockGetTask,
  mockUpdateTask,
  mockDeleteTask,
  mockListTasks,
  mockGetTaskBoard,
  mockMoveTask,
  mockGetTaskHistory,
  mockLinkTaskSession,
  mockGetTaskStats,
  mockRunVerification,
  mockRetryVerification,
  mockScanTaskCommits,
  mockLinkCommit,
  mockGenerateBranchName,
  mockGetTaskCommits,
  mockWsManager,
} = vi.hoisted(() => ({
  mockCreateTask: vi.fn(),
  mockGetTask: vi.fn(),
  mockUpdateTask: vi.fn(),
  mockDeleteTask: vi.fn(),
  mockListTasks: vi.fn(),
  mockGetTaskBoard: vi.fn(),
  mockMoveTask: vi.fn(),
  mockGetTaskHistory: vi.fn(),
  mockLinkTaskSession: vi.fn(),
  mockGetTaskStats: vi.fn(),
  mockRunVerification: vi.fn(),
  mockRetryVerification: vi.fn(),
  mockScanTaskCommits: vi.fn(),
  mockLinkCommit: vi.fn(),
  mockGenerateBranchName: vi.fn(),
  mockGetTaskCommits: vi.fn(),
  mockWsManager: {
    notifyTaskCreated: vi.fn(),
    notifyTaskUpdated: vi.fn(),
    notifyTaskDeleted: vi.fn(),
    notifyTaskMoved: vi.fn(),
    notifyTaskExecutionStarted: vi.fn(),
    notifyVerificationCompleted: vi.fn(),
    notifyVerificationFailed: vi.fn(),
    notifyCommitsScanned: vi.fn(),
    notifyPipelineCreated: vi.fn(),
  },
}));

// mock 설정
vi.mock('../models/task.js', () => ({
  createTask: (...args: unknown[]) => mockCreateTask(...args),
  getTask: (...args: unknown[]) => mockGetTask(...args),
  updateTask: (...args: unknown[]) => mockUpdateTask(...args),
  deleteTask: (...args: unknown[]) => mockDeleteTask(...args),
  listTasks: (...args: unknown[]) => mockListTasks(...args),
  getTaskBoard: (...args: unknown[]) => mockGetTaskBoard(...args),
  moveTask: (...args: unknown[]) => mockMoveTask(...args),
  getTaskHistory: (...args: unknown[]) => mockGetTaskHistory(...args),
  linkTaskSession: (...args: unknown[]) => mockLinkTaskSession(...args),
  getTaskStats: (...args: unknown[]) => mockGetTaskStats(...args),
}));

vi.mock('../services/websocket.js', () => ({
  wsManager: mockWsManager,
}));

vi.mock('../services/verification-executor.js', () => ({
  runVerification: (...args: unknown[]) => mockRunVerification(...args),
  retryVerification: (...args: unknown[]) => mockRetryVerification(...args),
}));

vi.mock('../services/commit-tracker-service.js', () => ({
  scanTaskCommits: (...args: unknown[]) => mockScanTaskCommits(...args),
  linkCommit: (...args: unknown[]) => mockLinkCommit(...args),
  generateBranchName: (...args: unknown[]) => mockGenerateBranchName(...args),
}));

vi.mock('../models/commit-tracker.js', () => ({
  getTaskCommits: (...args: unknown[]) => mockGetTaskCommits(...args),
}));

vi.mock('../services/task-executor.js', () => ({
  runDesign: vi.fn(),
  runImplementation: vi.fn(),
  designStepsToPipelineSteps: vi.fn(),
}));

vi.mock('../models/pipeline.js', () => ({
  createPipeline: vi.fn(),
}));

vi.mock('../models/task-execution-log.js', () => ({
  listExecutionLogs: vi.fn(),
}));

vi.mock('../database/index.js', () => ({
  getDb: vi.fn(),
}));

// mock 설정 후 import
import { registerTaskRoutes } from './tasks.js';

describe('Task Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await registerTaskRoutes(app);
    await app.ready();
  });

  const sampleTask = {
    id: 1,
    title: 'Test Task',
    description: null,
    status: 'backlog',
    priority: 'P2',
    assignee: null,
    due_date: null,
    estimated_effort: null,
    position: 0,
    epic_id: null,
    labels: null,
    github_issue_url: null,
    github_issue_number: null,
    branch_name: null,
    execution_status: null,
    last_execution_at: null,
    execution_session_id: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    completed_at: null,
  };

  describe('POST /api/tasks', () => {
    it('태스크 생성 성공 (201)', async () => {
      mockCreateTask.mockReturnValue(sampleTask);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: { title: 'Test Task' },
      });

      expect(response.statusCode).toBe(201);
      expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Test Task' });
      expect(mockWsManager.notifyTaskCreated).toHaveBeenCalledWith(sampleTask);
      expect(response.json()).toEqual(sampleTask);
    });

    it('title 누락 시 400 에러', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(mockCreateTask).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/tasks', () => {
    it('쿼리 파라미터로 목록 조회', async () => {
      const mockResult = { items: [sampleTask], total: 1, page: 1, page_size: 50 };
      mockListTasks.mockReturnValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks?status=backlog&priority=P2&assignee=user1&label=bug&page=1&page_size=20',
      });

      expect(response.statusCode).toBe(200);
      expect(mockListTasks).toHaveBeenCalledWith({
        status: 'backlog',
        priority: 'P2',
        assignee: 'user1',
        label: 'bug',
        epic_id: undefined,
        page: 1,
        page_size: 20,
      });
      expect(response.json()).toEqual(mockResult);
    });

    it('epic_id 필터로 특정 에픽의 태스크만 조회', async () => {
      const mockResult = { items: [sampleTask], total: 1, page: 1, page_size: 50 };
      mockListTasks.mockReturnValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks?epic_id=5',
      });

      expect(response.statusCode).toBe(200);
      expect(mockListTasks).toHaveBeenCalledWith({
        status: undefined,
        priority: undefined,
        assignee: undefined,
        label: undefined,
        epic_id: 5,
        page: undefined,
        page_size: undefined,
      });
    });
  });

  describe('GET /api/tasks/board', () => {
    it('필터와 함께 보드 조회', async () => {
      const mockBoard = { backlog: [sampleTask], todo: [], implementation: [], review: [], done: [] };
      mockGetTaskBoard.mockReturnValue(mockBoard);

      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks/board?epic_id=1&priority=P2',
      });

      expect(response.statusCode).toBe(200);
      expect(mockGetTaskBoard).toHaveBeenCalledWith({ epic_id: 1, priority: 'P2' });
    });

    it('필터 없이 보드 조회', async () => {
      mockGetTaskBoard.mockReturnValue({});

      await app.inject({ method: 'GET', url: '/api/tasks/board' });

      expect(mockGetTaskBoard).toHaveBeenCalledWith(undefined);
    });
  });

  describe('GET /api/tasks/stats', () => {
    it('통계 조회 성공', async () => {
      const mockStats = { total: 10, by_status: { backlog: 5 }, by_priority: { P2: 5 } };
      mockGetTaskStats.mockReturnValue(mockStats);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/stats' });

      expect(response.statusCode).toBe(200);
      expect(mockGetTaskStats).toHaveBeenCalled();
      expect(response.json()).toEqual(mockStats);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('태스크 조회 성공', async () => {
      mockGetTask.mockReturnValue(sampleTask);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/1' });

      expect(response.statusCode).toBe(200);
      expect(mockGetTask).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual(sampleTask);
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/999' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('태스크 업데이트 성공', async () => {
      const updatedTask = { ...sampleTask, title: 'Updated Task' };
      mockUpdateTask.mockReturnValue(updatedTask);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/tasks/1',
        payload: { title: 'Updated Task' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockUpdateTask).toHaveBeenCalledWith(1, { title: 'Updated Task' });
      expect(mockWsManager.notifyTaskUpdated).toHaveBeenCalledWith(updatedTask);
    });

    it('존재하지 않는 태스크 404', async () => {
      mockUpdateTask.mockReturnValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/tasks/999',
        payload: { title: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('태스크 삭제 성공', async () => {
      mockDeleteTask.mockReturnValue(true);

      const response = await app.inject({ method: 'DELETE', url: '/api/tasks/1' });

      expect(response.statusCode).toBe(200);
      expect(mockDeleteTask).toHaveBeenCalledWith(1);
      expect(mockWsManager.notifyTaskDeleted).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual({ success: true });
    });

    it('존재하지 않는 태스크 404', async () => {
      mockDeleteTask.mockReturnValue(false);

      const response = await app.inject({ method: 'DELETE', url: '/api/tasks/999' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/tasks/:id/move', () => {
    it('태스크 이동 성공', async () => {
      const movedTask = { ...sampleTask, status: 'implementation', position: 1 };
      mockMoveTask.mockReturnValue(movedTask);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/move',
        payload: { status: 'implementation', position: 1 },
      });

      expect(response.statusCode).toBe(200);
      expect(mockMoveTask).toHaveBeenCalledWith(1, { status: 'implementation', position: 1 });
      expect(mockWsManager.notifyTaskMoved).toHaveBeenCalledWith(movedTask);
    });

    it('status 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/move',
        payload: { position: 1 },
      });

      expect(response.statusCode).toBe(400);
      expect(mockMoveTask).not.toHaveBeenCalled();
    });

    it('position 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/move',
        payload: { status: 'implementation' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('존재하지 않는 태스크 404', async () => {
      mockMoveTask.mockReturnValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/999/move',
        payload: { status: 'implementation', position: 0 },
      });

      expect(response.statusCode).toBe(404);
    });

    it('implementation→review 직접 이동 시 400 에러', async () => {
      mockMoveTask.mockImplementation(() => { throw new Error('verification 필수'); });

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/move',
        payload: { status: 'review', position: 0 },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('move_blocked');
    });
  });

  describe('GET /api/tasks/:id/history', () => {
    it('히스토리 조회 성공', async () => {
      const mockHistory = [{ id: 1, task_id: 1, field: 'status', old_value: 'backlog', new_value: 'todo', changed_at: '2025-01-02' }];
      mockGetTaskHistory.mockReturnValue(mockHistory);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/history' });

      expect(response.statusCode).toBe(200);
      expect(mockGetTaskHistory).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual(mockHistory);
    });
  });

  describe('POST /api/tasks/:id/link-session', () => {
    it('세션 연결 성공', async () => {
      mockLinkTaskSession.mockReturnValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/link-session',
        payload: { session_id: 'session-123' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockLinkTaskSession).toHaveBeenCalledWith(1, 'session-123');
      expect(response.json()).toEqual({ success: true });
    });

    it('session_id 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/link-session',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(mockLinkTaskSession).not.toHaveBeenCalled();
    });

    it('연결 실패 시 400', async () => {
      mockLinkTaskSession.mockReturnValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/link-session',
        payload: { session_id: 'session-123' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/tasks/:id/branch', () => {
    it('브랜치 설정 성공', async () => {
      const updatedTask = { ...sampleTask, branch_name: 'feature/test' };
      mockUpdateTask.mockReturnValue(updatedTask);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/branch',
        payload: { branch_name: 'feature/test' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockUpdateTask).toHaveBeenCalledWith(1, { branch_name: 'feature/test' });
      expect(mockWsManager.notifyTaskUpdated).toHaveBeenCalledWith(updatedTask);
    });

    it('branch_name 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/branch',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it('존재하지 않는 태스크 404', async () => {
      mockUpdateTask.mockReturnValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/999/branch',
        payload: { branch_name: 'feature/test' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id/branch', () => {
    it('브랜치 제거 성공', async () => {
      const updatedTask = { ...sampleTask, branch_name: null };
      mockUpdateTask.mockReturnValue(updatedTask);

      const response = await app.inject({ method: 'DELETE', url: '/api/tasks/1/branch' });

      expect(response.statusCode).toBe(200);
      expect(mockUpdateTask).toHaveBeenCalledWith(1, { branch_name: null });
      expect(mockWsManager.notifyTaskUpdated).toHaveBeenCalledWith(updatedTask);
    });

    it('존재하지 않는 태스크 404', async () => {
      mockUpdateTask.mockReturnValue(undefined);

      const response = await app.inject({ method: 'DELETE', url: '/api/tasks/999/branch' });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/tasks/:id/verify', () => {
    it('검증 실행 성공', async () => {
      const mockResult = { task_id: 1, status: 'passed', checks: [], overall_pass: true };
      mockRunVerification.mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/verify',
        payload: { project_path: '/my/project' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockRunVerification).toHaveBeenCalledWith(1, '/my/project', {
        checks: undefined,
        coverageThreshold: undefined,
      });
    });

    it('project_path 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/verify',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it('검증 실패 시 400', async () => {
      mockRunVerification.mockRejectedValue(new Error('Task not found'));
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/999/verify',
        payload: { project_path: '/my/project' },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/tasks/:id/verification', () => {
    it('검증 결과 조회 성공', async () => {
      const verResult = { task_id: 1, status: 'passed', checks: [], overall_pass: true };
      mockGetTask.mockReturnValue({ ...sampleTask, verification_result: JSON.stringify(verResult), verification_status: 'passed' });

      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/verification' });
      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe('passed');
    });

    it('검증 결과 없을 때', async () => {
      mockGetTask.mockReturnValue({ ...sampleTask, verification_result: null });
      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/verification' });
      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBeNull();
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);
      const response = await app.inject({ method: 'GET', url: '/api/tasks/999/verification' });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/tasks/:id/verify/retry', () => {
    it('재검증 성공', async () => {
      const mockResult = { task_id: 1, status: 'passed', checks: [], overall_pass: true };
      mockRetryVerification.mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/verify/retry',
        payload: { project_path: '/my/project', failed_only: true },
      });
      expect(response.statusCode).toBe(200);
      expect(mockRetryVerification).toHaveBeenCalledWith(1, '/my/project', {
        failedOnly: true,
        coverageThreshold: undefined,
      });
    });

    it('project_path 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/verify/retry',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/tasks/:id/commits', () => {
    it('커밋 목록 조회 성공', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockGetTaskCommits.mockReturnValue([{ id: 1, task_id: 1, commit_hash: 'abc123' }]);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/commits' });
      expect(response.statusCode).toBe(200);
      expect(response.json().commits).toHaveLength(1);
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);
      const response = await app.inject({ method: 'GET', url: '/api/tasks/999/commits' });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/tasks/:id/commits/scan', () => {
    it('커밋 스캔 성공', async () => {
      mockScanTaskCommits.mockReturnValue({ scanned: 5, new_commits: 3 });

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/commits/scan',
        payload: { project_path: '/my/project' },
      });
      expect(response.statusCode).toBe(200);
      expect(mockScanTaskCommits).toHaveBeenCalledWith(1, '/my/project');
      expect(mockWsManager.notifyCommitsScanned).toHaveBeenCalled();
    });

    it('project_path 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/commits/scan',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/tasks/:id/commits/link', () => {
    it('커밋 연결 성공', async () => {
      const mockCommit = { id: 1, task_id: 1, commit_hash: 'abc123' };
      mockLinkCommit.mockReturnValue(mockCommit);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/commits/link',
        payload: { commit_hash: 'abc123', project_path: '/my/project' },
      });
      expect(response.statusCode).toBe(200);
      expect(mockLinkCommit).toHaveBeenCalledWith(1, 'abc123', '/my/project');
    });

    it('commit_hash 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/commits/link',
        payload: { project_path: '/my/project' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('project_path 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/commits/link',
        payload: { commit_hash: 'abc123' },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/tasks/:id/branch/auto', () => {
    it('브랜치 자동 생성 성공', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockGenerateBranchName.mockReturnValue('task/1-test-task');
      mockUpdateTask.mockReturnValue({ ...sampleTask, branch_name: 'task/1-test-task' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/branch/auto',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().branch_name).toBe('task/1-test-task');
      expect(mockWsManager.notifyTaskUpdated).toHaveBeenCalled();
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/999/branch/auto',
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
