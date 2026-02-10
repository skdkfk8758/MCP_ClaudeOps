import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Pipeline, PipelineCreate, PipelineUpdate, PipelinePreset } from '@claudeops/shared';

export function usePipelines(filters?: { epic_id?: number; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.epic_id) params.set('epic_id', String(filters.epic_id));
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();

  return useQuery({
    queryKey: ['pipelines', filters],
    queryFn: () => apiFetch<{ total: number; page: number; page_size: number; pages: number; items: Pipeline[] }>(`/api/pipelines${qs ? `?${qs}` : ''}`),
    refetchInterval: 10_000,
  });
}

export function usePipeline(id: number) {
  return useQuery({
    queryKey: ['pipelines', id],
    queryFn: () => apiFetch<Pipeline>(`/api/pipelines/${id}`),
  });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PipelineCreate) =>
      apiFetch<Pipeline>('/api/pipelines', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useUpdatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: PipelineUpdate & { id: number }) =>
      apiFetch<Pipeline>(`/api/pipelines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useDeletePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/pipelines/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useExecutePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; project_path: string; simulate?: boolean }) =>
      apiFetch<{ execution_id: number }>(`/api/pipelines/${id}/execute`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useCancelPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/pipelines/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function usePipelinePresets() {
  return useQuery({
    queryKey: ['pipeline-presets'],
    queryFn: () => apiFetch<PipelinePreset[]>('/api/pipeline-presets'),
  });
}
