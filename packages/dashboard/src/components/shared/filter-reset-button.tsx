'use client';

import { X } from 'lucide-react';

interface FilterResetButtonProps {
  activeCount: number;
  onReset: () => void;
}

export function FilterResetButton({ activeCount, onReset }: FilterResetButtonProps) {
  if (activeCount === 0) return null;

  return (
    <button
      onClick={onReset}
      className="cursor-pointer flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <X className="h-3 w-3" />
      필터 초기화 ({activeCount})
    </button>
  );
}
