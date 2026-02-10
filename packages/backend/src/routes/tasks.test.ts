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
  mockRunDesign,
  mockRunImplementation,
  mockDesignStepsToPipelineSteps,
  mockPipelineStepsToGraphData,
  mockCancelTaskExecution,
  mockExecuteTask,
  mockCreatePipeline,
  mockListExecutionLogs,
  mockListExecutionGroups,
  mockGetEpic,
  mockGetPrd,
  mockCreateEpic,
  mockListExecutions,
  mockCancelExecution,
  mockGetDb,
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
  mockRunDesign: vi.fn(),
  mockRunImplementation: vi.fn(),
  mockDesignStepsToPipelineSteps: vi.fn(),
  mockPipelineStepsToGraphData: vi.fn(),
  mockCancelTaskExecution: vi.fn(),
  mockExecuteTask: vi.fn(),
  mockCreatePipeline: vi.fn(),
  mockListExecutionLogs: vi.fn(),
  mockListExecutionGroups: vi.fn(),
  mockGetEpic: vi.fn(),
  mockGetPrd: vi.fn(),
  mockCreateEpic: vi.fn(),
  mockListExecutions: vi.fn(),
  mockCancelExecution: vi.fn(),
  mockGetDb: vi.fn(),
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
    notifyEpicCreated: vi.fn(),
    notifyTaskStreamChunk: vi.fn(),
    broadcast: vi.fn(),
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
  runDesign: (...args: unknown[]) => mockRunDesign(...args),
  runImplementation: (...args: unknown[]) => mockRunImplementation(...args),
  designStepsToPipelineSteps: (...args: unknown[]) => mockDesignStepsToPipelineSteps(...args),
  pipelineStepsToGraphData: (...args: unknown[]) => mockPipelineStepsToGraphData(...args),
  cancelTaskExecution: (...args: unknown[]) => mockCancelTaskExecution(...args),
  executeTask: (...args: unknown[]) => mockExecuteTask(...args),
}));

vi.mock('../models/pipeline.js', () => ({
  createPipeline: (...args: unknown[]) => mockCreatePipeline(...args),
  listExecutions: (...args: unknown[]) => mockListExecutions(...args),
}));

vi.mock('../models/task-execution-log.js', () => ({
  listExecutionLogs: (...args: unknown[]) => mockListExecutionLogs(...args),
  listExecutionGroups: (...args: unknown[]) => mockListExecutionGroups(...args),
}));

vi.mock('../models/epic.js', () => ({
  getEpic: (...args: unknown[]) => mockGetEpic(...args),
  createEpic: (...args: unknown[]) => mockCreateEpic(...args),
}));

vi.mock('../models/prd.js', () => ({
  getPrd: (...args: unknown[]) => mockGetPrd(...args),
}));

vi.mock('../services/pipeline-executor.js', () => ({
  cancelExecution: (...args: unknown[]) => mockCancelExecution(...args),
}));

vi.mock('../database/index.js', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
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
    design_result: null,
    design_status: null,
    work_prompt: null,
    pipeline_id: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    completed_at: null,
  };

  const sampleDesignResult = JSON.stringify({
    overview: 'Test design overview',
    steps: [
      { step: 1, title: 'Step 1', description: 'Description 1', scope_tag: 'in-scope', agent_type: 'executor', model: 'sonnet', prompt: 'Do step 1' },
      { step: 2, title: 'Step 2', description: 'Description 2', scope_tag: 'out-of-scope', agent_type: 'reviewer', model: 'haiku', prompt: 'Do step 2' },
    ],
    risks: ['risk1'],
    success_criteria: ['criteria1'],
    scope_analysis: {
      out_of_scope_steps: [2],
      partial_steps: [],
      suggested_epic_title: 'New Epic',
      suggested_epic_description: 'New epic description',
    },
  });

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

  describe('GET /api/tasks/:id/resolve-project-path', () => {
    it('성공: task → epic → prd → project_path 체인', async () => {
      const taskWithEpic = { ...sampleTask, epic_id: 5 };
      mockGetTask.mockReturnValue(taskWithEpic);
      mockGetEpic.mockReturnValue({ id: 5, prd_id: 10 });
      mockGetPrd.mockReturnValue({ id: 10, project_path: '/my/project' });

      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/resolve-project-path' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ project_path: '/my/project' });
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);
      const response = await app.inject({ method: 'GET', url: '/api/tasks/999/resolve-project-path' });
      expect(response.statusCode).toBe(404);
    });

    it('epic_id 없을 때 null 반환', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/resolve-project-path' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ project_path: null });
    });

    it('epic 존재하지만 prd 없을 때 null', async () => {
      const taskWithEpic = { ...sampleTask, epic_id: 5 };
      mockGetTask.mockReturnValue(taskWithEpic);
      mockGetEpic.mockReturnValue({ id: 5, prd_id: null });
      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/resolve-project-path' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ project_path: null });
    });
  });

  describe('POST /api/tasks/:id/execute', () => {
    it('실행 성공 및 WebSocket 알림', async () => {
      mockExecuteTask.mockResolvedValue({ status: 'started', session_id: 'session-123' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/execute',
        payload: { project_path: '/my/project', model: 'sonnet' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockExecuteTask).toHaveBeenCalledWith(1, '/my/project', {
        model: 'sonnet',
        additionalContext: undefined,
        dryRun: undefined,
      });
      expect(mockWsManager.notifyTaskExecutionStarted).toHaveBeenCalledWith({ task_id: 1, session_id: 'session-123' });
    });

    it('project_path 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/execute',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      expect(mockExecuteTask).not.toHaveBeenCalled();
    });

    it('executeTask 에러 시 400', async () => {
      mockExecuteTask.mockRejectedValue(new Error('Execution failed'));
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/execute',
        payload: { project_path: '/my/project' },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('execution_failed');
    });
  });

  describe('GET /api/tasks/:id/execution-status', () => {
    it('실행 상태 조회 성공', async () => {
      const taskWithExecution = {
        ...sampleTask,
        execution_status: 'running',
        last_execution_at: '2025-01-02',
        execution_session_id: 'session-456',
      };
      mockGetTask.mockReturnValue(taskWithExecution);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/execution-status' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        execution_status: 'running',
        last_execution_at: '2025-01-02',
        execution_session_id: 'session-456',
      });
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);
      const response = await app.inject({ method: 'GET', url: '/api/tasks/999/execution-status' });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/tasks/:id/design', () => {
    it('work_prompt와 함께 설계 실행 성공', async () => {
      mockUpdateTask.mockReturnValue({ ...sampleTask, work_prompt: 'Test prompt' });
      mockRunDesign.mockResolvedValue({ status: 'completed', design_result: sampleDesignResult });
      mockGetTask.mockReturnValue({ ...sampleTask, design_result: sampleDesignResult });

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/design',
        payload: { project_path: '/my/project', work_prompt: 'Test prompt', model: 'opus' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockUpdateTask).toHaveBeenCalledWith(1, { work_prompt: 'Test prompt' });
      expect(mockRunDesign).toHaveBeenCalledWith(1, '/my/project', 'opus');
      expect(mockWsManager.notifyTaskUpdated).toHaveBeenCalled();
    });

    it('work_prompt 없이 설계 실행 성공', async () => {
      mockRunDesign.mockResolvedValue({ status: 'completed' });
      mockGetTask.mockReturnValue(sampleTask);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/design',
        payload: { project_path: '/my/project' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(mockRunDesign).toHaveBeenCalledWith(1, '/my/project', undefined);
    });

    it('project_path 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/design',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      expect(mockRunDesign).not.toHaveBeenCalled();
    });

    it('runDesign 에러 시 400', async () => {
      mockRunDesign.mockRejectedValue(new Error('Design failed'));
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/design',
        payload: { project_path: '/my/project' },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('design_failed');
    });
  });

  describe('PATCH /api/tasks/:id/design', () => {
    it('설계 결과 부분 업데이트 성공', async () => {
      const taskWithDesign = { ...sampleTask, design_result: sampleDesignResult };
      mockGetTask.mockReturnValue(taskWithDesign);

      const mockDbRun = vi.fn();
      const mockDbPrepare = vi.fn(() => ({ run: mockDbRun }));
      mockGetDb.mockReturnValue({ prepare: mockDbPrepare });

      const updatedTask = { ...taskWithDesign, design_result: sampleDesignResult };
      mockGetTask.mockReturnValueOnce(taskWithDesign).mockReturnValueOnce(updatedTask);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/tasks/1/design',
        payload: { overview: 'Updated overview' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockDbPrepare).toHaveBeenCalled();
      expect(mockDbRun).toHaveBeenCalled();
      expect(mockWsManager.notifyTaskUpdated).toHaveBeenCalledWith(updatedTask);
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/tasks/999/design',
        payload: { overview: 'Updated' },
      });
      expect(response.statusCode).toBe(404);
    });

    it('design_result 없을 때 400', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/tasks/1/design',
        payload: { overview: 'Updated' },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe('No design result to update');
    });
  });

  describe('POST /api/tasks/:id/design/approve', () => {
    it('설계 승인 및 파이프라인 생성 성공', async () => {
      const taskWithDesign = { ...sampleTask, epic_id: 5, design_result: sampleDesignResult };
      mockGetTask.mockReturnValue(taskWithDesign);

      const mockPipelineSteps = [{ step: 1, agent_type: 'executor' }];
      mockDesignStepsToPipelineSteps.mockReturnValue(mockPipelineSteps);

      const mockGraphData = { nodes: [], edges: [] };
      mockPipelineStepsToGraphData.mockReturnValue(mockGraphData);

      const mockPipeline = { id: 100, name: 'Task #1: Test Task', steps: mockPipelineSteps };
      mockCreatePipeline.mockReturnValue(mockPipeline);

      const mockDbRun = vi.fn();
      const mockDbPrepare = vi.fn(() => ({ run: mockDbRun }));
      mockGetDb.mockReturnValue({ prepare: mockDbPrepare });

      const updatedTask = { ...taskWithDesign, pipeline_id: 100 };
      mockGetTask.mockReturnValueOnce(taskWithDesign).mockReturnValueOnce(updatedTask);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/design/approve',
      });

      expect(response.statusCode).toBe(200);
      expect(mockDesignStepsToPipelineSteps).toHaveBeenCalled();
      expect(mockCreatePipeline).toHaveBeenCalled();
      expect(mockWsManager.notifyPipelineCreated).toHaveBeenCalledWith(mockPipeline);
      expect(mockWsManager.notifyTaskUpdated).toHaveBeenCalledWith(updatedTask);
      expect(response.json()).toEqual({ task_id: 1, pipeline_id: 100, pipeline: mockPipeline });
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/999/design/approve',
      });
      expect(response.statusCode).toBe(404);
    });

    it('design_result 없을 때 400', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/design/approve',
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe('No design result to approve');
    });
  });

  describe('GET /api/tasks/:id/design/scope-proposal', () => {
    it('범위 초과 제안 조회 성공', async () => {
      const taskWithDesign = { ...sampleTask, epic_id: 5, design_result: sampleDesignResult };
      mockGetTask.mockReturnValue(taskWithDesign);
      mockGetEpic.mockReturnValue({ id: 5, prd_id: 10 });

      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/design/scope-proposal' });
      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.has_proposal).toBe(true);
      expect(json.proposal.task_id).toBe(1);
      expect(json.proposal.original_epic_id).toBe(5);
      expect(json.proposal.suggested_epic.prd_id).toBe(10);
    });

    it('design_result 없을 때 has_proposal: false', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/design/scope-proposal' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ has_proposal: false });
    });

    it('scope_analysis 없을 때 has_proposal: false', async () => {
      const designNoScope = JSON.stringify({ overview: 'Test', steps: [], risks: [], success_criteria: [] });
      mockGetTask.mockReturnValue({ ...sampleTask, design_result: designNoScope });
      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/design/scope-proposal' });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ has_proposal: false });
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);
      const response = await app.inject({ method: 'GET', url: '/api/tasks/999/design/scope-proposal' });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/tasks/:id/design/scope-split', () => {
    it('범위 분리 실행 성공', async () => {
      const taskWithDesign = { ...sampleTask, epic_id: 5, design_result: sampleDesignResult, priority: 'P2' };
      mockGetTask.mockReturnValue(taskWithDesign);
      mockGetEpic.mockReturnValue({ id: 5, prd_id: 10 });

      const newEpic = { id: 20, title: 'New Epic', description: 'New epic description' };
      mockCreateEpic.mockReturnValue(newEpic);

      const newTask = { id: 100, title: 'Step 2', epic_id: 20 };
      mockCreateTask.mockReturnValue(newTask);

      const mockDbRun = vi.fn();
      const mockDbPrepare = vi.fn(() => ({ run: mockDbRun }));
      mockGetDb.mockReturnValue({ prepare: mockDbPrepare });

      const updatedTask = { ...taskWithDesign, design_result: JSON.stringify({ steps: [{ step: 1 }] }) };
      mockGetTask
        .mockReturnValueOnce(taskWithDesign)
        .mockReturnValueOnce(updatedTask)
        .mockReturnValueOnce(newTask);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/design/scope-split',
        payload: { epic_title: 'Custom Epic', include_partial: false },
      });

      expect(response.statusCode).toBe(200);
      expect(mockCreateEpic).toHaveBeenCalledWith({
        title: 'Custom Epic',
        description: 'New epic description',
        prd_id: 10,
      });
      expect(mockCreateTask).toHaveBeenCalled();
      expect(mockWsManager.notifyEpicCreated).toHaveBeenCalledWith(newEpic);
      expect(mockWsManager.notifyTaskUpdated).toHaveBeenCalled();
      expect(mockWsManager.notifyTaskCreated).toHaveBeenCalled();
      expect(mockWsManager.broadcast).toHaveBeenCalledWith('task', 'scope_split_completed', expect.any(Object));
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/999/design/scope-split',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });

    it('design_result 없을 때 400', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/design/scope-split',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe('No design result');
    });

    it('epic_id 없을 때 400', async () => {
      mockGetTask.mockReturnValue({ ...sampleTask, design_result: sampleDesignResult });
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/design/scope-split',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe('Task has no epic');
    });

    it('scope_analysis 없을 때 400', async () => {
      const designNoScope = JSON.stringify({ overview: 'Test', steps: [], risks: [], success_criteria: [] });
      mockGetTask.mockReturnValue({ ...sampleTask, epic_id: 5, design_result: designNoScope });
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/design/scope-split',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe('No scope analysis found');
    });
  });

  describe('POST /api/tasks/:id/implement', () => {
    it('구현 실행 성공', async () => {
      mockRunImplementation.mockResolvedValue({ status: 'completed', session_id: 'impl-session-123' });

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/implement',
        payload: { project_path: '/my/project', model: 'opus' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockRunImplementation).toHaveBeenCalledWith(1, '/my/project', 'opus');
      expect(response.json()).toEqual({ status: 'completed', session_id: 'impl-session-123' });
    });

    it('project_path 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/implement',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      expect(mockRunImplementation).not.toHaveBeenCalled();
    });

    it('runImplementation 에러 시 400', async () => {
      mockRunImplementation.mockRejectedValue(new Error('Implementation failed'));
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/implement',
        payload: { project_path: '/my/project' },
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('implementation_failed');
    });
  });

  describe('GET /api/tasks/:id/execution-logs', () => {
    it('필터와 함께 실행 로그 조회', async () => {
      const mockLogs = {
        items: [{ id: 1, task_id: 1, phase: 'design', agent_type: 'executor' }],
        total: 1,
        page: 1,
        page_size: 50,
      };
      mockListExecutionLogs.mockReturnValue(mockLogs);

      const response = await app.inject({
        method: 'GET',
        url: '/api/tasks/1/execution-logs?phase=design&agent_type=executor&model=sonnet&status=completed&search=test&execution_id=5&page=2&page_size=20',
      });

      expect(response.statusCode).toBe(200);
      expect(mockListExecutionLogs).toHaveBeenCalledWith(1, {
        phase: 'design',
        agent_type: 'executor',
        model: 'sonnet',
        status: 'completed',
        search: 'test',
        execution_id: 5,
        page: 2,
        page_size: 20,
      });
      expect(response.json()).toEqual(mockLogs);
    });

    it('필터 없이 실행 로그 조회', async () => {
      mockListExecutionLogs.mockReturnValue({ items: [], total: 0, page: 1, page_size: 50 });

      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/execution-logs' });

      expect(response.statusCode).toBe(200);
      expect(mockListExecutionLogs).toHaveBeenCalledWith(1, {
        phase: undefined,
        agent_type: undefined,
        model: undefined,
        status: undefined,
        search: undefined,
        execution_id: undefined,
        page: undefined,
        page_size: undefined,
      });
    });
  });

  describe('GET /api/tasks/:id/execution-groups', () => {
    it('실행 그룹 조회 성공', async () => {
      const mockGroups = [
        { execution_id: 1, phase: 'design', count: 5 },
        { execution_id: 2, phase: 'implementation', count: 10 },
      ];
      mockListExecutionGroups.mockReturnValue(mockGroups);

      const response = await app.inject({ method: 'GET', url: '/api/tasks/1/execution-groups' });

      expect(response.statusCode).toBe(200);
      expect(mockListExecutionGroups).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual(mockGroups);
    });
  });

  describe('POST /api/tasks/:id/cancel', () => {
    it('파이프라인 실행 중인 태스크 취소 성공', async () => {
      const runningTask = { ...sampleTask, execution_status: 'running', pipeline_id: 100 };
      mockGetTask.mockReturnValue(runningTask);
      mockListExecutions.mockReturnValue([{ id: 50, status: 'running', pipeline_id: 100 }]);
      mockCancelExecution.mockReturnValue(undefined);
      mockCancelTaskExecution.mockReturnValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/cancel',
      });

      expect(response.statusCode).toBe(200);
      expect(mockCancelExecution).toHaveBeenCalledWith(50);
      expect(mockCancelTaskExecution).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual({ success: true, cancelled: true });
    });

    it('파이프라인 없이 직접 실행 중인 태스크 취소', async () => {
      const runningTask = { ...sampleTask, design_status: 'running', pipeline_id: null };
      mockGetTask.mockReturnValue(runningTask);
      mockCancelTaskExecution.mockReturnValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/cancel',
      });

      expect(response.statusCode).toBe(200);
      expect(mockCancelExecution).not.toHaveBeenCalled();
      expect(mockCancelTaskExecution).toHaveBeenCalledWith(1);
    });

    it('존재하지 않는 태스크 404', async () => {
      mockGetTask.mockReturnValue(undefined);
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/999/cancel',
      });
      expect(response.statusCode).toBe(404);
    });

    it('실행 중이 아닌 태스크 취소 시 400', async () => {
      mockGetTask.mockReturnValue(sampleTask);
      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/cancel',
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('not_running');
    });
  });

  describe('POST /api/tasks/:id/commits/scan - error cases', () => {
    it('스캔 실패 시 400 에러', async () => {
      mockScanTaskCommits.mockImplementation(() => { throw new Error('Scan error'); });

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/commits/scan',
        payload: { project_path: '/my/project' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('scan_failed');
      expect(response.json().message).toBe('Scan error');
    });
  });

  describe('POST /api/tasks/:id/commits/link - error cases', () => {
    it('연결 실패 시 400 에러', async () => {
      mockLinkCommit.mockImplementation(() => { throw new Error('Link error'); });

      const response = await app.inject({
        method: 'POST',
        url: '/api/tasks/1/commits/link',
        payload: { commit_hash: 'abc123', project_path: '/my/project' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('link_failed');
      expect(response.json().message).toBe('Link error');
    });
  });
});
