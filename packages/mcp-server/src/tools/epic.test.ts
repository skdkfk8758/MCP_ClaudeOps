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

import { registerEpicTools } from './epic.js';
import { apiPost, apiGet, apiRequest } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

const mockedApiPost = vi.mocked(apiPost);
const mockedApiGet = vi.mocked(apiGet);
const mockedApiRequest = vi.mocked(apiRequest);
const mockedFormat = vi.mocked(formatToolResponse);

describe('registerEpicTools', () => {
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

    registerEpicTools(mockServer as never);
  });

  it('4개 Epic 도구 등록 확인', () => {
    expect(mockServer.tool).toHaveBeenCalledTimes(4);
    expect(toolHandlers.has('claudeops_create_epic')).toBe(true);
    expect(toolHandlers.has('claudeops_list_epics')).toBe(true);
    expect(toolHandlers.has('claudeops_update_epic')).toBe(true);
    expect(toolHandlers.has('claudeops_set_epic_branch')).toBe(true);
  });

  // --- claudeops_create_epic ---
  describe('claudeops_create_epic', () => {
    it('apiPost로 Epic 생성', async () => {
      const mockResult = { id: 1, title: 'New Epic', status: 'backlog' };
      mockedApiPost.mockResolvedValue(mockResult);

      const params = { title: 'New Epic', prd_id: 2, estimated_effort: 'M' };
      await toolHandlers.get('claudeops_create_epic')!.handler(params);

      expect(mockedApiPost).toHaveBeenCalledWith('/api/epics', params);
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Epic Created');
    });
  });

  // --- claudeops_list_epics ---
  describe('claudeops_list_epics', () => {
    it('필터 없이 목록 조회', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_epics')!.handler({});

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('/api/epics'));
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Epics', undefined);
    });

    it('prd_id 필터 전달', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_epics')!.handler({ prd_id: 5 });

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('prd_id=5'));
    });

    it('status 필터 전달', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_epics')!.handler({ status: 'in_progress' });

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('status=in_progress'));
    });

    it('limit을 page_size로 변환', async () => {
      mockedApiGet.mockResolvedValue({ items: [], total: 0 });

      await toolHandlers.get('claudeops_list_epics')!.handler({ limit: 25 });

      expect(mockedApiGet).toHaveBeenCalledWith(expect.stringContaining('page_size=25'));
    });

    it('response_format 전달', async () => {
      mockedApiGet.mockResolvedValue({ items: [] });

      await toolHandlers.get('claudeops_list_epics')!.handler({ response_format: 'json' });

      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Epics', 'json');
    });
  });

  // --- claudeops_update_epic ---
  describe('claudeops_update_epic', () => {
    it('epic_id를 URL에 포함하여 PATCH 호출', async () => {
      const mockResult = { id: 3, title: 'Updated', status: 'in_progress' };
      mockedApiRequest.mockResolvedValue(mockResult);

      await toolHandlers.get('claudeops_update_epic')!.handler({
        epic_id: 3,
        title: 'Updated',
        status: 'in_progress',
      });

      expect(mockedApiRequest).toHaveBeenCalledWith('/api/epics/3', {
        method: 'PATCH',
        body: { title: 'Updated', status: 'in_progress' },
      });
      expect(mockedFormat).toHaveBeenCalledWith(mockResult, 'Epic Updated');
    });
  });

  // --- claudeops_set_epic_branch ---
  describe('claudeops_set_epic_branch', () => {
    it('브랜치 설정 (POST)', async () => {
      mockedApiPost.mockResolvedValue({ branch_name: 'epic/feature-1' });

      await toolHandlers.get('claudeops_set_epic_branch')!.handler({
        epic_id: 2,
        branch_name: 'epic/feature-1',
      });

      expect(mockedApiPost).toHaveBeenCalledWith('/api/epics/2/branch', {
        branch_name: 'epic/feature-1',
      });
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Epic Branch Set');
    });

    it('브랜치 제거 (DELETE)', async () => {
      mockedApiRequest.mockResolvedValue({ branch_name: null });

      await toolHandlers.get('claudeops_set_epic_branch')!.handler({
        epic_id: 2,
      });

      expect(mockedApiRequest).toHaveBeenCalledWith('/api/epics/2/branch', { method: 'DELETE' });
      expect(mockedFormat).toHaveBeenCalledWith(expect.anything(), 'Epic Branch Removed');
    });
  });
});
