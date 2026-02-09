'use client';

import Link from 'next/link';
import type { Prd } from '@claudeops/shared';
import { FileText } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  backlog: { label: '백로그', className: 'bg-gray-500/10 text-gray-400' },
  active: { label: '활성', className: 'bg-yellow-500/10 text-yellow-400' },
  completed: { label: '완료', className: 'bg-green-500/10 text-green-400' },
  archived: { label: '보관', className: 'bg-gray-500/10 text-gray-400 line-through' },
};

export function PrdCard({ prd }: { prd: Prd }) {
  const statusConfig = STATUS_CONFIG[prd.status] || STATUS_CONFIG.backlog;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link href={`/prds/${prd.id}`} className="text-base font-medium hover:text-primary transition-colors cursor-pointer line-clamp-2 flex-1">
          {prd.title}
        </Link>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
      </div>

      {prd.vision && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{prd.vision}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="text-muted-foreground/60">#{prd.id}</span>
        {prd.epic_count !== undefined && prd.epic_count > 0 && (
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            에픽 {prd.epic_count}개
          </span>
        )}
        {prd.created_at && (
          <span className="ml-auto">{prd.created_at.slice(0, 10)}</span>
        )}
      </div>
    </div>
  );
}
