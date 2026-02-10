'use client';

import Link from 'next/link';
import type { Task } from '@claudeops/shared';
import { ExternalLink } from 'lucide-react';
import { usePipelineExecutions } from '@/lib/hooks/use-pipeline-execution';
import { TaskPipelineProgress } from '@/components/tasks/task-pipeline-progress';

export function TaskPipelineMiniView({ task }: { task: Task }) {
  if (!task.pipeline_id) return null;

  const { data: executions } = usePipelineExecutions(task.pipeline_id);

  // 최근 실행 (가장 마지막)
  const latestExecution = executions?.[0];

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">연결된 파이프라인</h3>
        <Link
          href={`/pipelines/${task.pipeline_id}`}
          className="cursor-pointer flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          편집 <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {latestExecution ? (
        <TaskPipelineProgress executionId={latestExecution.id} />
      ) : (
        <div className="rounded-md bg-muted/50 p-3 text-center text-sm text-muted-foreground">
          파이프라인 #{task.pipeline_id}
        </div>
      )}
    </div>
  );
}
