import {
  LayoutDashboard, Monitor, Bot, Coins, Wrench, Activity, Settings, ClipboardList,
  FileText, Layers, FileBarChart, GitBranch, Users, Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: '',
    items: [
      { href: '/', label: '커맨드 센터', icon: LayoutDashboard },
    ],
  },
  {
    title: '프로젝트 관리',
    items: [
      { href: '/prds', label: '제품 요구사항 (PRD)', icon: FileText },
      { href: '/epics', label: '실행 단위 (에픽)', icon: Layers },
      { href: '/tasks', label: '작업 보드', icon: ClipboardList },
      { href: '/pipelines', label: '파이프라인', icon: Workflow },
      { href: '/worktrees', label: '개발 브랜치', icon: GitBranch },
    ],
  },
  {
    title: '팀',
    items: [
      { href: '/teams', label: '팀 & 멤버', icon: Users },
    ],
  },
  {
    title: '운영 모니터링',
    items: [
      { href: '/sessions', label: '세션 모니터', icon: Monitor },
      { href: '/agents', label: '에이전트 활동', icon: Bot },
      { href: '/tools', label: '도구 분석', icon: Wrench },
      { href: '/events', label: '이벤트 로그', icon: Activity },
    ],
  },
  {
    title: '비용 & 리포트',
    items: [
      { href: '/tokens', label: '비용 현황', icon: Coins },
      { href: '/reports', label: '운영 리포트', icon: FileBarChart },
      { href: '/settings', label: '설정', icon: Settings },
    ],
  },
];

// Flat list for backward compatibility
export const navItems = navGroups.flatMap(g => g.items);
