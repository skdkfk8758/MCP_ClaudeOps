'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navGroups } from './nav-items';
import { useUiStore } from '@/stores/ui-store';
import { useAppFilterStore } from '@/stores/app-filter-store';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const FILTER_BADGE_MAP: Record<string, 'taskBoard' | 'pipelines' | 'epics' | 'prds'> = {
  '/tasks': 'taskBoard',
  '/pipelines': 'pipelines',
  '/epics': 'epics',
  '/prds': 'prds',
};

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, collapsedGroups, toggleGroup } = useUiStore();
  const getActiveFilterCount = useAppFilterStore((s) => s.getActiveFilterCount);

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300',
      sidebarCollapsed ? 'w-16' : 'w-60'
    )}>
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!sidebarCollapsed && (
          <span className="text-lg font-semibold text-foreground">ClaudeOps</span>
        )}
        <button onClick={toggleSidebar} className="cursor-pointer rounded-md p-1 hover:bg-accent transition-colors duration-200">
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="overflow-y-auto h-[calc(100vh-3.5rem)] p-2 space-y-1">
        {navGroups.map((group, gi) => {
          const isCollapsed = collapsedGroups[group.title];
          return (
            <div key={gi}>
              {group.title && (
                <>
                  {sidebarCollapsed ? (
                    <div className="my-2 border-t border-border" />
                  ) : (
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className="cursor-pointer flex items-center justify-between w-full px-3 py-2 mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>{group.title}</span>
                      <ChevronDown className={cn('h-3 w-3 transition-transform', isCollapsed && '-rotate-90')} />
                    </button>
                  )}
                </>
              )}
              {(!isCollapsed || sidebarCollapsed) && group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;
                const filterPage = FILTER_BADGE_MAP[item.href];
                const filterCount = filterPage ? getActiveFilterCount(filterPage) : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {filterCount > 0 && (
                          <span className="ml-auto rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">
                            {filterCount}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
