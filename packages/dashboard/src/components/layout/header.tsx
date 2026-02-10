'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useUiStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { sidebarCollapsed } = useUiStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className={cn(
      'fixed top-0 right-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-6 transition-all duration-300',
      sidebarCollapsed ? 'left-16' : 'left-60'
    )}>
      <div />
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="cursor-pointer rounded-md p-2 hover:bg-accent transition-colors duration-200"
        aria-label="테마 전환"
      >
        {mounted ? (theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <div className="h-4 w-4" />}
      </button>
    </header>
  );
}
