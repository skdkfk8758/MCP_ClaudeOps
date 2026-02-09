'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import type { Session } from '@claudeops/shared';
import { formatDate } from '@claudeops/shared';

interface SessionListResponse {
  total: number; page: number; page_size: number; pages: number; items: Session[];
}

export default function SessionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sessions', 'list'],
    queryFn: () => apiFetch<SessionListResponse>('/api/sessions?page_size=50'),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">세션</h1>
      {isLoading ? (
        <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">상태</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">시작 시간</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">토큰</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">비용</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((session) => (
                <tr key={session.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/sessions/${session.id}`} className="text-primary hover:underline cursor-pointer">
                      {session.id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      session.status === 'active' ? 'bg-success/10 text-success' :
                      session.status === 'completed' ? 'bg-info/10 text-info' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(session.start_time)}</td>
                  <td className="px-4 py-3 text-right">{(session.token_input + session.token_output).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">${session.cost_usd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.total > 0 && (
            <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
              전체 {data.total}개 중 {data.items.length}개 표시
            </div>
          )}
        </div>
      )}
    </div>
  );
}
