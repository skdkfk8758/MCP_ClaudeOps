import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Task, TaskBoard, TaskStats, TaskHistoryEntry } from '@claudeops/shared';

export function useTaskBoard() {
  return useQuery({
    queryKey: ['tasks', 'board'],
    queryFn: () => apiFetch<TaskBoard>('/api/tasks/board'),
    refetchInterval: 10_000,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: () => apiFetch<TaskStats>('/api/tasks/stats'),
    refetchInterval: 30_000,
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: () => apiFetch<Task>(`/api/tasks/${id}`),
  });
}

export function useTaskHistory(id: number) {
  return useQuery({
    queryKey: ['tasks', id, 'history'],
    queryFn: () => apiFetch<TaskHistoryEntry[]>(`/api/tasks/${id}/history`),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; status?: string; priority?: string; assignee?: string; labels?: string[]; estimated_effort?: string; epic_id?: number }) =>
      apiFetch<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, position }: { id: number; status: string; position: number }) =>
      apiFetch<Task>(`/api/tasks/${id}/move`, { method: 'POST', body: JSON.stringify({ status, position }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; [key: string]: unknown }) =>
      apiFetch<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
