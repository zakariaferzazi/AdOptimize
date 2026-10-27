'use client';

import React from 'react';
import Image from 'next/image';
import { ShieldCheck, Wifi, TrendingUp, Sliders } from 'lucide-react';
import { GoogleAdsAccount } from '@/types/adoptimize';
import { getCurrencySymbol } from '@/lib/metrics-calculator';

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
  const isConnected = account.isConnected && account.clientCustomerId !== 'Not Connected';

  return (
    <div className="bg-slate-950 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-800/80 flex flex-col justify-between h-[230px] select-none group">
      {/* Background Decorative Contours */}
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
          <Image
            src="/icon.svg"
            alt="AdOptimize Logo"
            width={24}
            height={24}
            className="w-6 h-6 rounded-lg object-contain shadow-xs shadow-[#00d67d]/20"
            referrerPolicy="no-referrer"
          />
          <div className="text-sm font-bold tracking-tight flex items-center">
            <span className="text-white">Ad</span>
            <span className="text-[#00d67d]">Optimize</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Wifi className={`w-4 h-4 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}`} />
          <span className="text-[11px] font-mono font-medium text-slate-400">
            {account.currency || 'USD'}
          </span>
        </div>
      </div>

      {/* Middle: Formatted Account ID */}
      <div className="z-10 my-auto">
        <div className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
          Google Ads Account
        </div>
        <div className="text-xl font-mono tracking-wider font-bold text-white mt-1 flex items-center gap-2">
          <span>{account.clientCustomerId || 'Not Connected'}</span>
          {isConnected ? (
            <span className="text-[11px] text-[#00d67d] font-sans font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00d67d] animate-pulse" />
              <span>Live</span>
            </span>
          ) : (
            <button
              onClick={onOpenSettings}
              className="text-xs text-amber-400 hover:text-amber-300 font-sans font-semibold underline decoration-amber-400/50 cursor-pointer"
            >
              Connect Account
            </button>
          )}
        </div>
        {account.accountName && account.accountName !== 'Google Ads Account' && (
          <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
            {account.accountName}
          </div>
        )}
      </div>

      {/* Bottom: Real Tracked Spend & Actions */}
      <div className="z-10 pt-3 border-t border-slate-800/80 flex items-end justify-between">
        <div>
          <div className="text-[11px] text-slate-400 font-medium">
            30-Day Tracked Ad Spend
          </div>
          <div className="text-lg font-bold font-mono text-[#00d67d] mt-0.5">
            {getCurrencySymbol(account.currency)}{totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenOptimizer}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3 h-3 text-[#00d67d]" />
            <span>Optimizer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
