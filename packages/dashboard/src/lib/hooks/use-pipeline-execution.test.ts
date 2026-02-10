import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { usePipelineExecutions, usePipelineExecution } from './use-pipeline-execution';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '@/lib/api';

const mockApiFetch = vi.mocked(apiFetch);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    QueryClientProvider({ client: queryClient, children });
}

const mockExecution = {
  id: 1,
  pipeline_id: 10,
  status: 'running' as const,
  current_step: 1,
  total_steps: 3,
  started_at: '2025-01-01T00:00:00Z',
  completed_at: null,
  results: [
    {
      step: 1,
      status: 'completed' as const,
      agents: [{ type: 'executor', status: 'completed' as const }],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePipelineExecutions', () => {
  it('fetches executions list for a pipeline', async () => {
    mockApiFetch.mockResolvedValue([mockExecution]);

    const { result } = renderHook(() => usePipelineExecutions(10), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pipelines/10/executions');
    expect(result.current.data).toEqual([mockExecution]);
  });
});

describe('usePipelineExecution', () => {
  it('fetches a single execution by id', async () => {
    mockApiFetch.mockResolvedValue(mockExecution);

    const { result } = renderHook(() => usePipelineExecution(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pipeline-executions/1');
    expect(result.current.data).toEqual(mockExecution);
  });

  it('fetches completed execution', async () => {
    const completed = { ...mockExecution, status: 'completed' as const, completed_at: '2025-01-01T01:00:00Z' };
    mockApiFetch.mockResolvedValue(completed);

    const { result } = renderHook(() => usePipelineExecution(2), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('completed');
  });
});
