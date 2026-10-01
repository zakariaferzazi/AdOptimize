'use client';

import React from 'react';
import { ShieldCheck, Wifi, Sparkles, TrendingUp, Sliders } from 'lucide-react';
import { GoogleAdsAccount } from '@/types/adoptimize';

interface AccountMonitorCardProps {
  account: GoogleAdsAccount;
  totalSpend: number;
  onOpenSettings: () => void;
  onOpenOptimizer: () => void;
}

export function AccountMonitorCard({
  account,
  totalSpend,
  onOpenSettings,
  onOpenOptimizer,
}: AccountMonitorCardProps) {
  const cap = account.monthlySpendCap || 25000;
  const progressPercent = Math.min(100, Math.round((totalSpend / cap) * 100));

  return (
    <div className="bg-slate-950 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-800/80 flex flex-col justify-between h-[230px] select-none group">
      {/* Background Decorative Contours & Watermark (Matching stylized card in reference) */}
      <div className="absolute right-0 top-0 bottom-0 w-44 pointer-events-none opacity-10">
        <svg viewBox="0 0 200 200" className="w-full h-full stroke-white fill-none stroke-[1.5]">
          <circle cx="100" cy="100" r="40" />
          <circle cx="100" cy="100" r="70" />
          <circle cx="100" cy="100" r="100" />
          <path d="M 20 20 L 180 180 M 180 20 L 20 180" />
        </svg>
      </div>

      {/* Top Header of Card */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold tracking-tight flex items-center">
            <span className="text-white">Ad</span>
            <span className="text-[#00d67d]">Optimize</span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-[#00d67d] px-2 py-0.5 rounded-full border border-emerald-500/30">
            Live Guard
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Wifi className="w-4 h-4 text-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Middle: Formatted Customer ID (formatted like card numbers in reference) */}
      <div className="z-10 my-auto">
        <div className="text-xs text-slate-400 font-medium tracking-wide">
          GOOGLE ADS CLIENT ID
        </div>
        <div className="text-xl font-mono tracking-wider font-bold text-white mt-1 flex items-center gap-2">
          <span>{account.clientCustomerId || 'Not Connected'}</span>
          {account.isConnected && account.clientCustomerId !== 'Not Connected' ? (
            <span className="text-xs text-emerald-400 font-sans font-semibold">● Synced</span>
          ) : (
            <button
              onClick={onOpenSettings}
              className="text-xs text-amber-400 hover:text-amber-300 font-sans font-semibold underline decoration-amber-400/50 cursor-pointer"
            >
              ● Connect ID
            </button>
          )}
        </div>
      </div>

      {/* Bottom: Spend Cap & Safeguard status */}
      <div className="z-10 pt-3 border-t border-slate-800/80 flex items-end justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-medium">
            <span>Monthly Cap: ${cap.toLocaleString()}</span>
            <span className="text-[#00d67d] font-bold">{progressPercent}%</span>
          </div>
          <div className="w-36 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-[#00d67d] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <button
          onClick={onOpenOptimizer}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5"
        >
          <Sliders className="w-3 h-3 text-[#00d67d]" />
          <span>Optimize</span>
        </button>
      </div>
    </div>
  );
}
