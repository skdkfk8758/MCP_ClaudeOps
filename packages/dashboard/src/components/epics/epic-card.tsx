'use client';

import Link from 'next/link';
import type { Epic } from '@claudeops/shared';
import { EpicProgress } from './epic-progress';
import { CheckCircle2, Clock } from 'lucide-react';
import { GitHubSyncButton } from '@/components/github/sync-button';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  backlog: { label: '백로그', className: 'bg-gray-500/10 text-gray-400' },
  planning: { label: '계획 중', className: 'bg-blue-500/10 text-blue-400' },
  in_progress: { label: '진행 중', className: 'bg-yellow-500/10 text-yellow-400' },
  completed: { label: '완료', className: 'bg-green-500/10 text-green-400' },
};

export function EpicCard({ epic }: { epic: Epic }) {
  const statusConfig = STATUS_CONFIG[epic.status] || STATUS_CONFIG.backlog;
  const progress = epic.task_count ? Math.round(((epic.completed_count || 0) / epic.task_count) * 100) : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link href={`/epics/${epic.id}`} className="text-base font-medium hover:text-primary transition-colors cursor-pointer line-clamp-2 flex-1">
          {epic.title}
        </Link>
        <div className="flex items-center gap-2">
          <GitHubSyncButton type="epic" id={epic.id} githubUrl={epic.github_issue_url} />
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>진행률</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <EpicProgress progress={progress} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="text-muted-foreground/60">#{epic.id}</span>
        {epic.task_count !== undefined && (
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {epic.completed_count || 0}/{epic.task_count}
          </span>
        )}
        {epic.estimated_effort && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {epic.estimated_effort}
          </span>
        )}
      </div>
    </div>
  );
}
