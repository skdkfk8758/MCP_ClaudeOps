import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Task, TaskBoard, TaskStats, TaskHistoryEntry, TaskExecutionResult, DesignResult, DesignResultUpdate, TaskExecutionLogFilter, TaskExecutionGroup } from '@claudeops/shared';

export interface BoardFilters {
  epic_id?: number;
  priority?: string;
  assignee_id?: number;
  label?: string;
  team_id?: number;
  effort?: string;
}

export function useTaskBoard(filters?: BoardFilters) {
  const params = new URLSearchParams();
  if (filters?.epic_id) params.set('epic_id', String(filters.epic_id));
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.assignee_id) params.set('assignee_id', String(filters.assignee_id));
  if (filters?.label) params.set('label', filters.label);
  if (filters?.team_id) params.set('team_id', String(filters.team_id));
  if (filters?.effort) params.set('effort', filters.effort);
  const qs = params.toString();

  return useQuery({
    queryKey: ['tasks', 'board', filters],
    queryFn: () => apiFetch<TaskBoard>(`/api/tasks/board${qs ? `?${qs}` : ''}`),
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

export function useExecuteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; project_path: string; model?: string; additional_context?: string; dry_run?: boolean }) =>
      apiFetch<TaskExecutionResult>(`/api/tasks/${id}/execute`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDesignTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; project_path: string; model?: string; work_prompt?: string }) =>
      apiFetch<{ task_id: number; session_id: string; status: string }>(`/api/tasks/${id}/design`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useApproveDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ task_id: number; pipeline_id: number }>(`/api/tasks/${id}/design/approve`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useUpdateDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & DesignResultUpdate) =>
      apiFetch<Task>(`/api/tasks/${id}/design`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useImplementTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; project_path: string; model?: string }) =>
      apiFetch<{ task_id: number; session_id: string; status: string }>(`/api/tasks/${id}/implement`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useTaskExecutionLogs(taskId: number, filters?: TaskExecutionLogFilter) {
  const params = new URLSearchParams();
  if (filters?.phase) params.set('phase', filters.phase);
  if (filters?.agent_type) params.set('agent_type', filters.agent_type);
  if (filters?.model) params.set('model', filters.model);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.execution_id != null) params.set('execution_id', String(filters.execution_id));
  const qs = params.toString();

  return useQuery({
    queryKey: ['tasks', taskId, 'execution-logs', filters],
    queryFn: () => apiFetch<{ items: import('@claudeops/shared').TaskExecutionLog[]; total: number; page: number; pages: number }>(`/api/tasks/${taskId}/execution-logs${qs ? `?${qs}` : ''}`),
  });
}

export function useCancelTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean; cancelled: boolean }>(`/api/tasks/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useTaskExecutionGroups(taskId: number) {
  return useQuery({
    queryKey: ['tasks', taskId, 'execution-groups'],
    queryFn: () => apiFetch<TaskExecutionGroup[]>(`/api/tasks/${taskId}/execution-groups`),
  });
}

export function useRunVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; project_path: string; checks?: string[]; coverage_threshold?: number }) =>
      apiFetch<import('@claudeops/shared').VerificationResult>(`/api/tasks/${id}/verify`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });
}

export function useRetryVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; project_path: string; failed_only?: boolean; coverage_threshold?: number }) =>
      apiFetch<import('@claudeops/shared').VerificationResult>(`/api/tasks/${id}/verify/retry`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });
}

export function useVerificationResult(id: number) {
  return useQuery({
    queryKey: ['tasks', id, 'verification'],
    queryFn: () => apiFetch<{ status: string | null; result: import('@claudeops/shared').VerificationResult | null }>(`/api/tasks/${id}/verification`),
  });
}

export function useTaskCommits(id: number) {
  return useQuery({
    queryKey: ['tasks', id, 'commits'],
    queryFn: () => apiFetch<{ task_id: number; commits: import('@claudeops/shared').TaskCommit[] }>(`/api/tasks/${id}/commits`),
  });
}

export function useScanCommits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, project_path }: { id: number; project_path: string }) =>
      apiFetch<{ scanned: number; new_commits: number }>(`/api/tasks/${id}/commits/scan`, { method: 'POST', body: JSON.stringify({ project_path }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });
}

export function useLinkCommit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, commit_hash, project_path }: { id: number; commit_hash: string; project_path: string }) =>
      apiFetch<import('@claudeops/shared').TaskCommit>(`/api/tasks/${id}/commits/link`, { method: 'POST', body: JSON.stringify({ commit_hash, project_path }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });
}

export function useResolveProjectPath(taskId: number) {
  return useQuery({
    queryKey: ['tasks', taskId, 'resolve-project-path'],
    queryFn: () => apiFetch<{ project_path: string | null }>(`/api/tasks/${taskId}/resolve-project-path`),
  });
}

export function useAutoGenerateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ task_id: number; branch_name: string }>(`/api/tasks/${id}/branch/auto`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); },
  });
}

export function useScopeProposal(taskId: number) {
  return useQuery({
    queryKey: ['tasks', taskId, 'scope-proposal'],
    queryFn: () => apiFetch<{ has_proposal: boolean; proposal?: import('@claudeops/shared').ScopeProposal }>(
      `/api/tasks/${taskId}/design/scope-proposal`
    ),
    enabled: taskId > 0,
  });
}

export function useScopeSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; epic_title?: string; epic_description?: string; include_partial?: boolean }) =>
      apiFetch<import('@claudeops/shared').ScopeSplitResult>(`/api/tasks/${id}/design/scope-split`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['epics'] });
    },
  });
}
