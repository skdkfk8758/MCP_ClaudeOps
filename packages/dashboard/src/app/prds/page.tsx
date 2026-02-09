'use client';

import { useState } from 'react';
import { usePrds } from '@/lib/hooks/use-prds';
import { PrdCard } from '@/components/prds/prd-card';
import { PrdCreateDialog } from '@/components/prds/prd-create-dialog';
import { Plus } from 'lucide-react';

const STATUS_TABS = [
  { value: '', label: '전체' },
  { value: 'backlog', label: '백로그' },
  { value: 'active', label: '활성' },
  { value: 'completed', label: '완료' },
  { value: 'archived', label: '보관' },
];

export default function PrdsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const { data } = usePrds(selectedStatus || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PRD 목록</h1>
          {data && <p className="text-sm text-muted-foreground mt-1">총 {data.total}개</p>}
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="cursor-pointer flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> 새 PRD
        </button>
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
          <p>PRD가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((prd) => (
            <PrdCard key={prd.id} prd={prd} />
          ))}
        </div>
      )}

      <PrdCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
