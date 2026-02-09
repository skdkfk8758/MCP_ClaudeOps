'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { FlowEvent } from '@claudeops/shared';
import { formatDate } from '@claudeops/shared';

interface EventListResponse { total: number; items: FlowEvent[] }

export default function EventsPage() {
  const { data } = useQuery({
    queryKey: ['events', 'list'],
    queryFn: () => apiFetch<EventListResponse>('/api/events?page_size=100'),
    refetchInterval: 5_000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">실시간 이벤트</h1>
      <div className="rounded-lg border border-border bg-card">
        <div className="max-h-[70vh] overflow-y-auto">
          {data?.items.map((event, i) => (
            <div key={event.id ?? i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0 text-sm">
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">{event.event_type}</span>
              <span className="text-muted-foreground truncate">{event.session_id.slice(0, 8)}...</span>
              <span className="ml-auto text-xs text-muted-foreground">{event.timestamp ? formatDate(event.timestamp) : ''}</span>
            </div>
          ))}
          {(!data || data.items.length === 0) && (
            <div className="px-4 py-8 text-center text-muted-foreground">아직 이벤트가 없습니다. Claude Code 세션을 시작하면 실시간 이벤트가 표시됩니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
