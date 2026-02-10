'use client';

import type { PipelineExecution } from '@claudeops/shared';
import { usePipelineExecutions } from '@/lib/hooks/use-pipeline-execution';
import { CheckCircle2, XCircle, Loader2, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionPanelProps {
  pipelineId: number;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-muted-foreground', label: '대기' },
  running: { icon: Loader2, color: 'text-yellow-500', label: '실행 중' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: '완료' },
  failed: { icon: XCircle, color: 'text-red-500', label: '실패' },
  cancelled: { icon: XCircle, color: 'text-orange-500', label: '취소됨' },
};

export function ExecutionPanel({ pipelineId, onClose }: ExecutionPanelProps) {
  const { data: executions } = usePipelineExecutions(pipelineId);

  const latest = executions?.[0];

  return (
    <div className="w-80 border-l border-border bg-card h-full overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold">실행 상태</h3>
        <button onClick={onClose} className="cursor-pointer p-1 rounded hover:bg-accent transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!latest ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          실행 이력이 없습니다.
        </div>
      ) : (
        <div className="p-3 space-y-3">
          <ExecutionSummary execution={latest} />
          <div className="space-y-2">
            {latest.results.map((stepResult, i) => {
              const config = STATUS_CONFIG[stepResult.status] ?? STATUS_CONFIG.pending;
              const Icon = config.icon;
              return (
                <div key={i} className="rounded-md border border-border p-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={cn('h-3.5 w-3.5', config.color, stepResult.status === 'running' && 'animate-spin')} />
                    <span className="text-xs font-medium">Step {stepResult.step}</span>
                    <span className={cn('text-[10px] ml-auto', config.color)}>{config.label}</span>
                  </div>
                  <div className="space-y-1 ml-5">
                    {stepResult.agents.map((agent, j) => {
                      const ac = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.pending;
                      const AIcon = ac.icon;
                      return (
                        <div key={j} className="flex items-center gap-1.5 text-[11px]">
                          <AIcon className={cn('h-3 w-3', ac.color, agent.status === 'running' && 'animate-spin')} />
                          <span className="text-muted-foreground">{agent.type}</span>
                          {agent.error && (
                            <span className="text-red-400 truncate ml-auto max-w-[120px]" title={agent.error}>
                              {agent.error}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ExecutionSummary({ execution }: { execution: PipelineExecution }) {
  const config = STATUS_CONFIG[execution.status] ?? STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', config.color, execution.status === 'running' && 'animate-spin')} />
        <span className="text-sm font-medium">{config.label}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {execution.current_step}/{execution.total_steps} 단계
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(execution.current_step / execution.total_steps) * 100}%` }}
        />
      </div>
    </div>
  );
}
