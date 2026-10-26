'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Zap,
  MessageSquare,
  History,
  Settings,
  ShieldCheck,
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
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  anomaliesCount: number;
  recommendationsCount: number;
  onOpenLanding?: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  anomaliesCount,
  recommendationsCount,
}: SidebarProps) {
  // STRICT 6 MAIN PAGES:
  // 1. Overview
  // 2. Campaigns
  // 3. AI Ads Audit
  // 4. Budget Optimizer
  // 5. Automations
  // 6. AI Chat
  const mainNav = [
    {
      id: 'overview' as NavTab,
      altIds: ['dashboard'],
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      id: 'campaigns' as NavTab,
      altIds: [],
      label: 'Campaigns',
      icon: Layers,
    },
    {
      id: 'audit' as NavTab,
      altIds: ['insights'],
      label: 'AI Ads Audit',
      icon: Sparkles,
      badge: anomaliesCount > 0 ? anomaliesCount : undefined,
    },
    {
      id: 'optimizer' as NavTab,
      altIds: [],
      label: 'Budget Optimizer',
      icon: SlidersHorizontal,
      badge: recommendationsCount > 0 ? recommendationsCount : undefined,
    },
    {
      id: 'automations' as NavTab,
      altIds: ['automation'],
      label: 'Automations',
      icon: Zap,
    },
    {
      id: 'chat' as NavTab,
      altIds: ['copilot'],
      label: 'AI Chat',
      icon: MessageSquare,
    },
  ];

  return (
    <aside className="w-64 bg-[#0d1117] text-slate-300 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none border-r border-slate-800/60 z-30">
      {/* Top Brand & Nav */}
      <div className="p-5 flex flex-col gap-6">
        {/* Brand Lockup */}
        <div className="flex items-center px-2 pt-1">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => onSelectTab('overview')}
          >
            <Image
              src="/icon.svg"
              alt="AdOptimize Logo"
              width={32}
              height={32}
              className="w-8 h-8 rounded-xl shadow-lg shadow-[#00d67d]/20 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-baseline tracking-tight font-bold text-xl">
              <span className="text-white">Ad</span>
              <span className="text-[#00d67d]">Optimize</span>
            </div>
          </div>
        </div>

        {/* 6 Essential Main Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentTab === item.id || item.altIds.includes(currentTab);

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
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
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Safeguards & Compact Secondary Access (Activity Log & Settings) */}
      <div className="p-5 flex flex-col gap-3 border-t border-slate-800/60">
        {/* Safe AI Status Card */}
        <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-[#00d67d]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">
              Google Ads Safety Active
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              Approval required for changes
            </div>
          </div>
        </div>

        {/* Secondary Compact Access: Activity Log & Settings */}
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSelectTab('activity_log')}
              className={`flex items-center gap-1.5 transition-colors py-1 cursor-pointer ${
                currentTab === 'activity_log' || currentTab === 'audit'
                  ? 'text-white font-semibold'
                  : 'hover:text-white'
              }`}
              title="Recent Account Activity & Audit History"
            >
              <History className="w-3.5 h-3.5" />
              <span>Activity</span>
            </button>
            <span>•</span>
            <button
              onClick={() => onSelectTab('settings')}
              className={`flex items-center gap-1.5 transition-colors py-1 cursor-pointer ${
                currentTab === 'settings'
                  ? 'text-white font-semibold'
                  : 'hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
            <span>•</span>
            <Link
              href="/privacy-policy"
              className="hover:text-white transition-colors py-1 cursor-pointer"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
