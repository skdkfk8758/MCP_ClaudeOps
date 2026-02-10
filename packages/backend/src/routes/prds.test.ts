import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// vi.hoisted로 모든 mock 함수 생성
const {
  mockCreatePrd,
  mockGetPrd,
  mockUpdatePrd,
  mockDeletePrd,
  mockListPrds,
  mockWsManager,
} = vi.hoisted(() => ({
  mockCreatePrd: vi.fn(),
  mockGetPrd: vi.fn(),
  mockUpdatePrd: vi.fn(),
  mockDeletePrd: vi.fn(),
  mockListPrds: vi.fn(),
  mockWsManager: {
    notifyPrdCreated: vi.fn(),
    notifyPrdUpdated: vi.fn(),
    notifyPrdDeleted: vi.fn(),
  },
}));

// mock 설정
vi.mock('../models/prd.js', () => ({
  createPrd: (...args: unknown[]) => mockCreatePrd(...args),
  getPrd: (...args: unknown[]) => mockGetPrd(...args),
  updatePrd: (...args: unknown[]) => mockUpdatePrd(...args),
  deletePrd: (...args: unknown[]) => mockDeletePrd(...args),
  listPrds: (...args: unknown[]) => mockListPrds(...args),
}));

vi.mock('../services/websocket.js', () => ({
  wsManager: mockWsManager,
}));

// mock 설정 후 import
import { registerPrdRoutes } from './prds.js';

describe('PRD Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await registerPrdRoutes(app);
    await app.ready();
  });

  const samplePrd = {
    id: 1,
    title: 'Test PRD',
    description: null,
    status: 'backlog',
    vision: null,
    user_stories: null,
    success_criteria: null,
    constraints: null,
    out_of_scope: null,
    github_issue_url: null,
    github_issue_number: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    epic_count: 0,
  };

  // --- POST /api/prds ---
  describe('POST /api/prds', () => {
    it('PRD 생성 성공 (201)', async () => {
      mockCreatePrd.mockReturnValue(samplePrd);

      const response = await app.inject({
        method: 'POST',
        url: '/api/prds',
        payload: { title: 'Test PRD' },
      });

      expect(response.statusCode).toBe(201);
      expect(mockCreatePrd).toHaveBeenCalledWith({ title: 'Test PRD' });
      expect(mockWsManager.notifyPrdCreated).toHaveBeenCalledWith(samplePrd);
      expect(response.json()).toEqual(samplePrd);
    });

    it('title 누락 시 400 에러', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/prds',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(mockCreatePrd).not.toHaveBeenCalled();
    });

    it('전체 필드와 함께 생성', async () => {
      const fullPrd = {
        ...samplePrd,
        description: '상세 설명',
        vision: '비전',
        user_stories: ['스토리 1'],
        success_criteria: ['기준 1'],
        constraints: '제약',
        out_of_scope: '범위 밖',
      };
      mockCreatePrd.mockReturnValue(fullPrd);

      const payload = {
        title: 'Test PRD',
        description: '상세 설명',
        vision: '비전',
        user_stories: ['스토리 1'],
        success_criteria: ['기준 1'],
        constraints: '제약',
        out_of_scope: '범위 밖',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/prds',
        payload,
      });

      expect(response.statusCode).toBe(201);
      expect(mockCreatePrd).toHaveBeenCalledWith(payload);
    });
  });

  // --- GET /api/prds ---
  describe('GET /api/prds', () => {
    it('쿼리 파라미터로 목록 조회', async () => {
      const mockResult = { items: [samplePrd], total: 1, page: 1, page_size: 50 };
      mockListPrds.mockReturnValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/api/prds?status=backlog&page=1&page_size=10',
      });

      expect(response.statusCode).toBe(200);
      expect(mockListPrds).toHaveBeenCalledWith({
        status: 'backlog',
        page: 1,
        page_size: 10,
      });
      expect(response.json()).toEqual(mockResult);
    });

    it('파라미터 없이 조회', async () => {
      const mockResult = { items: [], total: 0, page: 1, page_size: 50 };
      mockListPrds.mockReturnValue(mockResult);

      await app.inject({ method: 'GET', url: '/api/prds' });

      expect(mockListPrds).toHaveBeenCalledWith({
        status: undefined,
        page: undefined,
        page_size: undefined,
      });
    });
  });

  // --- GET /api/prds/:id ---
  describe('GET /api/prds/:id', () => {
    it('PRD 조회 성공', async () => {
      mockGetPrd.mockReturnValue(samplePrd);

      const response = await app.inject({ method: 'GET', url: '/api/prds/1' });

      expect(response.statusCode).toBe(200);
      expect(mockGetPrd).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual(samplePrd);
    });

    it('존재하지 않는 PRD 404', async () => {
      mockGetPrd.mockReturnValue(undefined);

      const response = await app.inject({ method: 'GET', url: '/api/prds/999' });

      expect(response.statusCode).toBe(404);
    });
  });

  // --- PATCH /api/prds/:id ---
  describe('PATCH /api/prds/:id', () => {
    it('PRD 업데이트 성공', async () => {
      const updatedPrd = { ...samplePrd, title: 'Updated PRD', status: 'active' };
      mockUpdatePrd.mockReturnValue(updatedPrd);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/prds/1',
        payload: { title: 'Updated PRD', status: 'active' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockUpdatePrd).toHaveBeenCalledWith(1, { title: 'Updated PRD', status: 'active' });
      expect(mockWsManager.notifyPrdUpdated).toHaveBeenCalledWith(updatedPrd);
      expect(response.json()).toEqual(updatedPrd);
    });

    it('존재하지 않는 PRD 404', async () => {
      mockUpdatePrd.mockReturnValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/prds/999',
        payload: { title: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // --- DELETE /api/prds/:id ---
  describe('DELETE /api/prds/:id', () => {
    it('PRD 삭제 성공', async () => {
      mockDeletePrd.mockReturnValue(true);

      const response = await app.inject({ method: 'DELETE', url: '/api/prds/1' });

      expect(response.statusCode).toBe(200);
      expect(mockDeletePrd).toHaveBeenCalledWith(1);
      expect(mockWsManager.notifyPrdDeleted).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual({ success: true });
    });

    it('존재하지 않는 PRD 404', async () => {
      mockDeletePrd.mockReturnValue(false);

      const response = await app.inject({ method: 'DELETE', url: '/api/prds/999' });

      expect(response.statusCode).toBe(404);
    });
  });
});
