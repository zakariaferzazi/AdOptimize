'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Sliders,
  Send,
  Loader2,
  Bot,
  User as UserIcon,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
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

const SUGGESTED_PROMPTS = [
  'Find wasted spend',
  'Analyze my campaigns',
  'Optimize my budget',
];

export function CompactAiAssistant({
  account,
  campaigns,
  anomalies = [],
  userEmail,
  userId,
  accessToken,
  period = 'LAST_7_DAYS',
  customDays = 14,
}: CompactAiAssistantProps) {
  const router = useRouter();
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  // One-line dynamic performance summary based on real account metrics
  const performanceSummary = useMemo(() => {
    if (campaigns.length === 0) {
      return 'No campaigns active yet in this connected Google Ads account.';
    }
    const sym = getCurrencySymbol(account.currency);
    const activeCount = campaigns.filter((c) => c.status === 'ENABLED').length;
    const spendStr = `${sym}${periodMetrics.spend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return `${activeCount} active ${activeCount === 1 ? 'campaign' : 'campaigns'} generated ${periodMetrics.conversions} conversions from ${spendStr} spend (${periodMetrics.roas.toFixed(2)}x ROAS, ${sym}${periodMetrics.cpa.toFixed(2)} CPA) over ${periodLabel.toLowerCase()}.`;
  }, [campaigns, periodMetrics, periodLabel, account.currency]);

  const handleAsk = async (promptText: string) => {
    const q = promptText.trim();
    if (!q || isLoading) return;

    setInputVal('');
    setLastPrompt(q);
    setIsLoading(true);
    setResponse(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: q,
            },
          ],
          model: 'deepseek',
          accountContext: {
            customerId: account.clientCustomerId,
            accountName: account.accountName,
            currency: account.currency,
            campaignsCount: campaigns.length,
            campaigns: campaigns.slice(0, 15).map((c) => ({
              id: c.id,
              name: c.name,
              status: c.status,
              spend: c.spend,
              conversions: c.conversions,
              cpa: c.cpa,
              roas: c.roas,
              budgetDaily: c.budgetDaily,
            })),
            anomaliesCount: anomalies.length,
          },
          userEmail: userEmail || undefined,
          userId: userId || undefined,
          accessToken: accessToken || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setResponse(data.text);
      } else {
        setErrorMsg(data.error || 'Failed to analyze account. Please try again.');
      }
    } catch {
      setErrorMsg('Could not connect to AI assistant. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk(inputVal);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 select-none">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.svg"
              alt="AdOptimize AI"
              width={36}
              height={36}
              className="w-9 h-9 rounded-xl object-contain shadow-xs shadow-[#00d67d]/20 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">AdOptimize AI</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-500">Google Ads Optimization Assistant</p>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200/70">
            {periodLabel}
          </span>
        </div>

        {/* Real Performance Summary Banner */}
        <div className="mt-3.5 p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-700 space-y-2">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-800 font-medium leading-relaxed">
              {performanceSummary}
            </p>
          </div>

          {/* Quick Metrics Strip */}
          {campaigns.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">Spend</span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {formatCurrency(periodMetrics.spend, account.currency, 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">Conversions</span>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {periodMetrics.conversions}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">ROAS</span>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {periodMetrics.roas.toFixed(2)}x
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="mt-3 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Suggested Actions
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleAsk(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Response Area (if active query) */}
        {(isLoading || response || errorMsg) && (
          <div className="mt-3 p-3 bg-emerald-50/40 rounded-2xl border border-emerald-200/70 text-xs space-y-2 animate-in fade-in duration-150">
            {lastPrompt && (
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <span className="text-emerald-700">Q:</span>
                <span className="truncate">{lastPrompt}</span>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-600 py-2">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                <span className="text-[11px] font-medium">Analyzing real Google Ads metrics...</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 text-rose-600 py-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-[11px]">{errorMsg}</span>
              </div>
            )}

            {response && (
              <div className="space-y-2">
                <p className="text-xs text-slate-800 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
                  {response}
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Live Google Ads Analysis
                  </span>
                  <Link
                    href="/chat"
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Continue in Full Chat</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Field */}
        <form onSubmit={handleFormSubmit} className="mt-3 relative">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask about your campaigns, wasted spend..."
            disabled={isLoading}
            className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d67d]/40 focus:bg-white transition-all shadow-2xs"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isLoading}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Send question to AdOptimize AI"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#00d67d]" />
            )}
          </button>
        </form>
      </div>

      {/* Direct Full Chat Link */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">Complex tasks & multi-step operations</span>
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <span>Open Full Chat</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#00d67d]" />
        </Link>
      </div>
    </div>
  );
}
