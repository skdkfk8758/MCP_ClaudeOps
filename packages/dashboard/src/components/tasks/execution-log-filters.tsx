'use client';

import { Search, RotateCcw } from 'lucide-react';
import type { TaskExecutionLogFilter } from '@claudeops/shared';

const PHASES = [
  { value: 'design', label: '설계' },
  { value: 'implementation', label: '구현' },
  { value: 'verification', label: '검증' },
];

const STATUSES = [
  { value: 'running', label: '실행 중' },
  { value: 'completed', label: '완료' },
  { value: 'failed', label: '실패' },
  { value: 'pending', label: '대기' },
];

export function ExecutionLogFilters({
  filters,
  onChange,
}: {
  filters: TaskExecutionLogFilter;
  onChange: (filters: TaskExecutionLogFilter) => void;
}) {
  const update = (key: keyof TaskExecutionLogFilter, value: string | undefined) => {
    const next = { ...filters };
    if (value) {
      (next as Record<string, unknown>)[key] = value;
    } else {
      delete (next as Record<string, unknown>)[key];
    }
    onChange(next);
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Phase 필터 */}
      <select
        value={filters.phase ?? ''}
        onChange={(e) => update('phase', e.target.value || undefined)}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
      >
        <option value="">전체 단계</option>
        {PHASES.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Status 필터 */}
      <select
        value={filters.status ?? ''}
        onChange={(e) => update('status', e.target.value || undefined)}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
      >
        <option value="">전체 상태</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Agent Type 필터 */}
      <input
        type="text"
        value={filters.agent_type ?? ''}
        onChange={(e) => update('agent_type', e.target.value || undefined)}
        placeholder="에이전트"
        className="rounded-md border border-input bg-background px-2 py-1 text-xs w-24"
      />

      {/* Model 필터 */}
      <select
        value={filters.model ?? ''}
        onChange={(e) => update('model', e.target.value || undefined)}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs"
      >
        <option value="">전체 모델</option>
        <option value="haiku">haiku</option>
        <option value="sonnet">sonnet</option>
        <option value="opus">opus</option>
      </select>

      {/* 텍스트 검색 */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <input
          type="text"
          value={filters.search ?? ''}
          onChange={(e) => update('search', e.target.value || undefined)}
          placeholder="검색..."
          className="rounded-md border border-input bg-background pl-6 pr-2 py-1 text-xs w-36"
        />
      </div>

      {/* 초기화 */}
      {hasActiveFilters && (
        <button
          onClick={() => onChange({})}
          className="cursor-pointer flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          초기화
        </button>
      )}
    </div>
  );
}
