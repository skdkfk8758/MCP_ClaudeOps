import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import {
  usePersonas,
  usePersona,
  useCreatePersona,
  useUpdatePersona,
  useDeletePersona,
  useTeams,
  useTeam,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useCloneTeam,
  useArchiveTeam,
  useActivateTeam,
  useTeamAgents,
  useAddAgentToTeam,
  useUpdateTeamAgent,
  useRemoveAgentFromTeam,
  useAssignTeamToTask,
  useUnassignTeamFromTask,
  useTaskTeams,
  useTeamTemplates,
  useTeamWorkload,
} from './use-teams';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';

const mockApiFetch = vi.mocked(apiFetch);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    QueryClientProvider({ client: queryClient, children });
}

const mockPersona = {
  id: 1,
  agent_type: 'code-reviewer',
  name: 'Code Reviewer',
  model: 'sonnet' as const,
  category: 'review',
  description: '코드 리뷰 에이전트',
  system_prompt: null,
  capabilities: ['review'],
  tool_access: null,
  source: 'preset' as const,
  color: '#6366f1',
  created_at: '2025-01-01T00:00:00',
  updated_at: '2025-01-01T00:00:00',
};

const mockTeam = {
  id: 1,
  name: 'Dev Team',
  description: '개발 팀',
  avatar_color: '#6366f1',
  status: 'active' as const,
  default_pipeline_id: null,
  template_id: null,
  agents: [],
  agent_count: 0,
  created_at: '2025-01-01T00:00:00',
  updated_at: '2025-01-01T00:00:00',
};

const mockTeamAgent = {
  id: 1,
  team_id: 1,
  persona_id: 1,
  instance_label: '',
  role: 'worker' as const,
  context_prompt: null,
  max_concurrent: 1,
  persona: mockPersona,
  created_at: '2025-01-01T00:00:00',
  updated_at: '2025-01-01T00:00:00',
};

const mockTeamTemplate = {
  id: 'template-1',
  name: 'Feature Team',
  description: '기능 개발 팀 템플릿',
  category: 'dev',
  agents: [
    { agent_type: 'executor', model: 'sonnet' as const, role: 'worker' as const, max_concurrent: 1 },
  ],
};

const mockTeamWorkload = {
  team_id: 1,
  total_tasks: 5,
  active_tasks: 2,
  pending_tasks: 3,
  completed_tasks: 10,
  avg_completion_time: 3600,
  agent_workloads: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Persona Hooks Tests ───

describe('usePersonas', () => {
  it('필터 없이 페르소나 목록 조회', async () => {
    const response = { total: 1, items: [mockPersona] };
    mockApiFetch.mockResolvedValue(response);

    const { result } = renderHook(() => usePersonas(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/personas?');
    expect(result.current.data).toEqual(response);
  });

  it('필터와 함께 페르소나 목록 조회', async () => {
    mockApiFetch.mockResolvedValue({ total: 0, items: [] });

    const { result } = renderHook(
      () => usePersonas({ category: 'review', source: 'preset', search: 'code' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('category=review'));
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('source=preset'));
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('search=code'));
  });
});

describe('usePersona', () => {
  it('ID로 단일 페르소나 조회', async () => {
    mockApiFetch.mockResolvedValue(mockPersona);

    const { result } = renderHook(() => usePersona(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/personas/1');
    expect(result.current.data).toEqual(mockPersona);
  });

  it('ID가 0 이하일 때 쿼리 비활성화', async () => {
    const { result } = renderHook(() => usePersona(0), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe('useCreatePersona', () => {
  it('POST 요청으로 페르소나 생성', async () => {
    mockApiFetch.mockResolvedValue(mockPersona);

    const { result } = renderHook(() => useCreatePersona(), { wrapper: createWrapper() });

    result.current.mutate({
      agent_type: 'code-reviewer',
      name: 'Code Reviewer',
      model: 'sonnet',
      category: 'review',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/personas', {
      method: 'POST',
      body: JSON.stringify({
        agent_type: 'code-reviewer',
        name: 'Code Reviewer',
        model: 'sonnet',
        category: 'review',
      }),
    });
  });
});

describe('useUpdatePersona', () => {
  it('PATCH 요청으로 페르소나 수정', async () => {
    mockApiFetch.mockResolvedValue(mockPersona);

    const { result } = renderHook(() => useUpdatePersona(), { wrapper: createWrapper() });

    result.current.mutate({ id: 1, name: 'Updated Reviewer' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/personas/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Reviewer' }),
    });
  });
});

describe('useDeletePersona', () => {
  it('DELETE 요청으로 페르소나 삭제', async () => {
    mockApiFetch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeletePersona(), { wrapper: createWrapper() });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/personas/1', { method: 'DELETE' });
  });
});

// ─── Team Hooks Tests ───

describe('useTeams', () => {
  it('필터 없이 팀 목록 조회', async () => {
    const response = { total: 1, items: [mockTeam] };
    mockApiFetch.mockResolvedValue(response);

    const { result } = renderHook(() => useTeams(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams?');
    expect(result.current.data).toEqual(response);
  });

  it('상태 필터와 함께 팀 목록 조회', async () => {
    mockApiFetch.mockResolvedValue({ total: 0, items: [] });

    const { result } = renderHook(() => useTeams({ status: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('status=active'));
  });
});

describe('useTeam', () => {
  it('ID로 단일 팀 조회', async () => {
    mockApiFetch.mockResolvedValue(mockTeam);

    const { result } = renderHook(() => useTeam(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams/1');
    expect(result.current.data).toEqual(mockTeam);
  });

  it('ID가 0 이하일 때 쿼리 비활성화', async () => {
    const { result } = renderHook(() => useTeam(0), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe('useCreateTeam', () => {
  it('POST 요청으로 팀 생성', async () => {
    mockApiFetch.mockResolvedValue(mockTeam);

    const { result } = renderHook(() => useCreateTeam(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'New Team' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams', {
      method: 'POST',
      body: JSON.stringify({ name: 'New Team' }),
    });
  });
});

describe('useUpdateTeam', () => {
  it('PATCH 요청으로 팀 수정', async () => {
    mockApiFetch.mockResolvedValue(mockTeam);

    const { result } = renderHook(() => useUpdateTeam(), { wrapper: createWrapper() });

    result.current.mutate({ id: 1, description: 'Updated description' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams/1', {
      method: 'PATCH',
      body: JSON.stringify({ description: 'Updated description' }),
    });
  });
});

describe('useDeleteTeam', () => {
  it('DELETE 요청으로 팀 삭제', async () => {
    mockApiFetch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeleteTeam(), { wrapper: createWrapper() });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams/1', { method: 'DELETE' });
  });
});

describe('useCloneTeam', () => {
  it('POST 요청으로 팀 복제', async () => {
    mockApiFetch.mockResolvedValue(mockTeam);

    const { result } = renderHook(() => useCloneTeam(), { wrapper: createWrapper() });

    result.current.mutate({ id: 1, name: 'Cloned Team' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams/1/clone', {
      method: 'POST',
      body: JSON.stringify({ name: 'Cloned Team' }),
    });
  });
});

describe('useArchiveTeam', () => {
  it('PATCH 요청으로 팀 아카이브', async () => {
    mockApiFetch.mockResolvedValue({ ...mockTeam, status: 'archived' });

    const { result } = renderHook(() => useArchiveTeam(), { wrapper: createWrapper() });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams/1/archive', { method: 'PATCH' });
  });
});

describe('useActivateTeam', () => {
  it('PATCH 요청으로 팀 활성화', async () => {
    mockApiFetch.mockResolvedValue(mockTeam);

    const { result } = renderHook(() => useActivateTeam(), { wrapper: createWrapper() });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams/1/activate', { method: 'PATCH' });
  });
});

// ─── TeamAgent Hooks Tests ───

describe('useTeamAgents', () => {
  it('팀 ID로 에이전트 목록 조회', async () => {
    mockApiFetch.mockResolvedValue([mockTeamAgent]);

    const { result } = renderHook(() => useTeamAgents(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams/1/agents');
    expect(result.current.data).toEqual([mockTeamAgent]);
  });

  it('팀 ID가 0 이하일 때 쿼리 비활성화', async () => {
    const { result } = renderHook(() => useTeamAgents(0), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe('useAddAgentToTeam', () => {
  it('POST 요청으로 팀에 에이전트 추가', async () => {
    mockApiFetch.mockResolvedValue(mockTeamAgent);

    const { result } = renderHook(() => useAddAgentToTeam(), { wrapper: createWrapper() });

    result.current.mutate({
      teamId: 1,
      persona_id: 1,
      role: 'worker',
      instance_label: '',
      context_prompt: null,
      max_concurrent: 1,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams/1/agents', {
      method: 'POST',
      body: JSON.stringify({
        persona_id: 1,
        role: 'worker',
        instance_label: '',
        context_prompt: null,
        max_concurrent: 1,
      }),
    });
  });
});

describe('useUpdateTeamAgent', () => {
  it('PATCH 요청으로 팀 에이전트 수정', async () => {
    mockApiFetch.mockResolvedValue(mockTeamAgent);

    const { result } = renderHook(() => useUpdateTeamAgent(), { wrapper: createWrapper() });

    result.current.mutate({ id: 1, role: 'lead' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/team-agents/1', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'lead' }),
    });
  });
});

describe('useRemoveAgentFromTeam', () => {
  it('DELETE 요청으로 팀에서 에이전트 제거', async () => {
    mockApiFetch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useRemoveAgentFromTeam(), { wrapper: createWrapper() });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/team-agents/1', { method: 'DELETE' });
  });
});

// ─── Task-Team Assignment Hooks Tests ───

describe('useAssignTeamToTask', () => {
  it('POST 요청으로 태스크에 팀 할당', async () => {
    mockApiFetch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAssignTeamToTask(), { wrapper: createWrapper() });

    result.current.mutate({ taskId: 1, teamId: 1, autoExecute: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/tasks/1/assign-team', {
      method: 'POST',
      body: JSON.stringify({ team_id: 1, auto_execute: true }),
    });
  });
});

describe('useUnassignTeamFromTask', () => {
  it('DELETE 요청으로 태스크에서 팀 할당 해제', async () => {
    mockApiFetch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useUnassignTeamFromTask(), { wrapper: createWrapper() });

    result.current.mutate({ taskId: 1, teamId: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/tasks/1/assign-team', {
      method: 'DELETE',
      body: JSON.stringify({ team_id: 1 }),
    });
  });
});

describe('useTaskTeams', () => {
  it('태스크 ID로 할당된 팀 목록 조회', async () => {
    mockApiFetch.mockResolvedValue([mockTeam]);

    const { result } = renderHook(() => useTaskTeams(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/tasks/1/teams');
    expect(result.current.data).toEqual([mockTeam]);
  });

  it('태스크 ID가 0 이하일 때 쿼리 비활성화', async () => {
    const { result } = renderHook(() => useTaskTeams(0), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

// ─── Template & Workload Hooks Tests ───

describe('useTeamTemplates', () => {
  it('팀 템플릿 목록 조회', async () => {
    mockApiFetch.mockResolvedValue([mockTeamTemplate]);

    const { result } = renderHook(() => useTeamTemplates(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/team-templates');
    expect(result.current.data).toEqual([mockTeamTemplate]);
  });
});

describe('useTeamWorkload', () => {
  it('팀 ID로 작업 부하 조회', async () => {
    mockApiFetch.mockResolvedValue(mockTeamWorkload);

    const { result } = renderHook(() => useTeamWorkload(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/teams/1/workload');
    expect(result.current.data).toEqual(mockTeamWorkload);
  });

  it('팀 ID가 0 이하일 때 쿼리 비활성화', async () => {
    const { result } = renderHook(() => useTeamWorkload(0), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
