'use client';

import { useState } from 'react';
import { useTeams, useMembers, useDeleteTeam, useRemoveMember, useMemberWorkload, useTeamWorkload } from '@/lib/hooks/use-teams';
import { TeamCard } from '@/components/teams/team-card';
import { TeamCreateDialog } from '@/components/teams/team-create-dialog';
import { MemberCreateDialog } from '@/components/teams/member-create-dialog';
import { MemberList } from '@/components/teams/member-list';
import { MemberAvatar } from '@/components/teams/member-avatar';
import { WorkloadStats } from '@/components/teams/workload-stats';
import { WorkloadHeatmap } from '@/components/teams/workload-heatmap';
import { MemberTaskList } from '@/components/teams/member-task-list';
import { Plus, Users } from 'lucide-react';
import type { TeamMember } from '@claudeops/shared';

export default function TeamsPage() {
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [createMemberOpen, setCreateMemberOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const { data: teamsData } = useTeams();
  const selectedTeam = teamsData?.items.find(t => t.id === selectedTeamId);
  const { data: membersData } = useMembers(selectedTeamId ?? undefined);
  const { data: memberWorkload } = useMemberWorkload(selectedMember?.id ?? 0);
  const { data: teamWorkload } = useTeamWorkload(selectedTeamId ?? 0);
  const deleteTeam = useDeleteTeam();
  const removeMember = useRemoveMember();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">팀 & 멤버</h1>
          <p className="text-sm text-muted-foreground mt-1">팀 구성과 워크로드를 관리합니다</p>
        </div>
        <button onClick={() => setCreateTeamOpen(true)}
          className="cursor-pointer flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> 팀 생성
        </button>
      </div>

      {/* Team Cards */}
      {!teamsData ? (
        <div className="flex gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 w-60 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : teamsData.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>아직 팀이 없습니다. 첫 번째 팀을 만들어보세요.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {teamsData.items.map((team) => (
            <div key={team.id} className="shrink-0 w-60">
              <TeamCard
                team={team}
                selected={selectedTeamId === team.id}
                onClick={() => { setSelectedTeamId(team.id); setSelectedMember(null); }}
                onDelete={() => { if (confirm(`"${team.name}" 팀을 삭제하시겠습니까?`)) deleteTeam.mutate(team.id); }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      {selectedTeam && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Member List */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">멤버 ({membersData?.total ?? 0})</h2>
              <button onClick={() => setCreateMemberOpen(true)}
                className="cursor-pointer rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors">
                + 추가
              </button>
            </div>
            {membersData && (
              <MemberList
                members={membersData.items}
                teamColor={selectedTeam.avatar_color}
                selectedId={selectedMember?.id}
                onSelect={(m) => setSelectedMember(m)}
                onRemove={(id) => { if (confirm('이 멤버를 삭제하시겠습니까?')) { removeMember.mutate(id); if (selectedMember?.id === id) setSelectedMember(null); } }}
              />
            )}
          </div>

          {/* Right: Workload & Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {selectedMember ? (
              <>
                <div className="flex items-center gap-3">
                  <MemberAvatar name={selectedMember.name} color={selectedTeam.avatar_color} size="lg" />
                  <div>
                    <h2 className="text-lg font-semibold">{selectedMember.name}</h2>
                    <div className="flex gap-2 mt-0.5">
                      {selectedMember.specialties?.map((s) => (
                        <span key={s} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {memberWorkload && <WorkloadStats workload={memberWorkload} />}
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold mb-3">할당된 작업</h3>
                  <MemberTaskList memberName={selectedMember.name} />
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">멤버를 선택하면 워크로드와 작업을 확인할 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Heatmap */}
      {teamWorkload && teamWorkload.members.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">팀 워크로드 히트맵</h2>
          <WorkloadHeatmap workload={teamWorkload} />
        </div>
      )}

      <TeamCreateDialog open={createTeamOpen} onClose={() => setCreateTeamOpen(false)} />
      {selectedTeamId && <MemberCreateDialog open={createMemberOpen} onClose={() => setCreateMemberOpen(false)} teamId={selectedTeamId} />}
    </div>
  );
}
