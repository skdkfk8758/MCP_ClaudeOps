'use client';

import type { TeamWorkload } from '@claudeops/shared';

const STATUS_LABELS: Record<string, string> = {
  backlog: '백로그', todo: '할일', in_progress: '진행중', review: '리뷰', done: '완료',
};
const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];

export function WorkloadHeatmap({ workload }: { workload: TeamWorkload }) {
  const maxVal = Math.max(1, ...workload.members.flatMap(m => STATUSES.map(s => m.by_status[s] ?? 0)));

  const getIntensity = (value: number) => {
    if (value === 0) return 'bg-muted/30';
    const ratio = value / maxVal;
    if (ratio <= 0.25) return 'bg-primary/20';
    if (ratio <= 0.5) return 'bg-primary/40';
    if (ratio <= 0.75) return 'bg-primary/60';
    return 'bg-primary/90';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-32">멤버</th>
            {STATUSES.map((s) => (
              <th key={s} className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">{STATUS_LABELS[s]}</th>
            ))}
            <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">합계</th>
          </tr>
        </thead>
        <tbody>
          {workload.members.map((m) => (
            <tr key={m.member_id} className="border-t border-border">
              <td className="py-2 px-3 font-medium text-sm">{m.member_name}</td>
              {STATUSES.map((s) => {
                const val = m.by_status[s] ?? 0;
                return (
                  <td key={s} className="py-2 px-2 text-center">
                    <span className={`inline-block w-8 h-8 rounded-md ${getIntensity(val)} flex items-center justify-center text-xs font-semibold mx-auto`}>
                      {val > 0 ? val : ''}
                    </span>
                  </td>
                );
              })}
              <td className="py-2 px-2 text-center font-semibold">{m.total_tasks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
