'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  ShieldAlert,
  BarChart2,
  Sliders,
} from 'lucide-react';
import { Campaign, GoogleAdsAccount, AnomalyAlert, DateRangePeriod } from '@/types/adoptimize';
import {
  calculateCampaignsMetrics,
  formatCurrency,
  getCurrencySymbol,
} from '@/lib/metrics-calculator';

interface CompactAiAssistantProps {
  account: GoogleAdsAccount;
  campaigns: Campaign[];
  anomalies?: AnomalyAlert[];
  userEmail?: string | null;
  userId?: string;
  accessToken?: string;
  period?: DateRangePeriod;
  customDays?: number;
}

export function CompactAiAssistant({
  account,
  campaigns,
  anomalies = [],
  period = 'LAST_7_DAYS',
  customDays = 14,
}: CompactAiAssistantProps) {
  // Compute live, accurate metrics for the active period & campaigns
  const { current: periodMetrics } = useMemo(() => {
    return calculateCampaignsMetrics(campaigns, period, customDays);
  }, [campaigns, period, customDays]);

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'TODAY': return 'Today';
      case 'YESTERDAY': return 'Yesterday';
      case 'LAST_2_DAYS': return 'Last 2 Days';
      case 'LAST_7_DAYS': return 'Last 7 Days';
      case 'LAST_14_DAYS': return 'Last 14 Days';
      case 'LAST_30_DAYS': return 'Last 30 Days';
      case 'THIS_MONTH': return 'This Month';
      case 'LAST_MONTH': return 'Last Month';
      case 'CUSTOM': return `Custom (${customDays}d)`;
      case 'ALL_TIME': return 'All Time';
      default: return 'Last 7 Days';
    }
  }, [period, customDays]);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 select-none">
      {/* Top Header with original /icon.svg */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.svg"
              alt="AdOptimize AI"
              width={36}
              height={36}
              className="w-9 h-9 rounded-xl object-contain shadow-xs shadow-[#00d67d]/20"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">AdOptimize AI</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-500">Google Ads Optimization Copilot</p>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200/70">
            {periodLabel}
          </span>
        </div>

        {/* Clear Explanation: Chat with AdOptimize AI to do anything in Google Ads */}
        <div className="mt-3.5 space-y-3">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-700 space-y-2 leading-relaxed">
            <p className="text-xs text-slate-800 font-medium leading-relaxed">
              Chat directly with <strong className="text-slate-950 font-bold">AdOptimize AI</strong> to do anything in your Google Ads account:
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-600">
              <li className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Find and eliminate wasted spend from non-converting queries</span>
              </li>
              <li className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Reallocate daily budgets to highest ROAS campaigns</span>
              </li>
              <li className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Mine negative keywords and adjust CPA bid targets</span>
              </li>
              <li className="flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Run deep performance audits and diagnose sudden CPA spikes</span>
              </li>
            </ul>
          </div>

          {/* Real Data Snapshot for Current Period */}
          {campaigns.length > 0 && (
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  {periodLabel} Spend
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(periodMetrics.spend, account.currency, 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  Conversions
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {periodMetrics.conversions}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                  ROAS
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  {periodMetrics.roas.toFixed(2)}x
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Direct Button: Go to AI Chat Page */}
      <div className="pt-2">
        <Link
          href="/chat"
          className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 group cursor-pointer"
        >
          <span>Open AI Chat</span>
          <ArrowRight className="w-4 h-4 text-[#00d67d] group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
