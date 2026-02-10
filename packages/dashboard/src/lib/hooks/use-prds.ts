import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Prd } from '@claudeops/shared';

export function usePrds(status?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  return useQuery({
    queryKey: ['prds', { status }],
    queryFn: () => apiFetch<{ total: number; items: Prd[] }>(`/api/prds?${params}`),
    refetchInterval: 30_000,
  });
}

export function usePrd(id: number) {
  return useQuery({
    queryKey: ['prds', id],
    queryFn: () => apiFetch<Prd>(`/api/prds/${id}`),
  });
}

export function useCreatePrd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; description?: string; vision?: string; user_stories?: string[]; success_criteria?: string[]; project_path?: string }) =>
      apiFetch<Prd>('/api/prds', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prds'] });
    },
  });
}

export function useUpdatePrd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; [key: string]: unknown }) =>
      apiFetch<Prd>(`/api/prds/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prds'] });
    },
  });
}

export function useDeletePrd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/prds/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prds'] });
    },
  });
}
