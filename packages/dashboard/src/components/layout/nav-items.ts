import {
  LayoutDashboard, Monitor, Bot, Coins, Wrench, Activity, Settings, ClipboardList,
} from 'lucide-react';

export const navItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/sessions', label: '세션', icon: Monitor },
  { href: '/agents', label: '에이전트', icon: Bot },
  { href: '/tokens', label: '토큰 & 비용', icon: Coins },
  { href: '/tools', label: '도구', icon: Wrench },
  { href: '/events', label: '이벤트', icon: Activity },
  { href: '/tasks', label: '작업 보드', icon: ClipboardList },
  { href: '/settings', label: '설정', icon: Settings },
];
