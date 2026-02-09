'use client';

import type { MemberWorkload } from '@claudeops/shared';
import { ClipboardList, PlayCircle, CheckCircle, Clock } from 'lucide-react';

export function WorkloadStats({ workload }: { workload: MemberWorkload }) {
  const stats = [
    { label: '총 작업', value: workload.total_tasks, icon: ClipboardList, color: 'text-blue-400' },
    { label: '진행 중', value: workload.by_status?.in_progress ?? 0, icon: PlayCircle, color: 'text-yellow-400' },
    { label: '완료', value: workload.by_status?.done ?? 0, icon: CheckCircle, color: 'text-green-400' },
    { label: '대기', value: (workload.by_status?.backlog ?? 0) + (workload.by_status?.todo ?? 0), icon: Clock, color: 'text-gray-400' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <Icon className={`h-4 w-4 mx-auto ${s.color}`} />
            <p className="text-xl font-bold mt-1">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}
