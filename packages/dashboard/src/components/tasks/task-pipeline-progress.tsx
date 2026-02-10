'use client';

import { usePipelineExecution } from '@/lib/hooks/use-pipeline-execution';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { PipelineStepResult } from '@claudeops/shared';

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-500',
  running: 'bg-yellow-500 animate-pulse',
  failed: 'bg-red-500',
  pending: 'bg-muted',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  completed: <CheckCircle className="h-3 w-3 text-green-500" />,
  running: <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />,
  failed: <XCircle className="h-3 w-3 text-red-500" />,
  pending: <Clock className="h-3 w-3 text-muted-foreground" />,
};

function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = Math.round(seconds % 60);
  return `${minutes}m ${remainingSec}s`;
}

function getStepDuration(step: PipelineStepResult): number | null {
  const started = step.agents.find(a => a.started_at)?.started_at;
  const completed = step.agents
    .filter(a => a.completed_at)
    .map(a => a.completed_at!)
    .sort()
    .pop();
  if (!started || !completed) return null;
  return new Date(completed).getTime() - new Date(started).getTime();
}

export function TaskPipelineProgress({ executionId }: { executionId: number }) {
  const { data: execution } = usePipelineExecution(executionId);

  if (!execution) return null;

  const results = (execution.results ?? []) as PipelineStepResult[];
  const totalSteps = results.length;
  const completedSteps = results.filter(r => r.status === 'completed').length;
  const currentStep = results.findIndex(r => r.status === 'running') + 1;
  const isRunning = execution.status === 'running';

  // 전체 소요시간 계산
  const totalDuration = execution.started_at
    ? (execution.completed_at ? new Date(execution.completed_at).getTime() : Date.now()) - new Date(execution.started_at).getTime()
    : null;

  return (
    <div className="space-y-3">
      {/* 상태 텍스트 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-500" />
              <span className="text-yellow-500 font-medium">Step {currentStep}/{totalSteps} 실행 중</span>
            </>
          ) : execution.status === 'completed' ? (
            <>
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-500 font-medium">전체 완료</span>
            </>
          ) : execution.status === 'failed' || execution.status === 'cancelled' ? (
            <>
              <XCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-red-500 font-medium">{execution.status === 'cancelled' ? '취소됨' : '실패'}</span>
            </>
          ) : (
            <span className="text-muted-foreground">대기 중</span>
          )}
        </div>
        {totalDuration != null && (
          <span className="text-xs text-muted-foreground">{formatDurationMs(totalDuration)}</span>
        )}
      </div>

      {/* 세그먼트 진행률 바 */}
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted">
        {results.map((step, i) => (
          <div
            key={i}
            className={`relative flex-1 ${STATUS_COLORS[step.status] || 'bg-muted'} transition-colors duration-300 group`}
            title={`Step ${i + 1}: ${step.agents.map(a => a.type).join(', ')}`}
          >
            {/* 호버 툴팁 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="rounded-md bg-popover border border-border px-3 py-2 text-xs shadow-lg whitespace-nowrap">
                <div className="flex items-center gap-1.5 mb-1">
                  {STATUS_ICONS[step.status]}
                  <span className="font-medium">Step {i + 1}</span>
                </div>
                {step.agents.map((agent, j) => (
                  <div key={j} className="text-muted-foreground">
                    {agent.type} ({agent.status})
                  </div>
                ))}
                {getStepDuration(step) != null && (
                  <div className="text-muted-foreground mt-1">
                    소요: {formatDurationMs(getStepDuration(step))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 스텝 요약 */}
      <div className="text-xs text-muted-foreground">
        {completedSteps}/{totalSteps} 스텝 완료
      </div>
    </div>
  );
}
