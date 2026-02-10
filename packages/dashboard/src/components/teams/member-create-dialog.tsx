'use client';

import { useState } from 'react';
import { useAddAgentToTeam, usePersonas } from '@/lib/hooks/use-teams';
import { X, Bot, Search } from 'lucide-react';
import type { AgentRole } from '@claudeops/shared';

const ROLE_OPTIONS: { value: AgentRole; label: string }[] = [
  { value: 'lead', label: '리드' },
  { value: 'worker', label: '워커' },
  { value: 'reviewer', label: '리뷰어' },
  { value: 'observer', label: '옵저버' },
];

const CATEGORY_LABELS: Record<string, string> = {
  'build-analysis': '빌드/분석',
  'review': '리뷰',
  'domain': '도메인',
  'product': '프로덕트',
  'coordination': '조율',
};

export function MemberCreateDialog({ open, onClose, teamId }: { open: boolean; onClose: () => void; teamId: number }) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const [role, setRole] = useState<AgentRole>('worker');
  const [instanceLabel, setInstanceLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: personasData } = usePersonas();
  const addAgent = useAddAgentToTeam();

  if (!open) return null;

  const personas = personasData?.items ?? [];
  const filteredPersonas = searchQuery
    ? personas.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.agent_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : personas;

  const groupedPersonas = filteredPersonas.reduce((acc, p) => {
    const cat = p.category ?? 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, typeof personas>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonaId) return;
    addAgent.mutate({
      teamId,
      persona_id: selectedPersonaId,
      role,
      instance_label: instanceLabel.trim() || undefined,
    }, {
      onSuccess: () => {
        setSelectedPersonaId(null);
        setRole('worker');
        setInstanceLabel('');
        setSearchQuery('');
        onClose();
      },
    });
  };

  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">에이전트 추가</h2>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1 hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="페르소나 검색..."
              className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>

          {/* Persona Selection */}
          <div className="border border-border rounded-md p-3 max-h-60 overflow-y-auto space-y-3">
            {Object.entries(groupedPersonas).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                  {CATEGORY_LABELS[category] ?? category}
                </h3>
                <div className="space-y-1">
                  {items.map((persona) => (
                    <div
                      key={persona.id}
                      onClick={() => setSelectedPersonaId(persona.id)}
                      className={`cursor-pointer flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                        selectedPersonaId === persona.id ? 'bg-primary/10 border border-primary' : 'hover:bg-accent border border-transparent'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: persona.color ?? '#6366f1' }}
                      >
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{persona.name}</p>
                        <div className="flex gap-1 mt-0.5">
                          <span className="rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-600">
                            {persona.model}
                          </span>
                          <span className="rounded-full bg-gray-500/10 px-1.5 py-0.5 text-[9px] font-medium text-gray-600">
                            {persona.agent_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Selected Persona Info */}
          {selectedPersona && (
            <div className="rounded-md border border-border bg-accent/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">선택된 페르소나</p>
              <p className="text-sm font-medium">{selectedPersona.name}</p>
              {selectedPersona.description && (
                <p className="text-xs text-muted-foreground mt-1">{selectedPersona.description}</p>
              )}
            </div>
          )}

          {/* Role & Label */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="agent-role" className="text-sm text-muted-foreground block mb-1">역할 *</label>
              <select
                id="agent-role"
                value={role}
                onChange={(e) => setRole(e.target.value as AgentRole)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="instance-label" className="text-sm text-muted-foreground block mb-1">인스턴스 라벨</label>
              <input
                id="instance-label"
                type="text"
                value={instanceLabel}
                onChange={(e) => setInstanceLabel(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="선택사항"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-md px-4 py-2 text-sm hover:bg-accent transition-colors">
              취소
            </button>
            <button
              type="submit"
              disabled={!selectedPersonaId || addAgent.isPending}
              className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {addAgent.isPending ? '추가 중...' : '에이전트 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
