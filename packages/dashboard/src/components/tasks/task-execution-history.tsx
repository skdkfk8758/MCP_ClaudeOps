'use client';

import { useState } from 'react';
import { useTaskExecutionGroups, useTaskExecutionLogs } from '@/lib/hooks/use-tasks';
import { CheckCircle, XCircle, Loader2, Clock, ChevronDown, ChevronUp, History } from 'lucide-react';
import type { Task, TaskExecutionLogFilter } from '@claudeops/shared';

const STATUS_ICON: Record<string, React.ReactNode> = {
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />,
  completed: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
};

const PHASE_LABELS: Record<string, string> = {
  design: '설계',
  implementation: '구현',
  verification: '검증',
};

function formatDuration(ms: number | null): string {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function ExecutionGroupLogs({ taskId, executionId }: { taskId: number; executionId: number }) {
  const filters: TaskExecutionLogFilter = { execution_id: executionId };
  const { data } = useTaskExecutionLogs(taskId, filters);

  if (!data || data.items.length === 0) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">로그 없음</p>;
  }

  return (
    <div className="space-y-1 px-3 py-2">
      {data.items.map((log) => (
        <div key={log.id} className="flex items-center gap-2 text-xs">
          {STATUS_ICON[log.status] || <Clock className="h-3 w-3 text-muted-foreground" />}
          <span className="font-medium">{PHASE_LABELS[log.phase] || log.phase}</span>
          {log.step_number != null && <span className="text-muted-foreground">Step {log.step_number}</span>}
          {log.agent_type && <span className="rounded bg-muted px-1 py-0.5">{log.agent_type}</span>}
          {log.model && <span className="rounded bg-muted px-1 py-0.5">{log.model}</span>}
          <span className="ml-auto text-muted-foreground">{formatDuration(log.duration_ms)}</span>
        </div>
      ))}
    </div>
  );
}

export function TaskExecutionHistory({ task }: { task: Task }) {
  const { data: groups } = useTaskExecutionGroups(task.id);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!groups || groups.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground">실행 이력</h3>
        <span className="text-xs text-muted-foreground">({groups.length}건)</span>
      </div>

      <div className="space-y-2">
        {groups.map((group) => {
          const key = `${group.execution_id}-${group.phase}`;
          const isExpanded = expandedId === key;

          return (
            <div key={key} className="border border-border rounded-md">
              <button
                onClick={() => setExpandedId(isExpanded ? null : key)}
                className="cursor-pointer w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
              >
                {STATUS_ICON[group.status] || <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="font-medium">{PHASE_LABELS[group.phase] || group.phase}</span>
                <span className="text-xs text-muted-foreground">#{group.execution_id}</span>
                <span className="text-xs text-muted-foreground">{group.log_count}개 로그</span>
                {group.duration_ms != null && (
                  <span className="text-xs text-muted-foreground">{formatDuration(group.duration_ms)}</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">{timeAgo(group.started_at)}</span>
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {isExpanded && (
                <div className="border-t border-border bg-muted/30">
                  <ExecutionGroupLogs taskId={task.id} executionId={group.execution_id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
