'use client';

import type { Pipeline } from '@claudeops/shared';
import Link from 'next/link';
import { Layers, Play, CheckCircle2, XCircle, FileEdit, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineCardProps {
  pipeline: Pipeline;
}

const STATUS_CONFIG: Record<string, { icon: typeof Play; color: string; label: string; bg: string }> = {
  draft: { icon: FileEdit, color: 'text-muted-foreground', label: '초안', bg: 'bg-muted' },
  ready: { icon: Clock, color: 'text-blue-500', label: '준비됨', bg: 'bg-blue-500/10' },
  running: { icon: Play, color: 'text-yellow-500', label: '실행 중', bg: 'bg-yellow-500/10' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: '완료', bg: 'bg-green-500/10' },
  failed: { icon: XCircle, color: 'text-red-500', label: '실패', bg: 'bg-red-500/10' },
};

export function PipelineCard({ pipeline }: PipelineCardProps) {
  const config = STATUS_CONFIG[pipeline.status] ?? STATUS_CONFIG.draft;
  const Icon = config.icon;
  const totalAgents = pipeline.steps.reduce((sum, s) => sum + s.agents.length, 0);

  return (
    <Link
      href={`/pipelines/${pipeline.id}`}
      className="cursor-pointer block rounded-lg border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{pipeline.name}</h3>
        </div>
        <span className={cn('flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full', config.bg, config.color)}>
          <Icon className="h-3 w-3" />
          {config.label}
        </span>
      </div>

      {pipeline.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{pipeline.description}</p>
      )}

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>{pipeline.steps.length}단계</span>
        <span>&middot;</span>
        <span>{totalAgents}개 에이전트</span>
        {pipeline.epic_id && (
          <>
            <span>&middot;</span>
            <span className="text-primary">Epic #{pipeline.epic_id}</span>
          </>
        )}
      </div>
    </Link>
  );
}
