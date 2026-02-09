'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Task } from '@claudeops/shared';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  backlog: '백로그', todo: '할 일', in_progress: '진행 중', review: '리뷰', done: '완료',
};
const PRIORITY_COLORS: Record<string, string> = {
  P0: 'text-red-400', P1: 'text-orange-400', P2: 'text-yellow-400', P3: 'text-gray-400',
};

export function MemberTaskList({ memberName }: { memberName: string }) {
  const { data } = useQuery({
    queryKey: ['tasks', 'assignee', memberName],
    queryFn: () => apiFetch<{ items: Task[]; total: number }>(`/api/tasks?assignee=${encodeURIComponent(memberName)}`),
  });

  if (!data) return <div className="animate-pulse h-20 rounded-lg bg-muted" />;
  if (data.items.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">할당된 작업이 없습니다.</p>;

  const grouped = data.items.reduce<Record<string, Task[]>>((acc, task) => {
    (acc[task.status] = acc[task.status] || []).push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([status, tasks]) => (
        <div key={status}>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">{STATUS_LABELS[status] ?? status} ({tasks.length})</p>
          <div className="space-y-1">
            {tasks.map((task) => (
              <Link key={task.id} href={`/tasks/${task.id}`}
                className="cursor-pointer flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors">
                <span className={`font-semibold text-xs ${PRIORITY_COLORS[task.priority] ?? ''}`}>{task.priority}</span>
                <span className="flex-1 truncate">{task.title}</span>
                <span className="text-xs text-muted-foreground">{STATUS_LABELS[task.status]}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
