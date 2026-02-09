'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Monitor, Bot, Coins, AlertTriangle } from 'lucide-react';
import type { DashboardOverview } from '@claudeops/shared';

export function OverviewCards() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => apiFetch<DashboardOverview>('/api/analytics/overview'),
    refetchInterval: 30_000,
  });

  const cards = [
    { label: '오늘 세션', value: data?.total_sessions_today ?? 0, icon: Monitor, color: 'text-info' },
    { label: '오늘 에이전트', value: data?.total_agents_today ?? 0, icon: Bot, color: 'text-success' },
    { label: '오늘 비용', value: `$${(data?.total_cost_today ?? 0).toFixed(2)}`, icon: Coins, color: 'text-warning' },
    { label: '오늘 오류', value: data?.total_errors_today ?? 0, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </div>
          <p className="mt-2 text-2xl font-bold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
