'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface Worktree {
  id: number;
  epic_id: number | null;
  name: string;
  path: string;
  branch: string;
  status: 'active' | 'merged' | 'removed';
  created_at: string;
  merged_at: string | null;
  epic_title?: string;
}

interface WorktreesResponse {
  items: Worktree[];
  total: number;
}

export function useWorktrees(filter?: { status?: string; epic_id?: number }) {
  const params = new URLSearchParams();
  if (filter?.status) params.append('status', filter.status);
  if (filter?.epic_id) params.append('epic_id', filter.epic_id.toString());
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return useQuery<WorktreesResponse>({
    queryKey: ['worktrees', filter],
    queryFn: () => apiFetch<WorktreesResponse>(`/api/worktrees${queryString}`),
  });
}

export function useCreateWorktree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; path: string; epic_id?: number }) =>
      apiFetch<Worktree>('/api/worktrees', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worktrees'] });
    },
  });
}

export function useMergeWorktree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/worktrees/${id}/merge`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worktrees'] });
    },
  });
}

export function useRemoveWorktree() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/worktrees/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['worktrees'] });
    },
  });
}
