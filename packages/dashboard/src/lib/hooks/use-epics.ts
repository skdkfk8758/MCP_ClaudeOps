import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Epic } from '@claudeops/shared';

export function useEpics(prd_id?: number, status?: string) {
  const params = new URLSearchParams();
  if (prd_id) params.set('prd_id', prd_id.toString());
  if (status) params.set('status', status);
  return useQuery({
    queryKey: ['epics', { prd_id, status }],
    queryFn: () => apiFetch<{ total: number; items: Epic[] }>(`/api/epics?${params}`),
    refetchInterval: 30_000,
  });
}

export function useEpic(id: number) {
  return useQuery({
    queryKey: ['epics', id],
    queryFn: () => apiFetch<Epic>(`/api/epics/${id}`),
  });
}

export function useCreateEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; prd_id?: number; architecture_notes?: string; tech_approach?: string }) =>
      apiFetch<Epic>('/api/epics', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epics'] });
      qc.invalidateQueries({ queryKey: ['prds'] });
    },
  });
}

export function useUpdateEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; [key: string]: unknown }) =>
      apiFetch<Epic>(`/api/epics/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epics'] });
      qc.invalidateQueries({ queryKey: ['prds'] });
    },
  });
}

export function useDeleteEpic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/epics/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epics'] });
      qc.invalidateQueries({ queryKey: ['prds'] });
    },
  });
}

export function useEpicSessions(epicId: number) {
  return useQuery({
    queryKey: ['epics', epicId, 'sessions'],
    queryFn: () => apiFetch<import('@claudeops/shared').EpicSessionStats>(`/api/epics/${epicId}/sessions`),
    enabled: epicId > 0,
  });
}
