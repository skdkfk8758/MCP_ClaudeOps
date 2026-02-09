'use client';

import { useTaskStats } from '@/lib/hooks/use-tasks';
import { ClipboardList } from 'lucide-react';
import Link from 'next/link';

export function TaskStatsWidget() {
  const { data: stats } = useTaskStats();
  if (!stats || stats.total === 0) return null;

  return (
    <Link href="/tasks" className="block cursor-pointer">
      <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">작업 현황</h2>
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-5 gap-2 text-center">
          {(['backlog', 'todo', 'in_progress', 'review', 'done'] as const).map((status) => {
            const labels: Record<string, string> = { backlog: '백로그', todo: '할 일', in_progress: '진행 중', review: '리뷰', done: '완료' };
            const colors: Record<string, string> = { backlog: 'text-gray-400', todo: 'text-blue-400', in_progress: 'text-yellow-400', review: 'text-purple-400', done: 'text-green-400' };
            return (
              <div key={status}>
                <p className={`text-xl font-bold ${colors[status]}`}>{stats.by_status[status] ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">{labels[status]}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>총 {stats.total}개</span>
          <span>완료율 {stats.completion_rate}%</span>
        </div>
      </div>
    </Link>
  );
}
