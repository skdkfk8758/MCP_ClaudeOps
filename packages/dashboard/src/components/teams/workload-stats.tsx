'use client';

import type { AgentWorkload } from '@claudeops/shared';
import { ClipboardList, PlayCircle, CheckCircle, Clock, Cpu } from 'lucide-react';

export function WorkloadStats({ workload }: { workload: AgentWorkload }) {
  const stats = [
    { label: '총 작업', value: workload.total_tasks, icon: ClipboardList, color: 'text-blue-400' },
    { label: '진행 중', value: (workload.by_status?.design ?? 0) + (workload.by_status?.implementation ?? 0), icon: PlayCircle, color: 'text-yellow-400' },
    { label: '완료', value: workload.by_status?.done ?? 0, icon: CheckCircle, color: 'text-green-400' },
    { label: '대기', value: (workload.by_status?.backlog ?? 0) + (workload.by_status?.todo ?? 0), icon: Clock, color: 'text-gray-400' },
    { label: '실행 중', value: workload.active_executions, icon: Cpu, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-3">
      {/* Agent Info */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="text-muted-foreground">페르소나</p>
            <p className="font-medium mt-0.5">{workload.persona_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">에이전트 타입</p>
            <p className="font-medium mt-0.5">{workload.agent_type}</p>
          </div>
          <div>
            <p className="text-muted-foreground">역할</p>
            <p className="font-medium mt-0.5">{workload.role}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-3">
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
    </div>
  );
}
