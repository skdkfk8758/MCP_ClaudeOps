'use client';

import { useState } from 'react';
import { useTaskExecutionLogs } from '@/lib/hooks/use-tasks';
import { ExecutionLogFilters } from '@/components/tasks/execution-log-filters';
import { Loader2, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { Task, TaskExecutionLog as LogEntry, TaskExecutionLogFilter } from '@claudeops/shared';

const STATUS_ICON: Record<string, React.ReactNode> = {
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />,
  completed: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-500" />,
};

const PHASE_LABELS: Record<string, string> = {
  design: '설계',
  implementation: '구현',
  verification: '검증',
};

function LogItem({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!(log.output_summary || log.input_prompt || log.error);

  return (
    <div className="border border-border rounded-md">
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full flex items-start gap-3 px-3 py-2 text-sm transition-colors ${hasDetails ? 'cursor-pointer hover:bg-accent/50' : ''}`}
      >
        <div className="pt-0.5 shrink-0">
          {STATUS_ICON[log.status] || <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{PHASE_LABELS[log.phase] || log.phase}</span>
            {log.step_number != null && <span className="text-xs text-muted-foreground">Step {log.step_number}</span>}
            {log.agent_type && <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.agent_type}</span>}
            {log.model && <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.model}</span>}
          </div>
          {log.output_summary && !expanded && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{log.output_summary}</p>
          )}
          {log.error && !expanded && (
            <p className="text-xs text-destructive mt-1 line-clamp-2">{log.error}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {log.duration_ms != null && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">{(log.duration_ms / 1000).toFixed(1)}s</span>
          )}
          {hasDetails && (expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-3 py-2 space-y-2 bg-muted/30">
          {log.output_summary && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">결과 요약</p>
              <p className="text-xs whitespace-pre-wrap">{log.output_summary}</p>
            </div>
          )}
          {log.input_prompt && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">입력 프롬프트</p>
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">{log.input_prompt.slice(0, 2000)}{log.input_prompt.length > 2000 ? '...' : ''}</pre>
            </div>
          )}
          {log.error && (
            <div>
              <p className="text-xs font-medium text-destructive mb-1">에러</p>
              <pre className="text-xs bg-red-500/10 rounded p-2 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap text-destructive">{log.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskExecutionLog({ task }: { task: Task }) {
  const [filters, setFilters] = useState<TaskExecutionLogFilter>({});
  const { data } = useTaskExecutionLogs(task.id, filters);

  if (!data || (data.items.length === 0 && Object.keys(filters).length === 0)) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">실행 로그</h3>
          {data.total > 0 && <span className="text-xs text-muted-foreground">({data.total}건)</span>}
        </div>
      </div>

      <ExecutionLogFilters filters={filters} onChange={setFilters} />

      <div className="space-y-2">
        {data.items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">필터와 일치하는 로그가 없습니다.</p>
        ) : (
          data.items.map((log) => <LogItem key={log.id} log={log} />)
        )}
      </div>

      {/* 페이지네이션 */}
      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="text-xs text-muted-foreground">
            {data.page}/{data.pages} 페이지
          </span>
        </div>
      )}
    </div>
  );
}
