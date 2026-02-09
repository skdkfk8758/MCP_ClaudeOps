import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Team, TeamMember, MemberWorkload, TeamWorkload } from '@claudeops/shared';

interface TeamsResponse { items: Team[]; total: number; }
interface MembersResponse { items: TeamMember[]; total: number; }

export function useTeams() {
  return useQuery<TeamsResponse>({
    queryKey: ['teams'],
    queryFn: () => apiFetch<TeamsResponse>('/api/teams'),
    refetchInterval: 30_000,
  });
}

export function useTeam(id: number) {
  return useQuery<Team>({
    queryKey: ['teams', id],
    queryFn: () => apiFetch<Team>(`/api/teams/${id}`),
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; avatar_color?: string }) =>
      apiFetch<Team>('/api/teams', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); },
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; description?: string; avatar_color?: string }) =>
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

export function useMembers(teamId?: number) {
  const params = teamId ? `?team_id=${teamId}` : '';
  return useQuery<MembersResponse>({
    queryKey: ['members', teamId],
    queryFn: () => apiFetch<MembersResponse>(`/api/members${params}`),
    refetchInterval: 30_000,
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { team_id: number; name: string; role?: string; email?: string; specialties?: string[] }) =>
      apiFetch<TeamMember>(`/api/teams/${data.team_id}/members`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; role?: string; email?: string; status?: string; specialties?: string[] }) =>
      apiFetch<TeamMember>(`/api/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useAssignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, memberIds }: { taskId: number; memberIds: number[] }) =>
      apiFetch<{ success: boolean }>(`/api/tasks/${taskId}/assign`, { method: 'POST', body: JSON.stringify({ member_ids: memberIds }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useUnassignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, memberIds }: { taskId: number; memberIds: number[] }) =>
      apiFetch<{ success: boolean }>(`/api/tasks/${taskId}/assign`, { method: 'DELETE', body: JSON.stringify({ member_ids: memberIds }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

export function useMemberWorkload(id: number) {
  return useQuery<MemberWorkload>({
    queryKey: ['members', id, 'workload'],
    queryFn: () => apiFetch<MemberWorkload>(`/api/members/${id}/workload`),
    enabled: id > 0,
  });
}

export function useTeamWorkload(teamId: number) {
  return useQuery<TeamWorkload>({
    queryKey: ['teams', teamId, 'workload'],
    queryFn: () => apiFetch<TeamWorkload>(`/api/teams/${teamId}/workload`),
    enabled: teamId > 0,
  });
}
