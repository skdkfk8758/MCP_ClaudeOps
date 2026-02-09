'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { AgentStats } from '@claudeops/shared';

export default function AgentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['agents', 'stats'],
    queryFn: () => apiFetch<AgentStats[]>('/api/agents/stats'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">에이전트 성능</h1>
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      ) : data && data.length > 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">에이전트</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">모델</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">호출 수</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">평균 소요 시간</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">성공률</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">비용</th>
              </tr>
            </thead>
            <tbody>
              {data.map((agent, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{agent.agent_type}</td>
                  <td className="px-4 py-3 capitalize">{agent.model}</td>
                  <td className="px-4 py-3 text-right">{agent.total_calls}</td>
                  <td className="px-4 py-3 text-right">{agent.avg_duration_ms ? `${(agent.avg_duration_ms / 1000).toFixed(1)}s` : '-'}</td>
                  <td className="px-4 py-3 text-right">{agent.success_rate}%</td>
                  <td className="px-4 py-3 text-right">${agent.total_cost_usd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground">아직 에이전트 데이터가 없습니다.</p>
      )}
    </div>
  );
}
