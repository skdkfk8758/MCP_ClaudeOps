'use client';

import { useState } from 'react';
import { useTeams, useDeleteTeam, useTeamAgents, useRemoveAgentFromTeam, useTeamWorkload } from '@/lib/hooks/use-teams';
import { TeamCard } from '@/components/teams/team-card';
import { TeamCreateDialog } from '@/components/teams/team-create-dialog';
import { MemberCreateDialog } from '@/components/teams/member-create-dialog';
import { MemberList } from '@/components/teams/member-list';
import { WorkloadStats } from '@/components/teams/workload-stats';
import { WorkloadHeatmap } from '@/components/teams/workload-heatmap';
import { Plus, Users, Bot } from 'lucide-react';
import type { TeamAgent } from '@claudeops/shared';

export default function TeamsPage() {
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [createAgentOpen, setCreateAgentOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<TeamAgent | null>(null);

  const { data: teamsData } = useTeams();
  const selectedTeam = teamsData?.items.find(t => t.id === selectedTeamId);
  const { data: teamAgents } = useTeamAgents(selectedTeamId ?? 0);
  const { data: teamWorkload } = useTeamWorkload(selectedTeamId ?? 0);
  const deleteTeam = useDeleteTeam();
  const removeAgent = useRemoveAgentFromTeam();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">팀 & 에이전트</h1>
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
                onClick={() => { setSelectedTeamId(team.id); setSelectedAgent(null); }}
                onDelete={() => { if (confirm(`"${team.name}" 팀을 삭제하시겠습니까?`)) deleteTeam.mutate(team.id); }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      {selectedTeam && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Agent List */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">에이전트 ({teamAgents?.length ?? 0})</h2>
              <button onClick={() => setCreateAgentOpen(true)}
                className="cursor-pointer rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 transition-colors">
                + 추가
              </button>
            </div>
            {teamAgents && selectedTeamId && (
              <MemberList
                teamId={selectedTeamId}
                agents={teamAgents}
                teamColor={selectedTeam.avatar_color}
                selectedId={selectedAgent?.id}
                onSelect={(a) => setSelectedAgent(a)}
                onRemove={(id) => { if (confirm('이 에이전트를 삭제하시겠습니까?')) { removeAgent.mutate(id); if (selectedAgent?.id === id) setSelectedAgent(null); } }}
              />
            )}
          </div>

          {/* Right: Workload & Stats */}
          <div className="lg:col-span-2 space-y-6">
            {selectedAgent?.persona ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedAgent.persona.color ?? '#6366f1' }}>
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{selectedAgent.persona.name}</h2>
                    <div className="flex gap-2 mt-0.5">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{selectedAgent.persona.model}</span>
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-600">{selectedAgent.role}</span>
                      <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-600">{selectedAgent.persona.category}</span>
                    </div>
                  </div>
                </div>
                {teamWorkload && (
                  <WorkloadStats
                    workload={teamWorkload.agents.find(a => a.team_agent_id === selectedAgent.id) ?? {
                      team_agent_id: selectedAgent.id,
                      persona_name: selectedAgent.persona.name,
                      agent_type: selectedAgent.persona.agent_type,
                      team_name: selectedTeam.name,
                      role: selectedAgent.role,
                      total_tasks: 0,
                      by_status: {},
                      active_executions: 0,
                    }}
                  />
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">에이전트를 선택하면 워크로드와 작업을 확인할 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Heatmap */}
      {teamWorkload && teamWorkload.agents.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">팀 워크로드 히트맵</h2>
          <WorkloadHeatmap workload={teamWorkload} />
        </div>
      )}

      <TeamCreateDialog open={createTeamOpen} onClose={() => setCreateTeamOpen(false)} />
      {selectedTeamId && <MemberCreateDialog open={createAgentOpen} onClose={() => setCreateAgentOpen(false)} teamId={selectedTeamId} />}
    </div>
  );
}
