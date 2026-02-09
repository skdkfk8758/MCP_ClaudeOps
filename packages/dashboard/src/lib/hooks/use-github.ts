'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface GitHubConfig {
  id: number;
  repo_owner: string | null;
  repo_name: string | null;
  enabled: boolean;
  auto_sync: boolean;
  updated_at: string;
}

export function useGitHubConfig() {
  return useQuery<GitHubConfig>({
    queryKey: ['github', 'config'],
    queryFn: () => apiFetch<GitHubConfig>('/api/github/config'),
  });
}

export function useUpdateGitHubConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { repo_owner?: string; repo_name?: string; enabled?: boolean; auto_sync?: boolean }) =>
      apiFetch<GitHubConfig>('/api/github/config', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['github'] });
    },
  });
}

export function useSyncEpicToGitHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (epicId: number) =>
      apiFetch<{ success: boolean; github_url?: string }>(`/api/github/sync/epic/${epicId}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epics'] });
      qc.invalidateQueries({ queryKey: ['github'] });
    },
  });
}

export function useSyncTaskToGitHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: number) =>
      apiFetch<{ success: boolean; github_url?: string }>(`/api/github/sync/task/${taskId}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['github'] });
    },
  });
}

export function usePostReportToGitHub() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reportId: number) =>
      apiFetch<{ success: boolean }>(`/api/github/sync/report/${reportId}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['github'] });
    },
  });
}
