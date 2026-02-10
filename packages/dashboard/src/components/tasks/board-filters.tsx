'use client';

import { useEpics } from '@/lib/hooks/use-epics';
import { useTeams } from '@/lib/hooks/use-teams';
import type { BoardFilters } from '@/lib/hooks/use-tasks';
import { X } from 'lucide-react';

const PRIORITIES = [
  { value: 'P0', label: 'P0 - 긴급' },
  { value: 'P1', label: 'P1 - 높음' },
  { value: 'P2', label: 'P2 - 보통' },
  { value: 'P3', label: 'P3 - 낮음' },
];

const EFFORTS = [
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
];

export function BoardFiltersToolbar({
  filters,
  onChange,
}: {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
}) {
  const { data: epicsData } = useEpics();
  const { data: teamsData } = useTeams();

  const allTeams = teamsData?.items ?? [];
  const allEpics = epicsData?.items ?? [];

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);

  const update = (key: keyof BoardFilters, value: string | undefined) => {
    const next = { ...filters };
    if (value) {
      (next as Record<string, unknown>)[key] = key === 'epic_id' || key === 'team_id' ? parseInt(value) : value;
    } else {
      delete (next as Record<string, unknown>)[key];
    }
    onChange(next);
  };

  const clearAll = () => onChange({});

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.epic_id ?? ''}
        onChange={(e) => update('epic_id', e.target.value || undefined)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
      >
        <option value="">모든 에픽</option>
        {allEpics.map((epic) => (
          <option key={epic.id} value={epic.id}>{epic.title}</option>
        ))}
      </select>

      <select
        value={filters.priority ?? ''}
        onChange={(e) => update('priority', e.target.value || undefined)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
      >
        <option value="">모든 우선순위</option>
        {PRIORITIES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      <select
        value={filters.team_id ?? ''}
        onChange={(e) => update('team_id', e.target.value || undefined)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
      >
        <option value="">모든 팀</option>
        {allTeams.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      <select
        value={filters.effort ?? ''}
        onChange={(e) => update('effort', e.target.value || undefined)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
      >
        <option value="">모든 공수</option>
        {EFFORTS.map((e) => (
          <option key={e.value} value={e.value}>{e.label}</option>
        ))}
      </select>

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="cursor-pointer flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="h-3 w-3" /> 필터 초기화
        </button>
      )}
    </div>
  );
}
