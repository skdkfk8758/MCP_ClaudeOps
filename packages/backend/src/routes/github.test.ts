import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// vi.hoisted로 모든 mock 함수 생성
const {
  mockGetGitHubConfig,
  mockUpdateGitHubConfig,
  mockListSyncLogs,
  mockGetPrdGitHubConfig,
  mockUpsertPrdGitHubConfig,
  mockDeletePrdGitHubConfig,
  mockSyncEpicToGitHub,
  mockSyncTaskToGitHub,
  mockPostReportToGitHub,
  mockWsManager,
} = vi.hoisted(() => ({
  mockGetGitHubConfig: vi.fn(),
  mockUpdateGitHubConfig: vi.fn(),
  mockListSyncLogs: vi.fn(),
  mockGetPrdGitHubConfig: vi.fn(),
  mockUpsertPrdGitHubConfig: vi.fn(),
  mockDeletePrdGitHubConfig: vi.fn(),
  mockSyncEpicToGitHub: vi.fn(),
  mockSyncTaskToGitHub: vi.fn(),
  mockPostReportToGitHub: vi.fn(),
  mockWsManager: {
    notifyGitHubConfigUpdated: vi.fn(),
    notifyGitHubSynced: vi.fn(),
  },
}));

// mock 설정
vi.mock('../models/github.js', () => ({
  getGitHubConfig: (...args: unknown[]) => mockGetGitHubConfig(...args),
  updateGitHubConfig: (...args: unknown[]) => mockUpdateGitHubConfig(...args),
  listSyncLogs: (...args: unknown[]) => mockListSyncLogs(...args),
}));

vi.mock('../models/prd-github.js', () => ({
  getPrdGitHubConfig: (...args: unknown[]) => mockGetPrdGitHubConfig(...args),
  upsertPrdGitHubConfig: (...args: unknown[]) => mockUpsertPrdGitHubConfig(...args),
  deletePrdGitHubConfig: (...args: unknown[]) => mockDeletePrdGitHubConfig(...args),
}));

vi.mock('../services/github-sync.js', () => ({
  syncEpicToGitHub: (...args: unknown[]) => mockSyncEpicToGitHub(...args),
  syncTaskToGitHub: (...args: unknown[]) => mockSyncTaskToGitHub(...args),
  postReportToGitHub: (...args: unknown[]) => mockPostReportToGitHub(...args),
}));

vi.mock('../services/websocket.js', () => ({
  wsManager: mockWsManager,
}));

// mock 설정 후 import
import { registerGitHubRoutes } from './github.js';

describe('GitHub Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await registerGitHubRoutes(app);
    await app.ready();
  });

  const sampleConfig = {
    repo_owner: 'test-org',
    repo_name: 'test-repo',
    enabled: true,
    auto_sync: false,
  };

  // --- GET /api/github/config ---
  describe('GET /api/github/config', () => {
    it('GitHub 설정 조회 성공', async () => {
      mockGetGitHubConfig.mockReturnValue(sampleConfig);

      const response = await app.inject({ method: 'GET', url: '/api/github/config' });

      expect(response.statusCode).toBe(200);
      expect(mockGetGitHubConfig).toHaveBeenCalled();
      expect(response.json()).toEqual(sampleConfig);
    });
  });

  // --- PUT /api/github/config ---
  describe('PUT /api/github/config', () => {
    it('GitHub 설정 업데이트 성공', async () => {
      const updatedConfig = { ...sampleConfig, auto_sync: true };
      mockUpdateGitHubConfig.mockReturnValue(updatedConfig);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/github/config',
        payload: { repo_owner: 'test-org', repo_name: 'test-repo', auto_sync: true },
      });

      expect(response.statusCode).toBe(200);
      expect(mockUpdateGitHubConfig).toHaveBeenCalledWith({
        repo_owner: 'test-org',
        repo_name: 'test-repo',
        auto_sync: true,
      });
      expect(mockWsManager.notifyGitHubConfigUpdated).toHaveBeenCalledWith(updatedConfig);
    });
  });

  // --- POST /api/github/sync/epic/:id ---
  describe('POST /api/github/sync/epic/:id', () => {
    it('Epic GitHub 동기화 성공', async () => {
      const syncResult = { issue_url: 'https://github.com/test/issues/1', issue_number: 1 };
      mockSyncEpicToGitHub.mockReturnValue(syncResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/github/sync/epic/5',
      });

      expect(response.statusCode).toBe(200);
      expect(mockSyncEpicToGitHub).toHaveBeenCalledWith(5);
      expect(mockWsManager.notifyGitHubSynced).toHaveBeenCalledWith({
        type: 'epic',
        id: 5,
        ...syncResult,
      });
    });

    it('동기화 실패 시 400', async () => {
      mockSyncEpicToGitHub.mockImplementation(() => {
        throw new Error('GitHub API error');
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/github/sync/epic/5',
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: 'GitHub API error' });
    });
  });

  // --- POST /api/github/sync/task/:id ---
  describe('POST /api/github/sync/task/:id', () => {
    it('Task GitHub 동기화 성공', async () => {
      const syncResult = { issue_url: 'https://github.com/test/issues/2', issue_number: 2 };
      mockSyncTaskToGitHub.mockReturnValue(syncResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/github/sync/task/10',
      });

      expect(response.statusCode).toBe(200);
      expect(mockSyncTaskToGitHub).toHaveBeenCalledWith(10);
      expect(mockWsManager.notifyGitHubSynced).toHaveBeenCalledWith({
        type: 'task',
        id: 10,
        ...syncResult,
      });
    });

    it('동기화 실패 시 400', async () => {
      mockSyncTaskToGitHub.mockImplementation(() => {
        throw new Error('Task not found');
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/github/sync/task/999',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // --- POST /api/github/sync/report/:id ---
  describe('POST /api/github/sync/report/:id', () => {
    it('Report GitHub 동기화 성공', async () => {
      const syncResult = { comment_url: 'https://github.com/test/issues/1#comment-123' };
      mockPostReportToGitHub.mockReturnValue(syncResult);

      const response = await app.inject({
        method: 'POST',
        url: '/api/github/sync/report/3',
      });

      expect(response.statusCode).toBe(200);
      expect(mockPostReportToGitHub).toHaveBeenCalledWith(3);
      expect(mockWsManager.notifyGitHubSynced).toHaveBeenCalledWith({
        type: 'report',
        id: 3,
        ...syncResult,
      });
    });

    it('동기화 실패 시 400', async () => {
      mockPostReportToGitHub.mockImplementation(() => {
        throw new Error('Report not found');
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/github/sync/report/999',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // --- GET /api/github/sync-logs ---
  describe('GET /api/github/sync-logs', () => {
    it('동기화 로그 조회', async () => {
      const mockResult = { items: [], total: 0, page: 1, page_size: 50 };
      mockListSyncLogs.mockReturnValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/api/github/sync-logs?entity_type=epic&entity_id=5&page=1&page_size=10',
      });

      expect(response.statusCode).toBe(200);
      expect(mockListSyncLogs).toHaveBeenCalledWith({
        entity_type: 'epic',
        entity_id: 5,
        page: 1,
        page_size: 10,
      });
    });

    it('파라미터 없이 조회', async () => {
      mockListSyncLogs.mockReturnValue({ items: [], total: 0 });

      await app.inject({ method: 'GET', url: '/api/github/sync-logs' });

      expect(mockListSyncLogs).toHaveBeenCalledWith({
        entity_type: undefined,
        entity_id: undefined,
        page: undefined,
        page_size: undefined,
      });
    });
  });

  // --- GET /api/prds/:id/github ---
  describe('GET /api/prds/:id/github', () => {
    it('PRD GitHub 설정 조회 (설정 있음)', async () => {
      const prdConfig = { prd_id: 1, repo_owner: 'org', repo_name: 'repo', enabled: true };
      mockGetPrdGitHubConfig.mockReturnValue(prdConfig);

      const response = await app.inject({ method: 'GET', url: '/api/prds/1/github' });

      expect(response.statusCode).toBe(200);
      expect(mockGetPrdGitHubConfig).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual({ configured: true, ...prdConfig });
    });

    it('PRD GitHub 설정 조회 (설정 없음)', async () => {
      mockGetPrdGitHubConfig.mockReturnValue(undefined);

      const response = await app.inject({ method: 'GET', url: '/api/prds/999/github' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ configured: false });
    });
  });

  // --- PUT /api/prds/:id/github ---
  describe('PUT /api/prds/:id/github', () => {
    it('PRD GitHub 설정 생성/업데이트', async () => {
      const config = { prd_id: 1, repo_owner: 'org', repo_name: 'repo', enabled: true };
      mockUpsertPrdGitHubConfig.mockReturnValue(config);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/prds/1/github',
        payload: { repo_owner: 'org', repo_name: 'repo' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockUpsertPrdGitHubConfig).toHaveBeenCalledWith({
        prd_id: 1,
        repo_owner: 'org',
        repo_name: 'repo',
        default_branch: undefined,
        enabled: undefined,
        auto_sync: undefined,
      });
      expect(mockWsManager.notifyGitHubConfigUpdated).toHaveBeenCalledWith({ type: 'prd', ...config });
    });

    it('repo_owner 또는 repo_name 누락 시 400', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/prds/1/github',
        payload: { repo_owner: 'org' },
      });

      expect(response.statusCode).toBe(400);
      expect(mockUpsertPrdGitHubConfig).not.toHaveBeenCalled();
    });
  });

  // --- DELETE /api/prds/:id/github ---
  describe('DELETE /api/prds/:id/github', () => {
    it('PRD GitHub 설정 삭제 성공', async () => {
      mockDeletePrdGitHubConfig.mockReturnValue(true);

      const response = await app.inject({ method: 'DELETE', url: '/api/prds/1/github' });

      expect(response.statusCode).toBe(200);
      expect(mockDeletePrdGitHubConfig).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual({ success: true });
    });

    it('존재하지 않는 설정 삭제 시 404', async () => {
      mockDeletePrdGitHubConfig.mockReturnValue(false);

      const response = await app.inject({ method: 'DELETE', url: '/api/prds/999/github' });

      expect(response.statusCode).toBe(404);
    });
  });
});
