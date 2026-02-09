import {
  LayoutDashboard, Monitor, Bot, Coins, Wrench, Activity, Settings, ClipboardList,
  FileText, Layers, FileBarChart, GitBranch,
} from 'lucide-react';

export const navItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/sessions', label: '세션', icon: Monitor },
  { href: '/agents', label: '에이전트', icon: Bot },
  { href: '/tokens', label: '토큰 & 비용', icon: Coins },
  { href: '/tools', label: '도구', icon: Wrench },
  { href: '/events', label: '이벤트', icon: Activity },
  { href: '/tasks', label: '작업 보드', icon: ClipboardList },
  { href: '/prds', label: 'PRD', icon: FileText },
  { href: '/epics', label: '에픽', icon: Layers },
  { href: '/reports', label: '리포트', icon: FileBarChart },
  { href: '/worktrees', label: 'Worktree', icon: GitBranch },
  { href: '/settings', label: '설정', icon: Settings },
];
