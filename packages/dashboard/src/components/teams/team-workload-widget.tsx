'use client';

import { useTeams, useMembers } from '@/lib/hooks/use-teams';
import { MemberAvatar } from '@/components/teams/member-avatar';
import { Users } from 'lucide-react';

export function TeamWorkloadWidget() {
  const { data: teamsData } = useTeams();
  const { data: membersData } = useMembers();

  const teams = teamsData?.items ?? [];
  const members = membersData?.items ?? [];

  if (teams.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><Users className="h-5 w-5" /> 팀 워크로드</h2>
        <p className="text-sm text-muted-foreground">등록된 팀이 없습니다</p>
      </div>
    );
  }

  const totalActive = members.reduce((sum, m) => sum + (m.active_task_count ?? 0), 0);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> 팀 워크로드</h2>
        <span className="text-xs text-muted-foreground">활성 작업 {totalActive}개</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((team) => {
          const teamMembers = members.filter((m) => m.team_id === team.id);
          const teamActiveCount = teamMembers.reduce((sum, m) => sum + (m.active_task_count ?? 0), 0);
          return (
            <div key={team.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.avatar_color ?? '#6366f1' }} />
                  <span className="text-sm font-medium">{team.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{teamMembers.length}명 / {teamActiveCount}건</span>
              </div>
              {teamMembers.length > 0 ? (
                <div className="space-y-1">
                  {teamMembers.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center gap-2 text-xs">
                      <MemberAvatar name={member.name} size="sm" />
                      <span className="flex-1 truncate">{member.name}</span>
                      <span className="text-muted-foreground">{member.active_task_count ?? 0}건</span>
                    </div>
                  ))}
                  {teamMembers.length > 5 && (
                    <p className="text-xs text-muted-foreground pl-8">+{teamMembers.length - 5}명 더</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">멤버 없음</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
