'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { Session } from '@claudeops/shared';

export function LiveIndicator() {
  const { data: active } = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: () => apiFetch<Session[]>('/api/sessions/active'),
    refetchInterval: 5_000,
  });

  const count = active?.length ?? 0;

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm text-success">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      {count}개 활성 세션
    </div>
  );
}
