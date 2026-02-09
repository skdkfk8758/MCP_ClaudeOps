import { Suspense } from 'react';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { CostSummary } from '@/components/dashboard/cost-summary';
import { LiveIndicator } from '@/components/dashboard/live-indicator';
import { TaskStatsWidget } from '@/components/tasks/task-stats-widget';
import { PrdEpicWidget } from '@/components/prds/prd-epic-widget';
import { TeamWorkloadWidget } from '@/components/teams/team-workload-widget';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <Suspense fallback={null}>
          <LiveIndicator />
        </Suspense>
      </div>
      <Suspense fallback={<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)}</div>}>
        <OverviewCards />
      </Suspense>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
        <CostSummary />
      </Suspense>
      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}>
        <TaskStatsWidget />
      </Suspense>
      <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({length:2}).map((_,i)=><div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}</div>}>
        <PrdEpicWidget />
      </Suspense>
      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}>
        <TeamWorkloadWidget />
      </Suspense>
    </div>
  );
}
