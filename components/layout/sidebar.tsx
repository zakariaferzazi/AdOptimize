'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Zap,
  MessageSquare,
  History,
  Settings,
  BarChart3,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'dashboard'
  | 'campaigns'
  | 'audit'
  | 'insights'
  | 'optimizer'
  | 'automations'
  | 'automation'
  | 'chat'
  | 'copilot'
  | 'activity_log'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
  anomaliesCount?: number;
  recommendationsCount?: number;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  anomaliesCount = 0,
  recommendationsCount = 0,
}: SidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    {
      id: 'overview' as NavTab,
      href: '/dashboard',
      matchPaths: ['/dashboard', '/overview'],
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'campaigns' as NavTab,
      href: '/campaigns',
      matchPaths: ['/campaigns'],
      label: 'Campaigns',
      icon: Layers,
    },
    {
      id: 'audit' as NavTab,
      href: '/audit',
      matchPaths: ['/audit', '/insights'],
      label: 'AI Ads Audit',
      icon: Sparkles,
      badge: anomaliesCount > 0 ? anomaliesCount : undefined,
    },
    {
      id: 'optimizer' as NavTab,
      href: '/optimizer',
      matchPaths: ['/optimizer'],
      label: 'Budget Optimizer',
      icon: SlidersHorizontal,
      badge: recommendationsCount > 0 ? recommendationsCount : undefined,
    },
    {
      id: 'automations' as NavTab,
      href: '/automations',
      matchPaths: ['/automations', '/automation'],
      label: 'Automations',
      icon: Zap,
    },
    {
      id: 'chat' as NavTab,
      href: '/chat',
      matchPaths: ['/chat', '/copilot'],
      label: 'AI Chat',
      icon: MessageSquare,
    },
  ];

  const isItemActive = (item: typeof mainNav[number]) => {
    if (pathname) {
      if (item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        return true;
      }
      if (item.id === 'overview' && pathname === '/') {
        return true;
      }
    }
    if (currentTab) {
      return currentTab === item.id || (item.id === 'overview' && currentTab === 'dashboard');
    }
    return false;
  };

  return (
    <aside className="w-64 bg-[#0d1117] text-slate-300 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none border-r border-slate-800/60 z-30">
      {/* Top Brand & Nav */}
      <div className="p-5 flex flex-col gap-6">
        {/* Brand Lockup */}
        <div className="flex items-center px-2 pt-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => onSelectTab && onSelectTab('overview')}
          >
            <Image
              src="/icon.svg"
              alt="AdOptimize Logo"
              width={32}
              height={32}
              className="w-8 h-8 rounded-xl shadow-lg shadow-[#00d67d]/20 object-contain group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-baseline tracking-tight font-bold text-xl">
              <span className="text-white">Ad</span>
              <span className="text-[#00d67d]">Optimize</span>
            </div>
          </Link>
        </div>

        {/* 6 Essential Main Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => onSelectTab && onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#00d67d] text-slate-950 font-semibold shadow-md shadow-[#00d67d]/15'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 stroke-[2] ${
                      isActive ? 'text-slate-950' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge ? (
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-slate-950 text-[#00d67d]'
                        : 'bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Compact Secondary Access */}
      <div className="p-5 flex flex-col gap-3 border-t border-slate-800/60">
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <Link
              href="/activity-log"
              onClick={() => onSelectTab && onSelectTab('activity_log')}
              className={`flex items-center gap-1.5 transition-colors py-1 cursor-pointer ${
                pathname === '/activity-log' || currentTab === 'activity_log'
                  ? 'text-white font-semibold'
                  : 'hover:text-white'
              }`}
              title="Recent Account Activity & Audit History"
            >
              <History className="w-3.5 h-3.5" />
              <span>Activity</span>
            </Link>
            <span>•</span>
            <Link
              href="/reports"
              onClick={() => onSelectTab && onSelectTab('reports')}
              className={`flex items-center gap-1.5 transition-colors py-1 cursor-pointer ${
                pathname === '/reports' || currentTab === 'reports'
                  ? 'text-white font-semibold'
                  : 'hover:text-white'
              }`}
              title="Performance Reports"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Reports</span>
            </Link>
            <span>•</span>
            <Link
              href="/settings"
              onClick={() => onSelectTab && onSelectTab('settings')}
              className={`flex items-center gap-1.5 transition-colors py-1 cursor-pointer ${
                pathname === '/settings' || currentTab === 'settings'
                  ? 'text-white font-semibold'
                  : 'hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
          </div>
        </div>

        <div className="px-2 pt-1 text-[11px] text-slate-500 flex items-center justify-between">
          <Link href="/privacy-policy" className="hover:text-slate-300 transition-colors">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/terms-of-service" className="hover:text-slate-300 transition-colors">
            Terms
          </Link>
          <span>·</span>
          <Link href="/pricing" className="hover:text-slate-300 transition-colors">
            Pricing
          </Link>
        </div>
      </div>
    </aside>
  );
}
