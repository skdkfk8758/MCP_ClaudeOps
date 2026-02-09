'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface TokenData { total_input: number; total_output: number; total: number; by_model: Record<string, { input: number; output: number; total: number }> }

export default function TokensPage() {
  const { data } = useQuery({
    queryKey: ['tokens', 'usage'],
    queryFn: () => apiFetch<TokenData>('/api/tokens/usage?days=30'),
  });

  const { data: budget } = useQuery({
    queryKey: ['tokens', 'budget'],
    queryFn: () => apiFetch<{ daily: { limit: number; current: number }; monthly: { limit: number; current: number } }>('/api/tokens/budget'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">토큰 & 비용</h1>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">총 입력 토큰 (30일)</p>
          <p className="text-2xl font-bold">{(data?.total_input ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">총 출력 토큰 (30일)</p>
          <p className="text-2xl font-bold">{(data?.total_output ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">총 토큰 (30일)</p>
          <p className="text-2xl font-bold">{(data?.total ?? 0).toLocaleString()}</p>
        </div>
      </div>
      {budget && (budget.daily.limit > 0 || budget.monthly.limit > 0) && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">예산 현황</h2>
          {budget.daily.limit > 0 && (
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>일일: ${budget.daily.current.toFixed(2)} / ${budget.daily.limit.toFixed(2)}</span>
                <span>{((budget.daily.current / budget.daily.limit) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (budget.daily.current / budget.daily.limit) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
      {data?.by_model && Object.keys(data.by_model).length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">모델별</h2>
          <div className="space-y-3">
            {Object.entries(data.by_model).map(([model, usage]) => (
              <div key={model} className="flex items-center justify-between">
                <span className="capitalize font-medium">{model}</span>
                <span className="text-sm text-muted-foreground">{usage.total.toLocaleString()} tokens</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
