import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { PipelineExecution } from '@claudeops/shared';

export function usePipelineExecutions(pipelineId: number) {
  return useQuery({
    queryKey: ['pipelines', pipelineId, 'executions'],
    queryFn: () => apiFetch<PipelineExecution[]>(`/api/pipelines/${pipelineId}/executions`),
    refetchInterval: 5_000,
  });
}

export function usePipelineExecution(executionId: number) {
  return useQuery({
    queryKey: ['pipeline-executions', executionId],
    queryFn: () => apiFetch<PipelineExecution>(`/api/pipeline-executions/${executionId}`),
    refetchInterval: (query) => {
      const data = query.state.data as PipelineExecution | undefined;
      return data?.status === 'running' ? 2_000 : false;
    },
  });
}
