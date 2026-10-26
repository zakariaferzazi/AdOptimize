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
  X,
  PanelLeftClose,
  PanelLeftOpen,
  PanelLeft,
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
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isDesktopCollapsed?: boolean;
  onToggleDesktop?: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  anomaliesCount = 0,
  recommendationsCount = 0,
  isMobileOpen = false,
  onCloseMobile,
  isDesktopCollapsed = false,
  onToggleDesktop,
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

  const renderNavContent = (isMobile = false) => (
    <>
      {/* Top Brand & Nav */}
      <div className="p-5 flex flex-col gap-6">
        {/* Brand Lockup */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 cursor-pointer group"
            onClick={() => {
              if (onSelectTab) onSelectTab('overview');
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
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

          {isMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          ) : onToggleDesktop ? (
            <button
              type="button"
              onClick={onToggleDesktop}
              title="Collapse sidebar"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          ) : null}
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
                onClick={() => {
                  if (onSelectTab) onSelectTab(item.id);
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
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

      {/* Bottom Section: Compact Secondary Access Dock (Settings strictly inside box) */}
      <div className="p-3.5 flex flex-col gap-2.5 border-t border-slate-800/60">
        <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800/80">
          <Link
            href="/activity-log"
            onClick={() => {
              if (onSelectTab) onSelectTab('activity_log');
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
              pathname === '/activity-log' || currentTab === 'activity_log'
                ? 'bg-[#00d67d]/15 text-[#00d67d] font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Recent Account Activity & Audit History"
          >
            <History className="w-3.5 h-3.5 mb-1 shrink-0" />
            <span className="truncate max-w-full text-[10px]">Activity</span>
          </Link>

          <Link
            href="/reports"
            onClick={() => {
              if (onSelectTab) onSelectTab('reports');
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
              pathname === '/reports' || currentTab === 'reports'
                ? 'bg-[#00d67d]/15 text-[#00d67d] font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Performance Reports"
          >
            <BarChart3 className="w-3.5 h-3.5 mb-1 shrink-0" />
            <span className="truncate max-w-full text-[10px]">Reports</span>
          </Link>

          <Link
            href="/settings"
            onClick={() => {
              if (onSelectTab) onSelectTab('settings');
              if (isMobile && onCloseMobile) onCloseMobile();
            }}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
              pathname === '/settings' || currentTab === 'settings'
                ? 'bg-[#00d67d]/15 text-[#00d67d] font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Account Settings"
          >
            <Settings className="w-3.5 h-3.5 mb-1 shrink-0" />
            <span className="truncate max-w-full text-[10px]">Settings</span>
          </Link>
        </div>

        <div className="px-2 pt-1 text-[11px] text-slate-500 flex items-center justify-between">
          <Link
            href="/privacy-policy"
            onClick={() => isMobile && onCloseMobile && onCloseMobile()}
            className="hover:text-slate-300 transition-colors"
          >
            Privacy Policy
          </Link>
          <span>·</span>
          <Link
            href="/terms-of-service"
            onClick={() => isMobile && onCloseMobile && onCloseMobile()}
            className="hover:text-slate-300 transition-colors"
          >
            Terms
          </Link>
          <span>·</span>
          <Link
            href="/pricing"
            onClick={() => isMobile && onCloseMobile && onCloseMobile()}
            className="hover:text-slate-300 transition-colors"
          >
            Pricing
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent / Collapsible Sidebar (Transitions smoothly inside & outside) */}
      <aside
        className={`hidden lg:flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none border-r border-slate-800/60 z-30 transition-all duration-300 ease-in-out bg-[#0d1117] text-slate-300 ${
          isDesktopCollapsed
            ? 'w-0 -translate-x-full border-r-0 overflow-hidden opacity-0 pointer-events-none'
            : 'w-64 translate-x-0 opacity-100'
        }`}
      >
        <div className="w-64 flex flex-col justify-between h-full">
          {renderNavContent(false)}
        </div>
      </aside>

      {/* 2. Mobile / Tablet Slide-over Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside className="relative flex flex-col justify-between w-72 max-w-[85vw] bg-[#0d1117] text-slate-300 h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200 select-none border-r border-slate-800/80">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
