'use client';

import type { TeamMember } from '@claudeops/shared';
import { MemberAvatar } from './member-avatar';
import { Trash2 } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = { lead: '리드', member: '멤버', observer: '옵저버' };

export function MemberList({ members, teamColor, selectedId, onSelect, onRemove }: {
  members: TeamMember[]; teamColor: string; selectedId?: number; onSelect: (m: TeamMember) => void; onRemove: (id: number) => void;
}) {
  return (
    <div className="space-y-1">
      {members.map((m) => (
        <div
          key={m.id}
          onClick={() => onSelect(m)}
          className={`cursor-pointer flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
            selectedId === m.id ? 'bg-primary/10' : 'hover:bg-accent'
          }`}
        >
          <div className="relative">
            <MemberAvatar name={m.name} color={teamColor} />
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
              m.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{m.name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[m.role] ?? m.role}</p>
          </div>
          {m.active_task_count !== undefined && m.active_task_count > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{m.active_task_count}</span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(m.id); }}
            className="cursor-pointer opacity-0 group-hover:opacity-100 rounded-md p-1 text-muted-foreground hover:text-destructive transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
