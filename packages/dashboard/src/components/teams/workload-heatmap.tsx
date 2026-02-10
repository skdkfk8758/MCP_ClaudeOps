'use client';

import type { TeamWorkload } from '@claudeops/shared';
import { Bot } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  backlog: '백로그', todo: '할일', design: '설계', implementation: '구현', review: '리뷰', done: '완료',
};
const STATUSES = ['backlog', 'todo', 'design', 'implementation', 'review', 'done'];

export function WorkloadHeatmap({ workload }: { workload: TeamWorkload }) {
  const maxVal = Math.max(1, ...workload.agents.flatMap(a => STATUSES.map(s => a.by_status[s] ?? 0)));

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
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-40">에이전트</th>
            {STATUSES.map((s) => (
              <th key={s} className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">{STATUS_LABELS[s]}</th>
            ))}
            <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">합계</th>
          </tr>
        </thead>
        <tbody>
          {workload.agents.map((agent) => (
            <tr key={agent.team_agent_id} className="border-t border-border">
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{agent.persona_name}</p>
                    <p className="text-xs text-muted-foreground">{agent.role}</p>
                  </div>
                </div>
              </td>
              {STATUSES.map((s) => {
                const val = agent.by_status[s] ?? 0;
                return (
                  <td key={s} className="py-2 px-2 text-center">
                    <span className={`inline-block w-8 h-8 rounded-md ${getIntensity(val)} flex items-center justify-center text-xs font-semibold mx-auto`}>
                      {val > 0 ? val : ''}
                    </span>
                  </td>
                );
              })}
              <td className="py-2 px-2 text-center font-semibold">{agent.total_tasks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
