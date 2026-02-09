import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { SessionReport } from '@claudeops/shared';

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: () => apiFetch<{ total: number; items: SessionReport[] }>('/api/reports'),
    refetchInterval: 60_000,
  });
}

export function useGenerateSessionReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (session_id: string) =>
      apiFetch<SessionReport>('/api/reports/session', { method: 'POST', body: JSON.stringify({ session_id }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useGenerateStandup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<SessionReport>('/api/reports/standup', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
