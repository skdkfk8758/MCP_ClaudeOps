import { cn } from '@/lib/utils';

const PRIORITY_STYLES: Record<string, string> = {
  P0: 'bg-red-500/10 text-red-500 border-red-500/20',
  P1: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  P2: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  P3: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold', PRIORITY_STYLES[priority] || PRIORITY_STYLES.P2)}>
      {priority}
    </span>
  );
}
