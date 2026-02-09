'use client';

import { usePrds } from '@/lib/hooks/use-prds';
import { useEpics } from '@/lib/hooks/use-epics';
import { FileText, Layers } from 'lucide-react';
import Link from 'next/link';

export function PrdEpicWidget() {
  const { data: prdsData } = usePrds();
  const { data: epicsData } = useEpics();

  if (!prdsData && !epicsData) return null;

  const prdStats = {
    total: prdsData?.total || 0,
    active: prdsData?.items.filter((p) => p.status === 'active').length || 0,
    completed: prdsData?.items.filter((p) => p.status === 'completed').length || 0,
  };

  const epicStats = {
    total: epicsData?.total || 0,
    active: epicsData?.items.filter((e) => e.status === 'in_progress' || e.status === 'planning').length || 0,
    completed: epicsData?.items.filter((e) => e.status === 'completed').length || 0,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Link href="/prds" className="block cursor-pointer">
        <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">PRD</h2>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-blue-400">{prdStats.total}</p>
              <p className="text-[10px] text-muted-foreground">전체</p>
            </div>
            <div>
              <p className="text-xl font-bold text-yellow-400">{prdStats.active}</p>
              <p className="text-[10px] text-muted-foreground">활성</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-400">{prdStats.completed}</p>
              <p className="text-[10px] text-muted-foreground">완료</p>
            </div>
          </div>
        </div>
      </Link>

      <Link href="/epics" className="block cursor-pointer">
        <div className="rounded-lg border border-border bg-card p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">에픽</h2>
            <Layers className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xl font-bold text-blue-400">{epicStats.total}</p>
              <p className="text-[10px] text-muted-foreground">전체</p>
            </div>
            <div>
              <p className="text-xl font-bold text-yellow-400">{epicStats.active}</p>
              <p className="text-[10px] text-muted-foreground">활성</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-400">{epicStats.completed}</p>
              <p className="text-[10px] text-muted-foreground">완료</p>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
