'use client';

import type { Team } from '@claudeops/shared';
import { Users, Trash2 } from 'lucide-react';

export function TeamCard({ team, selected, onClick, onDelete }: {
  team: Team; selected?: boolean; onClick: () => void; onDelete: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
        selected ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-8 rounded-full" style={{ backgroundColor: team.avatar_color }} />
          <div>
            <h3 className="font-semibold text-sm">{team.name}</h3>
            {team.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{team.description}</p>}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="cursor-pointer rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>{team.agent_count ?? 0}개</span>
        {team.status && team.status !== 'active' && (
          <span className="ml-2 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-600">
            {team.status === 'archived' ? '보관됨' : team.status}
          </span>
        )}
      </div>
    </div>
  );
}
