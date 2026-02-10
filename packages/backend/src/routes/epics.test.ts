import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// vi.hoisted로 모든 mock 함수 생성
const {
  mockCreateEpic,
  mockGetEpic,
  mockUpdateEpic,
  mockDeleteEpic,
  mockListEpics,
  mockWsManager,
} = vi.hoisted(() => ({
  mockCreateEpic: vi.fn(),
  mockGetEpic: vi.fn(),
  mockUpdateEpic: vi.fn(),
  mockDeleteEpic: vi.fn(),
  mockListEpics: vi.fn(),
  mockWsManager: {
    notifyEpicCreated: vi.fn(),
    notifyEpicUpdated: vi.fn(),
    notifyEpicDeleted: vi.fn(),
  },
}));

// mock 설정
vi.mock('../models/epic.js', () => ({
  createEpic: (...args: unknown[]) => mockCreateEpic(...args),
  getEpic: (...args: unknown[]) => mockGetEpic(...args),
  updateEpic: (...args: unknown[]) => mockUpdateEpic(...args),
  deleteEpic: (...args: unknown[]) => mockDeleteEpic(...args),
  listEpics: (...args: unknown[]) => mockListEpics(...args),
}));

vi.mock('../services/websocket.js', () => ({
  wsManager: mockWsManager,
}));

// mock 설정 후 import
import { registerEpicRoutes } from './epics.js';

describe('Epic Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await registerEpicRoutes(app);
    await app.ready();
  });

  const sampleEpic = {
    id: 1,
    prd_id: null,
    title: 'Test Epic',
    description: null,
    status: 'backlog',
    progress: 0,
    architecture_notes: null,
    tech_approach: null,
    estimated_effort: null,
    github_issue_url: null,
    github_issue_number: null,
    branch_name: null,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    task_count: 0,
    done_count: 0,
  };

  // --- POST /api/epics ---
  describe('POST /api/epics', () => {
    it('Epic 생성 성공 (201)', async () => {
      mockCreateEpic.mockReturnValue(sampleEpic);

      const response = await app.inject({
        method: 'POST',
        url: '/api/epics',
        payload: { title: 'Test Epic' },
      });

      expect(response.statusCode).toBe(201);
      expect(mockCreateEpic).toHaveBeenCalledWith({ title: 'Test Epic' });
      expect(mockWsManager.notifyEpicCreated).toHaveBeenCalledWith(sampleEpic);
      expect(response.json()).toEqual(sampleEpic);
    });

    it('title 누락 시 400 에러', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/epics',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(mockCreateEpic).not.toHaveBeenCalled();
    });

    it('prd_id와 함께 생성', async () => {
      const epicWithPrd = { ...sampleEpic, prd_id: 5 };
      mockCreateEpic.mockReturnValue(epicWithPrd);

      const response = await app.inject({
        method: 'POST',
        url: '/api/epics',
        payload: { title: 'Epic with PRD', prd_id: 5, description: '설명' },
      });

      expect(response.statusCode).toBe(201);
      expect(mockCreateEpic).toHaveBeenCalledWith({ title: 'Epic with PRD', prd_id: 5, description: '설명' });
    });
  });

  // --- GET /api/epics ---
  describe('GET /api/epics', () => {
    it('쿼리 파라미터로 목록 조회', async () => {
      const mockResult = { items: [sampleEpic], total: 1, page: 1, page_size: 50 };
      mockListEpics.mockReturnValue(mockResult);

      const response = await app.inject({
        method: 'GET',
        url: '/api/epics?prd_id=1&status=backlog&page=1&page_size=10',
      });

      expect(response.statusCode).toBe(200);
      expect(mockListEpics).toHaveBeenCalledWith({
        prd_id: 1,
        status: 'backlog',
        page: 1,
        page_size: 10,
      });
      expect(response.json()).toEqual(mockResult);
    });

    it('파라미터 없이 조회', async () => {
      const mockResult = { items: [], total: 0, page: 1, page_size: 50 };
      mockListEpics.mockReturnValue(mockResult);

      await app.inject({ method: 'GET', url: '/api/epics' });

      expect(mockListEpics).toHaveBeenCalledWith({
        prd_id: undefined,
        status: undefined,
        page: undefined,
        page_size: undefined,
      });
    });
  });

  // --- GET /api/epics/:id ---
  describe('GET /api/epics/:id', () => {
    it('Epic 조회 성공', async () => {
      mockGetEpic.mockReturnValue(sampleEpic);

      const response = await app.inject({ method: 'GET', url: '/api/epics/1' });

      expect(response.statusCode).toBe(200);
      expect(mockGetEpic).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual(sampleEpic);
    });

    it('존재하지 않는 Epic 404', async () => {
      mockGetEpic.mockReturnValue(undefined);

      const response = await app.inject({ method: 'GET', url: '/api/epics/999' });

      expect(response.statusCode).toBe(404);
    });
  });

  // --- PATCH /api/epics/:id ---
  describe('PATCH /api/epics/:id', () => {
    it('Epic 업데이트 성공', async () => {
      const updatedEpic = { ...sampleEpic, title: 'Updated Epic', status: 'in_progress' };
      mockUpdateEpic.mockReturnValue(updatedEpic);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/epics/1',
        payload: { title: 'Updated Epic', status: 'in_progress' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockUpdateEpic).toHaveBeenCalledWith(1, { title: 'Updated Epic', status: 'in_progress' });
      expect(mockWsManager.notifyEpicUpdated).toHaveBeenCalledWith(updatedEpic);
      expect(response.json()).toEqual(updatedEpic);
    });

    it('존재하지 않는 Epic 404', async () => {
      mockUpdateEpic.mockReturnValue(undefined);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/epics/999',
        payload: { title: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // --- DELETE /api/epics/:id ---
  describe('DELETE /api/epics/:id', () => {
    it('Epic 삭제 성공', async () => {
      mockDeleteEpic.mockReturnValue(true);

      const response = await app.inject({ method: 'DELETE', url: '/api/epics/1' });

      expect(response.statusCode).toBe(200);
      expect(mockDeleteEpic).toHaveBeenCalledWith(1);
      expect(mockWsManager.notifyEpicDeleted).toHaveBeenCalledWith(1);
      expect(response.json()).toEqual({ success: true });
    });

    it('존재하지 않는 Epic 404', async () => {
      mockDeleteEpic.mockReturnValue(false);

      const response = await app.inject({ method: 'DELETE', url: '/api/epics/999' });

      expect(response.statusCode).toBe(404);
    });
  });

  // --- POST /api/epics/:id/branch ---
  describe('POST /api/epics/:id/branch', () => {
    it('브랜치 설정 성공', async () => {
      const updatedEpic = { ...sampleEpic, branch_name: 'epic/feature-1' };
      mockUpdateEpic.mockReturnValue(updatedEpic);

      const response = await app.inject({
        method: 'POST',
        url: '/api/epics/1/branch',
        payload: { branch_name: 'epic/feature-1' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockUpdateEpic).toHaveBeenCalledWith(1, { branch_name: 'epic/feature-1' });
      expect(mockWsManager.notifyEpicUpdated).toHaveBeenCalledWith(updatedEpic);
    });

    it('branch_name 누락 시 400', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/epics/1/branch',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(mockUpdateEpic).not.toHaveBeenCalled();
    });

    it('존재하지 않는 Epic 404', async () => {
      mockUpdateEpic.mockReturnValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/api/epics/999/branch',
        payload: { branch_name: 'epic/feature-1' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // --- DELETE /api/epics/:id/branch ---
  describe('DELETE /api/epics/:id/branch', () => {
    it('브랜치 제거 성공', async () => {
      const updatedEpic = { ...sampleEpic, branch_name: null };
      mockUpdateEpic.mockReturnValue(updatedEpic);

      const response = await app.inject({ method: 'DELETE', url: '/api/epics/1/branch' });

      expect(response.statusCode).toBe(200);
      expect(mockUpdateEpic).toHaveBeenCalledWith(1, { branch_name: null });
      expect(mockWsManager.notifyEpicUpdated).toHaveBeenCalledWith(updatedEpic);
    });

    it('존재하지 않는 Epic 404', async () => {
      mockUpdateEpic.mockReturnValue(undefined);

      const response = await app.inject({ method: 'DELETE', url: '/api/epics/999/branch' });

      expect(response.statusCode).toBe(404);
    });
  });
});
