'use client';

import { useTeams, useTeamWorkload } from '@/lib/hooks/use-teams';
import { Users, Bot, Activity } from 'lucide-react';

export function TeamWorkloadWidget() {
  const { data: teamsData } = useTeams({ status: 'active' });
  const teams = teamsData?.items ?? [];

  if (teams.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Users className="h-5 w-5" /> 팀 워크로드
        </h2>
        <p className="text-sm text-muted-foreground">등록된 팀이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" /> 팀 워크로드
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((team) => (
          <TeamWorkloadCard key={team.id} teamId={team.id} teamName={team.name} teamColor={team.avatar_color} />
        ))}
      </div>
    </div>
  );
}

function TeamWorkloadCard({ teamId, teamName, teamColor }: { teamId: number; teamName: string; teamColor: string }) {
  const { data: workload } = useTeamWorkload(teamId);

  if (!workload) {
    return (
      <div className="rounded-md border border-border p-3 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/2 mb-2" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
    );
  }

  const totalAgentTasks = workload.agents.reduce((sum, a) => sum + a.total_tasks, 0);

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: teamColor ?? '#6366f1' }} />
          <span className="text-sm font-medium">{teamName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="h-3 w-3" />
          <span>{workload.agents.length}개</span>
          <span>/</span>
          <Activity className="h-3 w-3" />
          <span>{workload.active_pipeline_count}개</span>
        </div>
      </div>

      {workload.agents.length > 0 ? (
        <div className="space-y-1">
          {workload.agents.slice(0, 5).map((agent) => (
            <div key={agent.team_agent_id} className="flex items-center gap-2 text-xs">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: teamColor ?? '#6366f1' }}
              >
                <Bot className="h-3 w-3 text-white" />
              </div>
              <span className="flex-1 truncate">{agent.persona_name}</span>
              <span className="text-muted-foreground">{agent.total_tasks}건</span>
            </div>
          ))}
          {workload.agents.length > 5 && (
            <p className="text-xs text-muted-foreground pl-7">+{workload.agents.length - 5}개 더</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">에이전트 없음</p>
      )}

      <div className="mt-2 pt-2 border-t border-border flex justify-between text-xs">
        <span className="text-muted-foreground">총 작업</span>
        <span className="font-medium">{totalAgentTasks}건</span>
      </div>
    </div>
  );
}
