'use client';

import { useState } from 'react';
import { AGENT_DEFINITIONS, AGENT_CATEGORIES } from '@/lib/pipeline/agents';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentPaletteProps {
  onDragStart: (agentId: string) => void;
}

export function AgentPalette({ onDragStart }: AgentPaletteProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(AGENT_CATEGORIES.map(c => c.id))
  );

  const filtered = AGENT_DEFINITIONS.filter(a =>
    a.label.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-56 border-r border-border bg-card h-full overflow-y-auto">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="에이전트 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-input bg-background"
          />
        </div>
      </div>
      <div className="p-2 space-y-1">
        {AGENT_CATEGORIES.map(cat => {
          const agents = filtered.filter(a => a.category === cat.id);
          if (agents.length === 0) return null;
          const expanded = expandedCategories.has(cat.id);
          return (
            <div key={cat.id}>
              <button
                onClick={() => toggleCategory(cat.id)}
                className="cursor-pointer flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{cat.label}</span>
                  <span className="text-[10px] font-normal">({agents.length})</span>
                </div>
                <ChevronDown className={cn('h-3 w-3 transition-transform', !expanded && '-rotate-90')} />
              </button>
              {expanded && agents.map(agent => (
                <div
                  key={agent.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/pipeline-agent', agent.id);
                    e.dataTransfer.effectAllowed = 'move';
                    onDragStart(agent.id);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 ml-2 rounded-md cursor-grab hover:bg-accent transition-colors text-xs"
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: agent.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{agent.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{agent.description}</p>
                  </div>
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">
                    {agent.defaultModel[0]}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
