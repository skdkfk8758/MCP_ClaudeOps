'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

interface CostByModel {
  model: string; total_cost: number; token_count: number;
}

export function CostSummary() {
  const { data } = useQuery({
    queryKey: ['tokens', 'cost-by-model'],
    queryFn: () => apiFetch<CostByModel[]>('/api/tokens/cost-by-model?days=7'),
    refetchInterval: 60_000,
  });

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">모델별 비용 (7일)</h2>
        <p className="text-muted-foreground">아직 비용 데이터가 없습니다. Claude Code를 사용하면 분석이 표시됩니다.</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.total_cost, 0);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">모델별 비용 (7일)</h2>
        <span className="text-xl font-bold">${total.toFixed(2)}</span>
      </div>
      <div className="space-y-3">
        {data.map((model) => (
          <div key={model.model} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: model.model === 'opus' ? '#ef4444' : model.model === 'sonnet' ? '#f59e0b' : '#22c55e' }} />
              <span className="text-sm capitalize">{model.model}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">${model.total_cost.toFixed(2)}</span>
              <span className="ml-2 text-xs text-muted-foreground">{((model.total_cost / total) * 100).toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
