'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Session, FlowEvent, AgentExecution } from '@claudeops/shared';
import { formatDate, formatDuration } from '@claudeops/shared';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: session } = useQuery({
    queryKey: ['sessions', id],
    queryFn: () => apiFetch<Session>(`/api/sessions/${id}`),
  });

  const { data: events } = useQuery({
    queryKey: ['sessions', id, 'events'],
    queryFn: () => apiFetch<FlowEvent[]>(`/api/sessions/${id}/events`),
  });

  const { data: agents } = useQuery({
    queryKey: ['sessions', id, 'agents'],
    queryFn: () => apiFetch<AgentExecution[]>(`/api/sessions/${id}/agents`),
  });

  if (!session) return <div className="animate-pulse h-64 rounded-lg bg-muted" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sessions" className="cursor-pointer hover:bg-accent rounded-md p-1 transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold">세션 {session.id.slice(0, 8)}...</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          session.status === 'active' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'
        }`}>{session.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">시작 시간</p>
          <p className="font-medium">{formatDate(session.start_time)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">토큰</p>
          <p className="font-medium">{(session.token_input + session.token_output).toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">비용</p>
          <p className="font-medium">${session.cost_usd.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">에이전트</p>
          <p className="font-medium">{agents?.length ?? 0}</p>
        </div>
      </div>

      {agents && agents.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">에이전트</h2>
          <div className="space-y-2">
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <span className="font-medium">{agent.agent_type}</span>
                  <span className="ml-2 text-xs text-muted-foreground capitalize">{agent.model}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {agent.duration_ms && <span className="text-muted-foreground">{formatDuration(agent.duration_ms)}</span>}
                  <span className={agent.status === 'completed' ? 'text-success' : agent.status === 'failed' ? 'text-destructive' : 'text-warning'}>{agent.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">이벤트 타임라인 ({events.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, i) => (
              <div key={event.id ?? i} className="flex items-start gap-3 rounded-md border border-border p-3 text-sm">
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{event.event_type}</span>
                <span className="text-muted-foreground">{event.timestamp ? formatDate(event.timestamp) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
