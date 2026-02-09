'use client';

export function EpicProgress({ progress, size = 'md' }: { progress: number; size?: 'sm' | 'md' }) {
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div className={`w-full rounded-full bg-muted ${height}`}>
      <div
        className={`rounded-full bg-primary ${height} transition-all`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}
