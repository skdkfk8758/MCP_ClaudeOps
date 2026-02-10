import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import {
  usePipelines,
  usePipeline,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
  useExecutePipeline,
  useCancelPipeline,
  usePipelinePresets,
} from './use-pipelines';

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

const mockPipeline = {
  id: 1,
  name: 'Test Pipeline',
  description: 'desc',
  epic_id: null,
  steps: [{ step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet' as const, prompt: 'do it' }] }],
  graph_data: null,
  status: 'draft' as const,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePipelines', () => {
  it('fetches pipelines list without filters', async () => {
    const response = { total: 1, page: 1, page_size: 20, pages: 1, items: [mockPipeline] };
    mockApiFetch.mockResolvedValue(response);

    const { result } = renderHook(() => usePipelines(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pipelines');
    expect(result.current.data).toEqual(response);
  });

  it('appends query string when filters provided', async () => {
    mockApiFetch.mockResolvedValue({ total: 0, page: 1, page_size: 20, pages: 0, items: [] });

    const { result } = renderHook(() => usePipelines({ epic_id: 5, status: 'running' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('epic_id=5'));
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('status=running'));
  });
});

describe('usePipeline', () => {
  it('fetches a single pipeline by id', async () => {
    mockApiFetch.mockResolvedValue(mockPipeline);

    const { result } = renderHook(() => usePipeline(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pipelines/1');
    expect(result.current.data).toEqual(mockPipeline);
  });
});

describe('useCreatePipeline', () => {
  it('posts to create endpoint and invalidates queries', async () => {
    mockApiFetch.mockResolvedValue(mockPipeline);

    const { result } = renderHook(() => useCreatePipeline(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'New', steps: [] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pipelines', {
      method: 'POST',
      body: JSON.stringify({ name: 'New', steps: [] }),
    });
  });
});

describe('useUpdatePipeline', () => {
  it('patches pipeline and invalidates queries', async () => {
    mockApiFetch.mockResolvedValue(mockPipeline);

    const { result } = renderHook(() => useUpdatePipeline(), { wrapper: createWrapper() });

    result.current.mutate({ id: 1, name: 'Updated' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pipelines/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });
  });
});

describe('useDeletePipeline', () => {
  it('sends DELETE request', async () => {
    mockApiFetch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useDeletePipeline(), { wrapper: createWrapper() });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pipelines/1', { method: 'DELETE' });
  });
});

describe('useExecutePipeline', () => {
  it('posts execution request', async () => {
    mockApiFetch.mockResolvedValue({ execution_id: 42 });

    const { result } = renderHook(() => useExecutePipeline(), { wrapper: createWrapper() });

    result.current.mutate({ id: 1, project_path: '/tmp/proj', simulate: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pipelines/1/execute', {
      method: 'POST',
      body: JSON.stringify({ project_path: '/tmp/proj', simulate: true }),
    });
  });
});

describe('useCancelPipeline', () => {
  it('posts cancel request', async () => {
    mockApiFetch.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCancelPipeline(), { wrapper: createWrapper() });

    result.current.mutate(1);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pipelines/1/cancel', { method: 'POST' });
  });
});

describe('usePipelinePresets', () => {
  it('fetches pipeline presets', async () => {
    const presets = [{ id: 'p1', name: 'Basic', description: 'basic preset', category: 'dev', steps: [] }];
    mockApiFetch.mockResolvedValue(presets);

    const { result } = renderHook(() => usePipelinePresets(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiFetch).toHaveBeenCalledWith('/api/pipeline-presets');
    expect(result.current.data).toEqual(presets);
  });
});
