'use client';

import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Bot,
  Zap,
  History,
  FileText,
  Settings,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'campaigns'
  | 'insights'
  | 'optimizer'
  | 'automation'
  | 'copilot'
  | 'audit'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  anomaliesCount: number;
  recommendationsCount: number;
  onOpenLanding: () => void;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  anomaliesCount,
  recommendationsCount,
  onOpenLanding,
}: SidebarProps) {
  const mainNav = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'campaigns' as NavTab,
      label: 'Campaigns',
      icon: Layers,
    },
    {
      id: 'insights' as NavTab,
      label: 'AI Insights',
      icon: Sparkles,
      badge: anomaliesCount > 0 ? anomaliesCount : undefined,
    },
    {
      id: 'optimizer' as NavTab,
      label: 'Budget Optimizer',
      icon: SlidersHorizontal,
      badge: recommendationsCount > 0 ? recommendationsCount : undefined,
    },
    {
      id: 'automation' as NavTab,
      label: 'Automation',
      icon: Zap,
    },
    {
      id: 'copilot' as NavTab,
      label: 'AI Copilot',
      icon: Bot,
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: FileText,
    },
    {
      id: 'audit' as NavTab,
      label: 'Change History',
      icon: History,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-[#0d1117] text-slate-300 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none border-r border-slate-800/60 z-30">
      {/* Top Brand & Nav */}
      <div className="p-5 flex flex-col gap-6">
        {/* Brand Lockup */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d67d] to-[#059669] flex items-center justify-center shadow-lg shadow-[#00d67d]/20 text-slate-950 font-bold">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-baseline tracking-tight font-bold text-xl">
              <span className="text-white">Ad</span>
              <span className="text-[#00d67d]">Optimize</span>
            </div>
          </div>

          <button
            onClick={onOpenLanding}
            title="View Public Marketing Site"
            className="text-xs text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
          >
            <span className="hidden xl:inline text-[11px] font-medium text-slate-400">Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-150 ${
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

      {/* Bottom Section */}
      <div className="p-5 flex flex-col gap-3 border-t border-slate-800/60">
        {/* Safe AI Status Card */}
        <div className="bg-slate-900/90 rounded-2xl p-3.5 border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-[#00d67d]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">AI Safeguards Active</div>
            <div className="text-[11px] text-slate-400 truncate">Max shift limit: ±15%</div>
          </div>
        </div>

        {/* Secondary Links */}
        <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-400">
          <button
            onClick={() => onSelectTab('settings')}
            className="flex items-center gap-2 hover:text-white transition-colors py-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Help & Docs</span>
          </button>
          <span className="text-[11px] font-mono text-slate-400">v2.4 Pro</span>
        </div>
      </div>
    </aside>
  );
}
