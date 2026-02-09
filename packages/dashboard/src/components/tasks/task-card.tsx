'use client';

import Link from 'next/link';
import type { Task } from '@claudeops/shared';
import { PriorityBadge } from './priority-badge';
import { Calendar, User } from 'lucide-react';

export function TaskCard({ task, onDragStart }: { task: Task; onDragStart?: (e: React.DragEvent, task: Task) => void }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, task)}
      className="rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/tasks/${task.id}`} className="text-sm font-medium hover:text-primary transition-colors cursor-pointer line-clamp-2">
          {task.title}
        </Link>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.labels && task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <span key={label} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{label}</span>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="text-muted-foreground/60">#{task.id}</span>
        {task.assignee && (
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{task.assignee}</span>
        )}
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
