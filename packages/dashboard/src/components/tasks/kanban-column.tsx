'use client';

import type { Task, TaskStatus } from '@claudeops/shared';
import { TaskCard } from './task-card';

const STATUS_LABELS: Record<string, string> = {
  backlog: '백로그',
  todo: '할 일',
  in_progress: '진행 중',
  review: '리뷰',
  done: '완료',
};

const STATUS_COLORS: Record<string, string> = {
  backlog: 'border-t-gray-400',
  todo: 'border-t-blue-400',
  in_progress: 'border-t-yellow-400',
  review: 'border-t-purple-400',
  done: 'border-t-green-400',
};

export function KanbanColumn({
  status,
  tasks,
  onDragStart,
  onDrop,
  onDragOver,
}: {
  status: TaskStatus;
  tasks: Task[];
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDrop: (e: React.DragEvent, status: TaskStatus) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border border-border bg-muted/30 border-t-2 ${STATUS_COLORS[status] || ''}`}
      onDrop={(e) => onDrop(e, status)}
      onDragOver={onDragOver}
    >
      <div className="flex items-center justify-between p-3 pb-2">
        <h3 className="text-sm font-semibold">{STATUS_LABELS[status] || status}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2 p-2 pt-0 min-h-[200px] overflow-y-auto max-h-[calc(100vh-280px)]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
}
