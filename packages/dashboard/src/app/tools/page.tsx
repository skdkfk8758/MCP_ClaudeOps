'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ToolStats } from '@claudeops/shared';

export default function ToolsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'tool-stats'],
    queryFn: () => apiFetch<ToolStats[]>('/api/analytics/tool-stats'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">도구 분석</h1>
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      ) : data && data.length > 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">도구</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">호출 수</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">평균 소요 시간</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">성공률</th>
              </tr>
            </thead>
            <tbody>
              {data.map((tool) => (
                <tr key={tool.tool_name} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{tool.tool_name}</td>
                  <td className="px-4 py-3 text-right">{tool.call_count}</td>
                  <td className="px-4 py-3 text-right">{tool.avg_duration_ms ? `${(tool.avg_duration_ms / 1000).toFixed(1)}s` : '-'}</td>
                  <td className="px-4 py-3 text-right">{tool.success_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted-foreground">아직 도구 데이터가 없습니다.</p>
      )}
    </div>
  );
}
