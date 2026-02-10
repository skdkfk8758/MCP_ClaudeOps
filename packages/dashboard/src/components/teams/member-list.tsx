'use client';

import type { TeamAgent } from '@claudeops/shared';
import { Bot, Trash2 } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  lead: '리드',
  worker: '워커',
  reviewer: '리뷰어',
  observer: '옵저버',
};

const TIER_COLORS: Record<string, string> = {
  haiku: 'bg-green-500/10 text-green-600',
  sonnet: 'bg-blue-500/10 text-blue-600',
  opus: 'bg-purple-500/10 text-purple-600',
};

export function MemberList({ teamId, agents, teamColor, selectedId, onSelect, onRemove }: {
  teamId: number;
  agents: TeamAgent[];
  teamColor: string;
  selectedId?: number;
  onSelect: (a: TeamAgent) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div className="space-y-1">
      {agents.map((agent) => (
        <div
          key={agent.id}
          onClick={() => onSelect(agent)}
          className={`group cursor-pointer flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
            selectedId === agent.id ? 'bg-primary/10' : 'hover:bg-accent'
          }`}
        >
          <div className="relative">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: agent.persona?.color ?? teamColor }}
            >
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{agent.persona?.name ?? '알 수 없음'}</p>
            <div className="flex gap-1 mt-0.5">
              {agent.persona?.model && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                  TIER_COLORS[agent.persona.model] ?? 'bg-gray-500/10 text-gray-600'
                }`}>
                  {agent.persona.model}
                </span>
              )}
              <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-600">
                {ROLE_LABELS[agent.role] ?? agent.role}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(agent.id); }}
            className="cursor-pointer opacity-0 group-hover:opacity-100 rounded-md p-1 text-muted-foreground hover:text-destructive transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
