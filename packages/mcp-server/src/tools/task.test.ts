import { describe, it, expect, vi, beforeEach } from 'vitest';

// mock 의존성
vi.mock('../client/api-client.js', () => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
  apiRequest: vi.fn(),
}));

vi.mock('../services/response-formatter.js', () => ({
  formatToolResponse: vi.fn((data, title) => ({
    content: [{ type: 'text', text: `${title}: ${JSON.stringify(data)}` }],
  })),
}));

import { registerTaskTools } from './task.js';
import { apiPost, apiGet, apiRequest } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

const mockedApiPost = vi.mocked(apiPost);
const mockedApiGet = vi.mocked(apiGet);
const mockedApiRequest = vi.mocked(apiRequest);
const mockedFormat = vi.mocked(formatToolResponse);

describe('registerTaskTools', () => {
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

    registerTaskTools(mockServer as never);
  });

  it('16개 태스크 도구 등록 확인', () => {
    expect(mockServer.tool).toHaveBeenCalledTimes(16);
    // existing 8
    expect(toolHandlers.has('claudeops_create_task')).toBe(true);
    expect(toolHandlers.has('claudeops_update_task')).toBe(true);
    expect(toolHandlers.has('claudeops_list_tasks')).toBe(true);
    expect(toolHandlers.has('claudeops_move_task')).toBe(true);
    expect(toolHandlers.has('claudeops_get_task_board')).toBe(true);
    expect(toolHandlers.has('claudeops_link_session_to_task')).toBe(true);
    expect(toolHandlers.has('claudeops_set_task_branch')).toBe(true);
    expect(toolHandlers.has('claudeops_execute_task')).toBe(true);
    // design workflow 3
    expect(toolHandlers.has('claudeops_design_task')).toBe(true);
    expect(toolHandlers.has('claudeops_approve_design')).toBe(true);
    expect(toolHandlers.has('claudeops_implement_task')).toBe(true);
    // new 5
    expect(toolHandlers.has('claudeops_verify_task')).toBe(true);
    expect(toolHandlers.has('claudeops_get_verification')).toBe(true);
    expect(toolHandlers.has('claudeops_scan_task_commits')).toBe(true);
    expect(toolHandlers.has('claudeops_get_task_commits')).toBe(true);
    expect(toolHandlers.has('claudeops_auto_branch')).toBe(true);
  });

  // --- claudeops_create_task ---
  describe('claudeops_create_task', () => {
    it('apiPost로 태스크 생성', async () => {
      const mockResult = { id: 1, title: 'New Task', status: 'backlog' };
      mockedApiPost.mockResolvedValue(mockResult);

      const params = { title: 'New Task', priority: 'P1', epic_id: 3 };
      await toolHandlers.get('claudeops_create_task')!.handler(params);

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks', params);
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Task Created');
    });
  });

  // --- claudeops_update_task ---
  describe('claudeops_update_task', () => {
    it('task_id를 URL에 포함하여 PATCH 호출', async () => {
      const mockResult = { id: 5, title: 'Updated', status: 'todo' };
      mockedApiRequest.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_update_task')!.handler({
        task_id: 5,
        title: 'Updated',
        status: 'todo',
      });

      expect(mockedApiRequest).toHaveBeenCalledWith('/api/tasks/5', {
        method: 'PATCH',
        body: { title: 'Updated', status: 'todo' },
      });
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Task Updated');
    });
  });

  // --- claudeops_list_tasks ---
  describe('claudeops_list_tasks', () => {
    it('필터 없이 목록 조회', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_tasks')!.handler({});

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('/api/tasks'));
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Tasks', undefined);
    });

    it('status 필터 전달', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_tasks')!.handler({ status: 'implementation' });

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('status=implementation'));
    });

    it('priority 필터 전달', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_tasks')!.handler({ priority: 'P0' });

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('priority=P0'));
    });

    it('limit을 page_size로 변환', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_tasks')!.handler({ limit: 10 });

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('page_size=10'));
    });

    it('response_format 전달', async () => {
      mockedApiGet.mockResolvedValue({ items: [] });

      await toolHandlers.get('claudeops_list_tasks')!.handler({ response_format: 'json' });

      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Tasks', 'json');
    });
  });

  // --- claudeops_move_task ---
  describe('claudeops_move_task', () => {
    it('태스크 칸반 이동 호출', async () => {
      const mockResult = { id: 1, status: 'review', position: 0 };
      mockedApiPost.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_move_task')!.handler({
        task_id: 1,
        status: 'review',
        position: 0,
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks/1/move', {
        status: 'review',
        position: 0,
      });
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Task Moved');
    });
  });

  // --- claudeops_get_task_board ---
  describe('claudeops_get_task_board', () => {
    it('전체 칸반 보드 조회', async () => {
      const mockBoard = { backlog: [], todo: [], implementation: [] };
      mockedApiGet.mockResolvedValue(mockBoard);

      await toolHandlers.get('claudeops_get_task_board')!.handler({});

      expect(mockedApiGet).toHaveBeenCalledWith('/api/tasks/board');
      expect(mockedFormat).toHaveBeenCalledWith(mockBoard, 'Task Board', undefined);
    });

    it('response_format 전달', async () => {
      mockedApiGet.mockResolvedValue({});

      await toolHandlers.get('claudeops_get_task_board')!.handler({ response_format: 'json' });

      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Task Board', 'json');
    });
  });

  // --- claudeops_link_session_to_task ---
  describe('claudeops_link_session_to_task', () => {
    it('세션 연결 호출', async () => {
      mockedApiPost.mockResolvedValue({ success: true });

      await toolHandlers.get('claudeops_link_session_to_task')!.handler({
        task_id: 3,
        session_id: 'session-abc',
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks/3/link-session', {
        session_id: 'session-abc',
      });
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Session Linked');
    });
  });

  // --- claudeops_set_task_branch ---
  describe('claudeops_set_task_branch', () => {
    it('브랜치 설정 (POST)', async () => {
      mockedApiPost.mockResolvedValue({ branch_name: 'feature/task-1' });

      await toolHandlers.get('claudeops_set_task_branch')!.handler({
        task_id: 1,
        branch_name: 'feature/task-1',
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks/1/branch', {
        branch_name: 'feature/task-1',
      });
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Task Branch Set');
    });

    it('브랜치 제거 (DELETE)', async () => {
      mockedApiRequest.mockResolvedValue({ branch_name: null });

      await toolHandlers.get('claudeops_set_task_branch')!.handler({
        task_id: 1,
      });

      expect(mockedApiRequest).toHaveBeenCalledWith('/api/tasks/1/branch', { method: 'DELETE' });
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Task Branch Removed');
    });
  });

  // --- claudeops_execute_task ---
  describe('claudeops_execute_task', () => {
    it('태스크 실행 호출', async () => {
      mockedApiPost.mockResolvedValue({ status: 'started', session_id: 'sess-1' });

      await toolHandlers.get('claudeops_execute_task')!.handler({
        task_id: 7,
        project_path: '/my/project',
        model: 'opus',
        dry_run: true,
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks/7/execute', {
        project_path: '/my/project',
        model: 'opus',
        dry_run: true,
      });
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Task Execution');
    });
  });

  // --- claudeops_design_task ---
  describe('claudeops_design_task', () => {
    it('설계 단계 실행 호출', async () => {
      const mockResult = { task_id: 1, status: 'design_started' };
      mockedApiPost.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_design_task')!.handler({
        task_id: 1,
        project_path: '/my/project',
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks/1/design', {
        project_path: '/my/project',
      });
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Design Started');
    });
  });

  // --- claudeops_approve_design ---
  describe('claudeops_approve_design', () => {
    it('설계 승인 호출', async () => {
      const mockResult = { task_id: 2, approved: true };
      mockedApiPost.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_approve_design')!.handler({
        task_id: 2,
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks/2/design/approve', {});
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Design Approved');
    });
  });

  // --- claudeops_implement_task ---
  describe('claudeops_implement_task', () => {
    it('구현 단계 실행 호출', async () => {
      const mockResult = { task_id: 3, status: 'implementation_started' };
      mockedApiPost.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_implement_task')!.handler({
        task_id: 3,
        project_path: '/my/project',
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks/3/implement', {
        project_path: '/my/project',
      });
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Implementation Started');
    });
  });

  // --- claudeops_verify_task ---
  describe('claudeops_verify_task', () => {
    it('검증 실행 호출', async () => {
      const mockResult = { task_id: 1, status: 'passed', overall_pass: true };
      mockedApiPost.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_verify_task')!.handler({
        task_id: 1,
        project_path: '/my/project',
        checks: ['lint', 'test'],
        coverage_threshold: 80,
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks/1/verify', {
        project_path: '/my/project',
        checks: ['lint', 'test'],
        coverage_threshold: 80,
      });
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Verification Started');
    });
  });

  // --- claudeops_get_verification ---
  describe('claudeops_get_verification', () => {
    it('검증 결과 조회', async () => {
      const mockResult = { status: 'passed', result: { checks: [] } };
      mockedApiGet.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_get_verification')!.handler({ task_id: 5 });

      expect(mockedApiGet).toHaveBeenCalledWith('/api/tasks/5/verification');
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Verification Results');
    });
  });

  // --- claudeops_scan_task_commits ---
  describe('claudeops_scan_task_commits', () => {
    it('커밋 스캔 호출', async () => {
      const mockResult = { scanned: 10, new_commits: 3 };
      mockedApiPost.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_scan_task_commits')!.handler({
        task_id: 2,
        project_path: '/my/project',
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks/2/commits/scan', {
        project_path: '/my/project',
      });
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Commits Scanned');
    });
  });

  // --- claudeops_get_task_commits ---
  describe('claudeops_get_task_commits', () => {
    it('커밋 목록 조회', async () => {
      const mockResult = { task_id: 3, commits: [{ commit_hash: 'abc' }] };
      mockedApiGet.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_get_task_commits')!.handler({ task_id: 3 });

      expect(mockedApiGet).toHaveBeenCalledWith('/api/tasks/3/commits');
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Task Commits');
    });
  });

  // --- claudeops_auto_branch ---
  describe('claudeops_auto_branch', () => {
    it('브랜치 자동 생성 호출', async () => {
      const mockResult = { task_id: 4, branch_name: 'task/4-my-task' };
      mockedApiPost.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_auto_branch')!.handler({ task_id: 4 });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/tasks/4/branch/auto', {});
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Branch Created');
    });
  });
});
