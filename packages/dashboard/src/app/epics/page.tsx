'use client';

import { useState } from 'react';
import { useEpics } from '@/lib/hooks/use-epics';
import { usePrds } from '@/lib/hooks/use-prds';
import { EpicCard } from '@/components/epics/epic-card';
import { EpicCreateDialog } from '@/components/epics/epic-create-dialog';
import { Plus } from 'lucide-react';

const STATUS_TABS = [
  { value: '', label: '전체' },
  { value: 'backlog', label: '백로그' },
  { value: 'planning', label: '계획 중' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'completed', label: '완료' },
];

export default function EpicsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPrdId, setSelectedPrdId] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState('');
  const { data } = useEpics(selectedPrdId, selectedStatus || undefined);
  const { data: prdsData } = usePrds();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">에픽 목록</h1>
          {data && <p className="text-sm text-muted-foreground mt-1">총 {data.total}개</p>}
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="cursor-pointer flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> 새 에픽
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <select value={selectedPrdId || ''} onChange={(e) => setSelectedPrdId(e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">모든 PRD</option>
            {prdsData?.items.map((prd) => (
              <option key={prd.id} value={prd.id}>{prd.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button key={tab.value} onClick={() => setSelectedStatus(tab.value)}
            className={`cursor-pointer px-4 py-2 text-sm font-medium transition-colors ${
              selectedStatus === tab.value
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>에픽이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((epic) => (
            <EpicCard key={epic.id} epic={epic} />
          ))}
        </div>
      )}

      <EpicCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
