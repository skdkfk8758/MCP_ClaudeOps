import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type {
  Team, TeamCreate, TeamUpdate,
  AgentPersona, AgentPersonaCreate, AgentPersonaUpdate,
  TeamAgent, TeamAgentCreate, TeamAgentUpdate,
  TeamWorkload, TeamTemplate,
} from '@claudeops/shared';

interface ListResponse<T> { items: T[]; total: number; }

// ─── Persona Hooks ───

export function usePersonas(filter?: { category?: string; source?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filter?.category) params.set('category', filter.category);
  if (filter?.source) params.set('source', filter.source);
  if (filter?.search) params.set('search', filter.search);
  return useQuery<ListResponse<AgentPersona>>({
    queryKey: ['personas', filter],
    queryFn: () => apiFetch<ListResponse<AgentPersona>>(`/api/personas?${params}`),
    refetchInterval: 30_000,
  });
}

export function usePersona(id: number) {
  return useQuery<AgentPersona>({
    queryKey: ['personas', id],
    queryFn: () => apiFetch<AgentPersona>(`/api/personas/${id}`),
    enabled: id > 0,
  });
}

export function useCreatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AgentPersonaCreate) =>
      apiFetch<AgentPersona>('/api/personas', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['personas'] }); },
  });
}

export function useUpdatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: AgentPersonaUpdate & { id: number }) =>
      apiFetch<AgentPersona>(`/api/personas/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['personas'] }); },
  });
}

export function useDeletePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/personas/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['personas'] }); },
  });
}

// ─── Team Hooks ───

export function useTeams(filter?: { status?: string }) {
  const params = new URLSearchParams();
  if (filter?.status) params.set('status', filter.status);
  return useQuery<ListResponse<Team>>({
    queryKey: ['teams', filter],
    queryFn: () => apiFetch<ListResponse<Team>>(`/api/teams?${params}`),
    refetchInterval: 30_000,
  });
}

export function useTeam(id: number) {
  return useQuery<Team>({
    queryKey: ['teams', id],
    queryFn: () => apiFetch<Team>(`/api/teams/${id}`),
    enabled: id > 0,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TeamCreate) =>
      apiFetch<Team>('/api/teams', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); },
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: TeamUpdate & { id: number }) =>
      apiFetch<Team>(`/api/teams/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); },
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/teams/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); },
  });
}

export function useCloneTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiFetch<Team>(`/api/teams/${id}/clone`, { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); },
  });
}

export function useArchiveTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<Team>(`/api/teams/${id}/archive`, { method: 'PATCH' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); },
  });
}

export function useActivateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<Team>(`/api/teams/${id}/activate`, { method: 'PATCH' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); },
  });
}

// ─── TeamAgent Hooks ───

export function useTeamAgents(teamId: number) {
  return useQuery<TeamAgent[]>({
    queryKey: ['teams', teamId, 'agents'],
    queryFn: () => apiFetch<TeamAgent[]>(`/api/teams/${teamId}/agents`),
    enabled: teamId > 0,
  });
}

export function useAddAgentToTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, ...data }: Omit<TeamAgentCreate, 'team_id'> & { teamId: number }) =>
      apiFetch<TeamAgent>(`/api/teams/${teamId}/agents`, {
        method: 'POST',
        body: JSON.stringify({ persona_id: data.persona_id, role: data.role, instance_label: data.instance_label, context_prompt: data.context_prompt, max_concurrent: data.max_concurrent }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateTeamAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: TeamAgentUpdate & { id: number }) =>
      apiFetch<TeamAgent>(`/api/team-agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useRemoveAgentFromTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/team-agents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

// ─── Task-Team Assignment Hooks ───

export function useAssignTeamToTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, teamId, autoExecute }: { taskId: number; teamId: number; autoExecute?: boolean }) =>
      apiFetch<unknown>(`/api/tasks/${taskId}/assign-team`, {
        method: 'POST',
        body: JSON.stringify({ team_id: teamId, auto_execute: autoExecute }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUnassignTeamFromTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, teamId }: { taskId: number; teamId: number }) =>
      apiFetch<unknown>(`/api/tasks/${taskId}/assign-team`, {
        method: 'DELETE',
        body: JSON.stringify({ team_id: teamId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useTaskTeams(taskId: number) {
  return useQuery<Team[]>({
    queryKey: ['tasks', taskId, 'teams'],
    queryFn: () => apiFetch<Team[]>(`/api/tasks/${taskId}/teams`),
    enabled: taskId > 0,
  });
}

// ─── Template & Workload Hooks ───

export function useTeamTemplates() {
  return useQuery<TeamTemplate[]>({
    queryKey: ['team-templates'],
    queryFn: () => apiFetch<TeamTemplate[]>('/api/team-templates'),
    staleTime: Infinity,
  });
}

export function useTeamWorkload(teamId: number) {
  return useQuery<TeamWorkload>({
    queryKey: ['teams', teamId, 'workload'],
    queryFn: () => apiFetch<TeamWorkload>(`/api/teams/${teamId}/workload`),
    enabled: teamId > 0,
  });
}
