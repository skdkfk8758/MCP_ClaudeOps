'use client';

import { use, useState } from 'react';
import { usePrd, useUpdatePrd, useDeletePrd } from '@/lib/hooks/use-prds';
import { useEpics } from '@/lib/hooks/use-epics';
import { EpicCard } from '@/components/epics/epic-card';
import { EpicCreateDialog } from '@/components/epics/epic-create-dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Plus } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  backlog: '백로그',
  active: '활성',
  completed: '완료',
  archived: '보관',
};

export default function PrdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const prdId = parseInt(id);
  const { data: prd } = usePrd(prdId);
  const { data: epicsData } = useEpics(prdId);
  const updatePrd = useUpdatePrd();
  const deletePrd = useDeletePrd();
  const router = useRouter();
  const [createEpicOpen, setCreateEpicOpen] = useState(false);

  if (!prd) return <div className="animate-pulse h-64 rounded-lg bg-muted" />;

  const handleStatusChange = (newStatus: string) => {
    updatePrd.mutate({ id: prdId, status: newStatus });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/prds" className="cursor-pointer hover:bg-accent rounded-md p-1 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold flex-1">#{prd.id} {prd.title}</h1>
        <select value={prd.status} onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button onClick={() => { if (confirm('이 PRD를 삭제하시겠습니까?')) { deletePrd.mutate(prdId, { onSuccess: () => router.push('/prds') }); } }}
          className="cursor-pointer rounded-md p-2 text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {prd.vision && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">비전</h2>
          <p className="text-sm whitespace-pre-wrap">{prd.vision}</p>
        </div>
      )}

      {prd.description && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">설명</h2>
          <p className="text-sm whitespace-pre-wrap">{prd.description}</p>
        </div>
      )}

      {prd.user_stories && prd.user_stories.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">사용자 스토리</h2>
          <ul className="space-y-2">
            {prd.user_stories.map((story, idx) => (
              <li key={idx} className="text-sm flex gap-2">
                <span className="text-primary">•</span>
                <span>{story}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {prd.success_criteria && prd.success_criteria.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">성공 기준</h2>
          <ul className="space-y-2">
            {prd.success_criteria.map((criteria, idx) => (
              <li key={idx} className="text-sm flex gap-2">
                <span className="text-green-400">✓</span>
                <span>{criteria}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {prd.constraints && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">제약 사항</h2>
          <p className="text-sm whitespace-pre-wrap">{prd.constraints}</p>
        </div>
      )}

      {prd.out_of_scope && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">범위 외</h2>
          <p className="text-sm whitespace-pre-wrap">{prd.out_of_scope}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">연결된 에픽</h2>
          <button onClick={() => setCreateEpicOpen(true)}
            className="cursor-pointer flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-3 w-3" /> 새 에픽
          </button>
        </div>
        {!epicsData ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : epicsData.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">연결된 에픽이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {epicsData.items.map((epic) => (
              <EpicCard key={epic.id} epic={epic} />
            ))}
          </div>
        )}
      </div>

      <EpicCreateDialog open={createEpicOpen} onClose={() => setCreateEpicOpen(false)} defaultPrdId={prdId} />
    </div>
  );
}
