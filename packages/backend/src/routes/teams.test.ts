import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// vi.hoisted로 모든 모킹 함수를 먼저 정의
const {
  // Persona mocks
  mockListPersonas,
  mockGetPersona,
  mockCreatePersona,
  mockUpdatePersona,
  mockDeletePersona,
  // Team mocks
  mockCreateTeam,
  mockCloneTeam,
  mockGetTeam,
  mockUpdateTeam,
  mockDeleteTeam,
  mockListTeams,
  mockArchiveTeam,
  mockActivateTeam,
  // TeamAgent mocks
  mockAddAgentToTeam,
  mockUpdateTeamAgent,
  mockRemoveAgentFromTeam,
  mockListTeamAgents,
  // Task-Team mocks
  mockAssignTeamToTask,
  mockUnassignTeamFromTask,
  mockGetTaskTeams,
  // Workload & Templates
  mockGetTeamWorkload,
  mockGetTeamTemplates,
  // WebSocket
  mockWsManager,
} = vi.hoisted(() => ({
  mockListPersonas: vi.fn(),
  mockGetPersona: vi.fn(),
  mockCreatePersona: vi.fn(),
  mockUpdatePersona: vi.fn(),
  mockDeletePersona: vi.fn(),
  mockCreateTeam: vi.fn(),
  mockCloneTeam: vi.fn(),
  mockGetTeam: vi.fn(),
  mockUpdateTeam: vi.fn(),
  mockDeleteTeam: vi.fn(),
  mockListTeams: vi.fn(),
  mockArchiveTeam: vi.fn(),
  mockActivateTeam: vi.fn(),
  mockAddAgentToTeam: vi.fn(),
  mockUpdateTeamAgent: vi.fn(),
  mockRemoveAgentFromTeam: vi.fn(),
  mockListTeamAgents: vi.fn(),
  mockAssignTeamToTask: vi.fn(),
  mockUnassignTeamFromTask: vi.fn(),
  mockGetTaskTeams: vi.fn(),
  mockGetTeamWorkload: vi.fn(),
  mockGetTeamTemplates: vi.fn(),
  mockWsManager: {
    notifyPersonaCreated: vi.fn(),
    notifyPersonaUpdated: vi.fn(),
    notifyPersonaDeleted: vi.fn(),
    notifyTeamCreated: vi.fn(),
    notifyTeamUpdated: vi.fn(),
    notifyTeamDeleted: vi.fn(),
    notifyTeamArchived: vi.fn(),
    notifyTeamActivated: vi.fn(),
    notifyTeamAgentAdded: vi.fn(),
    notifyTeamAgentUpdated: vi.fn(),
    notifyTeamAgentRemoved: vi.fn(),
    notifyTaskTeamAssigned: vi.fn(),
    notifyTaskTeamUnassigned: vi.fn(),
  },
}));

// 모델 모킹
vi.mock('../models/team.js', () => ({
  listPersonas: (...args: unknown[]) => mockListPersonas(...args),
  getPersona: (...args: unknown[]) => mockGetPersona(...args),
  createPersona: (...args: unknown[]) => mockCreatePersona(...args),
  updatePersona: (...args: unknown[]) => mockUpdatePersona(...args),
  deletePersona: (...args: unknown[]) => mockDeletePersona(...args),
  createTeam: (...args: unknown[]) => mockCreateTeam(...args),
  cloneTeam: (...args: unknown[]) => mockCloneTeam(...args),
  getTeam: (...args: unknown[]) => mockGetTeam(...args),
  updateTeam: (...args: unknown[]) => mockUpdateTeam(...args),
  deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args),
  listTeams: (...args: unknown[]) => mockListTeams(...args),
  archiveTeam: (...args: unknown[]) => mockArchiveTeam(...args),
  activateTeam: (...args: unknown[]) => mockActivateTeam(...args),
  addAgentToTeam: (...args: unknown[]) => mockAddAgentToTeam(...args),
  updateTeamAgent: (...args: unknown[]) => mockUpdateTeamAgent(...args),
  removeAgentFromTeam: (...args: unknown[]) => mockRemoveAgentFromTeam(...args),
  listTeamAgents: (...args: unknown[]) => mockListTeamAgents(...args),
  assignTeamToTask: (...args: unknown[]) => mockAssignTeamToTask(...args),
  unassignTeamFromTask: (...args: unknown[]) => mockUnassignTeamFromTask(...args),
  getTaskTeams: (...args: unknown[]) => mockGetTaskTeams(...args),
  getTeamWorkload: (...args: unknown[]) => mockGetTeamWorkload(...args),
  getTeamTemplates: (...args: unknown[]) => mockGetTeamTemplates(...args),
}));

// WebSocket 서비스 모킹
vi.mock('../services/websocket.js', () => ({
  wsManager: mockWsManager,
}));

import { registerTeamRoutes } from './teams.js';

// 테스트 픽스처
const samplePersona = {
  id: 1,
  agent_type: 'code-reviewer',
  name: 'Code Reviewer',
  model: 'sonnet',
  category: 'review',
  description: '코드 리뷰 에이전트',
  system_prompt: null,
  capabilities: ['review'],
  tool_access: null,
  source: 'preset',
  color: '#6366f1',
  created_at: '2025-01-01T00:00:00',
  updated_at: '2025-01-01T00:00:00',
};

const sampleTeam = {
  id: 1,
  name: 'Dev Team',
  description: '개발 팀',
  avatar_color: '#6366f1',
  status: 'active',
  default_pipeline_id: null,
  template_id: null,
  agents: [],
  agent_count: 0,
  created_at: '2025-01-01T00:00:00',
  updated_at: '2025-01-01T00:00:00',
};

const sampleTeamAgent = {
  id: 1,
  team_id: 1,
  persona_id: 1,
  instance_label: '',
  role: 'worker',
  context_prompt: null,
  max_concurrent: 1,
  persona: samplePersona,
  created_at: '2025-01-01T00:00:00',
  updated_at: '2025-01-01T00:00:00',
};

const sampleTaskTeam = {
  id: 1,
  task_id: 1,
  team_id: 1,
  team: sampleTeam,
  assigned_at: '2025-01-01T00:00:00',
};

describe('Team Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = Fastify();
    await registerTeamRoutes(app);
    await app.ready();
  });

  describe('Persona Routes', () => {
    describe('GET /api/personas', () => {
      it('페르소나 목록을 성공적으로 반환해야 함', async () => {
        mockListPersonas.mockReturnValue([samplePersona]);

        const response = await app.inject({
          method: 'GET',
          url: '/api/personas',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ items: [samplePersona], total: 1 });
        expect(mockListPersonas).toHaveBeenCalledWith({});
      });

      it('필터 파라미터를 올바르게 전달해야 함', async () => {
        mockListPersonas.mockReturnValue([samplePersona]);

        const response = await app.inject({
          method: 'GET',
          url: '/api/personas?category=review&source=preset',
        });

        expect(response.statusCode).toBe(200);
        expect(mockListPersonas).toHaveBeenCalledWith({ category: 'review', source: 'preset' });
      });
    });

    describe('GET /api/personas/:id', () => {
      it('특정 페르소나를 성공적으로 반환해야 함', async () => {
        mockGetPersona.mockReturnValue(samplePersona);

        const response = await app.inject({
          method: 'GET',
          url: '/api/personas/1',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual(samplePersona);
        expect(mockGetPersona).toHaveBeenCalledWith(1);
      });

      it('존재하지 않는 페르소나에 대해 404를 반환해야 함', async () => {
        mockGetPersona.mockReturnValue(null);

        const response = await app.inject({
          method: 'GET',
          url: '/api/personas/999',
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Persona not found' });
      });
    });

    describe('POST /api/personas', () => {
      it('새 페르소나를 성공적으로 생성해야 함', async () => {
        const newPersona = {
          agent_type: 'tester',
          name: 'Tester',
          model: 'sonnet',
        };
        mockCreatePersona.mockReturnValue({ id: 2, ...newPersona });

        const response = await app.inject({
          method: 'POST',
          url: '/api/personas',
          payload: newPersona,
        });

        expect(response.statusCode).toBe(201);
        expect(response.json()).toEqual({ id: 2, ...newPersona });
        expect(mockCreatePersona).toHaveBeenCalledWith(newPersona);
        expect(mockWsManager.notifyPersonaCreated).toHaveBeenCalledWith({
          id: 2,
          ...newPersona,
        });
      });

      it('생성 중 에러 발생 시 400을 반환해야 함', async () => {
        mockCreatePersona.mockImplementation(() => {
          throw new Error('Creation failed');
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/personas',
          payload: { agent_type: 'test' },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ error: 'Creation failed' });
      });
    });

    describe('PATCH /api/personas/:id', () => {
      it('페르소나를 성공적으로 업데이트해야 함', async () => {
        const updates = { name: 'Updated Name' };
        mockUpdatePersona.mockReturnValue({ ...samplePersona, ...updates });

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/personas/1',
          payload: updates,
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ ...samplePersona, ...updates });
        expect(mockUpdatePersona).toHaveBeenCalledWith(1, updates);
        expect(mockWsManager.notifyPersonaUpdated).toHaveBeenCalledWith({
          ...samplePersona,
          ...updates,
        });
      });

      it('존재하지 않는 페르소나 업데이트 시 404를 반환해야 함', async () => {
        mockUpdatePersona.mockReturnValue(null);

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/personas/999',
          payload: { name: 'Test' },
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Persona not found' });
      });

      it('업데이트 중 에러 발생 시 400을 반환해야 함', async () => {
        mockUpdatePersona.mockImplementation(() => {
          throw new Error('Update failed');
        });

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/personas/1',
          payload: { name: 'Test' },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ error: 'Update failed' });
      });
    });

    describe('DELETE /api/personas/:id', () => {
      it('페르소나를 성공적으로 삭제해야 함', async () => {
        mockDeletePersona.mockReturnValue(true);

        const response = await app.inject({
          method: 'DELETE',
          url: '/api/personas/1',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ success: true });
        expect(mockDeletePersona).toHaveBeenCalledWith(1);
        expect(mockWsManager.notifyPersonaDeleted).toHaveBeenCalledWith(1);
      });

      it('존재하지 않는 페르소나 삭제 시 404를 반환해야 함', async () => {
        mockDeletePersona.mockReturnValue(false);

        const response = await app.inject({
          method: 'DELETE',
          url: '/api/personas/999',
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Persona not found' });
      });

      it('삭제 중 에러 발생 시 400을 반환해야 함', async () => {
        mockDeletePersona.mockImplementation(() => {
          throw new Error('Delete failed');
        });

        const response = await app.inject({
          method: 'DELETE',
          url: '/api/personas/1',
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ error: 'Delete failed' });
      });
    });
  });

  describe('Team Routes', () => {
    describe('POST /api/teams', () => {
      it('새 팀을 성공적으로 생성해야 함', async () => {
        const newTeam = {
          name: 'New Team',
          description: 'New team description',
        };
        const createdTeam = Object.assign({}, sampleTeam, newTeam, { id: 2 });
        mockCreateTeam.mockReturnValue(createdTeam);

        const response = await app.inject({
          method: 'POST',
          url: '/api/teams',
          payload: newTeam,
        });

        expect(response.statusCode).toBe(201);
        expect(response.json()).toEqual(createdTeam);
        expect(mockCreateTeam).toHaveBeenCalledWith(newTeam);
        expect(mockWsManager.notifyTeamCreated).toHaveBeenCalledWith(createdTeam);
      });

      it('생성 중 에러 발생 시 400을 반환해야 함', async () => {
        mockCreateTeam.mockImplementation(() => {
          throw new Error('Creation failed');
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/teams',
          payload: { name: 'Test' },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ error: 'Creation failed' });
      });
    });

    describe('POST /api/teams/:id/clone', () => {
      it('팀을 성공적으로 복제해야 함', async () => {
        const clonedTeam = Object.assign({}, sampleTeam, { name: 'Cloned Team', id: 2 });
        mockCloneTeam.mockReturnValue(clonedTeam);

        const response = await app.inject({
          method: 'POST',
          url: '/api/teams/1/clone',
          payload: { name: 'Cloned Team' },
        });

        expect(response.statusCode).toBe(201);
        expect(response.json()).toEqual(clonedTeam);
        expect(mockCloneTeam).toHaveBeenCalledWith(1, 'Cloned Team');
        expect(mockWsManager.notifyTeamCreated).toHaveBeenCalledWith(clonedTeam);
      });

      it('복제 중 에러 발생 시 400을 반환해야 함', async () => {
        mockCloneTeam.mockImplementation(() => {
          throw new Error('Clone failed');
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/teams/1/clone',
          payload: { name: 'Test' },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ error: 'Clone failed' });
      });
    });

    describe('GET /api/teams', () => {
      it('팀 목록을 성공적으로 반환해야 함', async () => {
        mockListTeams.mockReturnValue([sampleTeam]);

        const response = await app.inject({
          method: 'GET',
          url: '/api/teams',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ items: [sampleTeam], total: 1 });
        expect(mockListTeams).toHaveBeenCalledWith({});
      });

      it('status 필터를 올바르게 전달해야 함', async () => {
        mockListTeams.mockReturnValue([sampleTeam]);

        const response = await app.inject({
          method: 'GET',
          url: '/api/teams?status=active',
        });

        expect(response.statusCode).toBe(200);
        expect(mockListTeams).toHaveBeenCalledWith({ status: 'active' });
      });
    });

    describe('GET /api/teams/:id', () => {
      it('특정 팀을 성공적으로 반환해야 함', async () => {
        mockGetTeam.mockReturnValue(sampleTeam);

        const response = await app.inject({
          method: 'GET',
          url: '/api/teams/1',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual(sampleTeam);
        expect(mockGetTeam).toHaveBeenCalledWith(1);
      });

      it('존재하지 않는 팀에 대해 404를 반환해야 함', async () => {
        mockGetTeam.mockReturnValue(null);

        const response = await app.inject({
          method: 'GET',
          url: '/api/teams/999',
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Team not found' });
      });
    });

    describe('PATCH /api/teams/:id', () => {
      it('팀을 성공적으로 업데이트해야 함', async () => {
        const updates = { name: 'Updated Team' };
        mockUpdateTeam.mockReturnValue({ ...sampleTeam, ...updates });

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/teams/1',
          payload: updates,
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ ...sampleTeam, ...updates });
        expect(mockUpdateTeam).toHaveBeenCalledWith(1, updates);
        expect(mockWsManager.notifyTeamUpdated).toHaveBeenCalledWith({
          ...sampleTeam,
          ...updates,
        });
      });

      it('존재하지 않는 팀 업데이트 시 404를 반환해야 함', async () => {
        mockUpdateTeam.mockReturnValue(null);

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/teams/999',
          payload: { name: 'Test' },
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Team not found' });
      });
    });

    describe('DELETE /api/teams/:id', () => {
      it('팀을 성공적으로 삭제해야 함', async () => {
        mockDeleteTeam.mockReturnValue(true);

        const response = await app.inject({
          method: 'DELETE',
          url: '/api/teams/1',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ success: true });
        expect(mockDeleteTeam).toHaveBeenCalledWith(1);
        expect(mockWsManager.notifyTeamDeleted).toHaveBeenCalledWith(1);
      });

      it('존재하지 않는 팀 삭제 시 404를 반환해야 함', async () => {
        mockDeleteTeam.mockReturnValue(false);

        const response = await app.inject({
          method: 'DELETE',
          url: '/api/teams/999',
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Team not found' });
      });
    });

    describe('PATCH /api/teams/:id/archive', () => {
      it('팀을 성공적으로 아카이브해야 함', async () => {
        const archivedTeam = { ...sampleTeam, status: 'archived' };
        mockArchiveTeam.mockReturnValue(archivedTeam);

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/teams/1/archive',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual(archivedTeam);
        expect(mockArchiveTeam).toHaveBeenCalledWith(1);
        expect(mockWsManager.notifyTeamArchived).toHaveBeenCalledWith(archivedTeam);
      });

      it('존재하지 않는 팀 아카이브 시 404를 반환해야 함', async () => {
        mockArchiveTeam.mockReturnValue(null);

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/teams/999/archive',
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Team not found' });
      });
    });

    describe('PATCH /api/teams/:id/activate', () => {
      it('팀을 성공적으로 활성화해야 함', async () => {
        const activatedTeam = { ...sampleTeam, status: 'active' };
        mockActivateTeam.mockReturnValue(activatedTeam);

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/teams/1/activate',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual(activatedTeam);
        expect(mockActivateTeam).toHaveBeenCalledWith(1);
        expect(mockWsManager.notifyTeamActivated).toHaveBeenCalledWith(activatedTeam);
      });

      it('존재하지 않는 팀 활성화 시 404를 반환해야 함', async () => {
        mockActivateTeam.mockReturnValue(null);

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/teams/999/activate',
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Team not found' });
      });
    });
  });

  describe('TeamAgent Routes', () => {
    describe('POST /api/teams/:id/agents', () => {
      it('팀에 에이전트를 성공적으로 추가해야 함', async () => {
        const agentData = {
          persona_id: 1,
          role: 'worker',
        };
        mockAddAgentToTeam.mockReturnValue(sampleTeamAgent);

        const response = await app.inject({
          method: 'POST',
          url: '/api/teams/1/agents',
          payload: agentData,
        });

        expect(response.statusCode).toBe(201);
        expect(response.json()).toEqual(sampleTeamAgent);
        expect(mockAddAgentToTeam).toHaveBeenCalledWith({
          team_id: 1,
          ...agentData,
        });
        expect(mockWsManager.notifyTeamAgentAdded).toHaveBeenCalledWith(sampleTeamAgent);
      });

      it('에이전트 추가 중 에러 발생 시 400을 반환해야 함', async () => {
        mockAddAgentToTeam.mockImplementation(() => {
          throw new Error('Add failed');
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/teams/1/agents',
          payload: { persona_id: 1 },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ error: 'Add failed' });
      });
    });

    describe('PATCH /api/team-agents/:id', () => {
      it('팀 에이전트를 성공적으로 업데이트해야 함', async () => {
        const updates = { role: 'leader' };
        mockUpdateTeamAgent.mockReturnValue({ ...sampleTeamAgent, ...updates });

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/team-agents/1',
          payload: updates,
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ ...sampleTeamAgent, ...updates });
        expect(mockUpdateTeamAgent).toHaveBeenCalledWith(1, updates);
        expect(mockWsManager.notifyTeamAgentUpdated).toHaveBeenCalledWith({
          ...sampleTeamAgent,
          ...updates,
        });
      });

      it('존재하지 않는 팀 에이전트 업데이트 시 404를 반환해야 함', async () => {
        mockUpdateTeamAgent.mockReturnValue(null);

        const response = await app.inject({
          method: 'PATCH',
          url: '/api/team-agents/999',
          payload: { role: 'leader' },
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'TeamAgent not found' });
      });
    });

    describe('DELETE /api/team-agents/:id', () => {
      it('팀 에이전트를 성공적으로 삭제해야 함', async () => {
        mockRemoveAgentFromTeam.mockReturnValue(true);

        const response = await app.inject({
          method: 'DELETE',
          url: '/api/team-agents/1',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ success: true });
        expect(mockRemoveAgentFromTeam).toHaveBeenCalledWith(1);
        expect(mockWsManager.notifyTeamAgentRemoved).toHaveBeenCalledWith({ id: 1 });
      });

      it('존재하지 않는 팀 에이전트 삭제 시 404를 반환해야 함', async () => {
        mockRemoveAgentFromTeam.mockReturnValue(false);

        const response = await app.inject({
          method: 'DELETE',
          url: '/api/team-agents/999',
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'TeamAgent not found' });
      });
    });

    describe('GET /api/teams/:id/agents', () => {
      it('팀의 에이전트 목록을 성공적으로 반환해야 함', async () => {
        mockListTeamAgents.mockReturnValue([sampleTeamAgent]);

        const response = await app.inject({
          method: 'GET',
          url: '/api/teams/1/agents',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ items: [sampleTeamAgent], total: 1 });
        expect(mockListTeamAgents).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Task-Team Routes', () => {
    describe('POST /api/tasks/:id/assign-team', () => {
      it('태스크에 팀을 성공적으로 할당해야 함', async () => {
        const assignData = { team_id: 1 };
        mockAssignTeamToTask.mockReturnValue(sampleTaskTeam);

        const response = await app.inject({
          method: 'POST',
          url: '/api/tasks/1/assign-team',
          payload: assignData,
        });

        expect(response.statusCode).toBe(201);
        expect(response.json()).toEqual(sampleTaskTeam);
        expect(mockAssignTeamToTask).toHaveBeenCalledWith(1, 1, undefined);
        expect(mockWsManager.notifyTaskTeamAssigned).toHaveBeenCalledWith(sampleTaskTeam);
      });

      it('팀 할당 중 에러 발생 시 400을 반환해야 함', async () => {
        mockAssignTeamToTask.mockImplementation(() => {
          throw new Error('Assign failed');
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/tasks/1/assign-team',
          payload: { team_id: 1 },
        });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ error: 'Assign failed' });
      });
    });

    describe('DELETE /api/tasks/:id/assign-team', () => {
      it('태스크에서 팀을 성공적으로 제거해야 함', async () => {
        mockUnassignTeamFromTask.mockReturnValue(true);

        const response = await app.inject({
          method: 'DELETE',
          url: '/api/tasks/1/assign-team',
          payload: { team_id: 1 },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ success: true });
        expect(mockUnassignTeamFromTask).toHaveBeenCalledWith(1, 1);
        expect(mockWsManager.notifyTaskTeamUnassigned).toHaveBeenCalledWith({
          task_id: 1,
          team_id: 1,
        });
      });

      it('존재하지 않는 할당 제거 시 404를 반환해야 함', async () => {
        mockUnassignTeamFromTask.mockReturnValue(false);

        const response = await app.inject({
          method: 'DELETE',
          url: '/api/tasks/999/assign-team',
          payload: { team_id: 1 },
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Assignment not found' });
      });
    });

    describe('GET /api/tasks/:id/teams', () => {
      it('태스크에 할당된 팀 목록을 성공적으로 반환해야 함', async () => {
        mockGetTaskTeams.mockReturnValue([sampleTaskTeam]);

        const response = await app.inject({
          method: 'GET',
          url: '/api/tasks/1/teams',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ items: [sampleTaskTeam], total: 1 });
        expect(mockGetTaskTeams).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Template & Workload Routes', () => {
    describe('GET /api/team-templates', () => {
      it('팀 템플릿 목록을 성공적으로 반환해야 함', async () => {
        const templates = [
          {
            id: 1,
            name: 'Dev Template',
            description: 'Development team template',
            agent_specs: [],
          },
        ];
        mockGetTeamTemplates.mockReturnValue(templates);

        const response = await app.inject({
          method: 'GET',
          url: '/api/team-templates',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual({ items: templates, total: 1 });
        expect(mockGetTeamTemplates).toHaveBeenCalled();
      });
    });

    describe('GET /api/teams/:id/workload', () => {
      it('팀의 작업 부하 정보를 성공적으로 반환해야 함', async () => {
        const workload = {
          team_id: 1,
          total_tasks: 10,
          active_tasks: 5,
          completed_tasks: 3,
          agents: [
            {
              agent_id: 1,
              persona_name: 'Code Reviewer',
              assigned_tasks: 3,
              completed_tasks: 1,
            },
          ],
        };
        mockGetTeamWorkload.mockReturnValue(workload);

        const response = await app.inject({
          method: 'GET',
          url: '/api/teams/1/workload',
        });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toEqual(workload);
        expect(mockGetTeamWorkload).toHaveBeenCalledWith(1);
      });

      it('존재하지 않는 팀의 작업 부하 조회 시 404를 반환해야 함', async () => {
        mockGetTeamWorkload.mockReturnValue(null);

        const response = await app.inject({
          method: 'GET',
          url: '/api/teams/999/workload',
        });

        expect(response.statusCode).toBe(404);
        expect(response.json()).toEqual({ error: 'Team not found' });
      });
    });
  });
});
