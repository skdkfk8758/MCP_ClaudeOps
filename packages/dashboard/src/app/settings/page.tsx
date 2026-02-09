'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useState } from 'react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<Record<string, string>>('/api/config'),
  });

  const [dailyLimit, setDailyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');

  const budgetMutation = useMutation({
    mutationFn: (data: { daily_limit?: number; monthly_limit?: number }) =>
      apiFetch('/api/tokens/budget-alerts', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config'] }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">현재 가격 ($/MTok)</h2>
        <div className="grid grid-cols-3 gap-4">
          {['haiku', 'sonnet', 'opus'].map((model) => (
            <div key={model} className="rounded-md border border-border p-3">
              <p className="font-medium capitalize mb-2">{model}</p>
              <p className="text-sm text-muted-foreground">Input: ${config?.[`pricing.${model}.input`] ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Output: ${config?.[`pricing.${model}.output`] ?? '-'}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">예산 알림</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="daily-limit" className="text-sm text-muted-foreground block mb-1">일일 한도 ($)</label>
            <input
              id="daily-limit"
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              placeholder={config?.['budget.daily_limit'] || '0'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="monthly-limit" className="text-sm text-muted-foreground block mb-1">월간 한도 ($)</label>
            <input
              id="monthly-limit"
              type="number"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder={config?.['budget.monthly_limit'] || '0'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => budgetMutation.mutate({
            daily_limit: dailyLimit ? parseFloat(dailyLimit) : undefined,
            monthly_limit: monthlyLimit ? parseFloat(monthlyLimit) : undefined,
          })}
        >
          예산 알림 저장
        </button>
      </div>
    </div>
  );
}
