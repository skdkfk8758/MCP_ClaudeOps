'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface ProjectContext {
  id: number;
  project_path: string;
  context_type: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ProjectContextsResponse {
  items: ProjectContext[];
  total: number;
}

export function useProjectContexts(projectPath: string) {
  const params = new URLSearchParams();
  if (projectPath) params.append('project_path', projectPath);
  const queryString = params.toString() ? `?${params.toString()}` : '';

  return useQuery<ProjectContextsResponse>({
    queryKey: ['contexts', projectPath],
    queryFn: () => apiFetch<ProjectContextsResponse>(`/api/contexts${queryString}`),
    enabled: !!projectPath,
  });
}

export function useSetProjectContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { project_path: string; context_type: string; title: string; content: string }) =>
      apiFetch<ProjectContext>('/api/contexts', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contexts'] });
    },
  });
}

export function useDeleteProjectContext() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/contexts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contexts'] });
    },
  });
}
