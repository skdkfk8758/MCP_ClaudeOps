'use client';

import Link from 'next/link';
import type { Task } from '@claudeops/shared';
import { PriorityBadge } from './priority-badge';
import { MemberAvatar } from '@/components/teams/member-avatar';
import { Calendar, User } from 'lucide-react';

export function TaskCard({ task, onDragStart }: { task: Task; onDragStart?: (e: React.DragEvent, task: Task) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, task)}
      className="rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/tasks/${task.id}`} className="text-sm font-medium hover:text-primary transition-colors cursor-pointer line-clamp-2 flex-1">
          {task.title}
        </Link>
        <div className="flex items-center gap-1">
          {task.github_issue_url && (
            <a
              href={task.github_issue_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              title="GitHub Issue 열기"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          )}
          <PriorityBadge priority={task.priority} />
        </div>
      </div>
      {task.epic_title && (
        <div className="mt-1">
          <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400">에픽: {task.epic_title}</span>
        </div>
      )}
      {task.labels && task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span key={label} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{label}</span>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="text-muted-foreground/60">#{task.id}</span>
        {task.assignees && task.assignees.length > 0 ? (
          <span className="flex items-center -space-x-1.5">
            {task.assignees.slice(0, 3).map((a) => (
              <MemberAvatar key={a.id} name={a.name} size="sm" />
            ))}
            {task.assignees.length > 3 && (
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-[10px] font-medium text-muted-foreground border border-background">
                +{task.assignees.length - 3}
              </span>
            )}
          </span>
        ) : task.assignee ? (
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{task.assignee}</span>
        ) : null}
        {task.due_date && (
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{task.due_date.slice(0, 10)}</span>
        )}
        {task.estimated_effort && (
          <span className="rounded bg-muted px-1 py-0.5 text-[10px]">{task.estimated_effort}</span>
        )}
      </div>
    </div>
  );
}
