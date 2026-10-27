'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Send,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Target,
  AlertTriangle,
  TrendingUp,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { Campaign, GoogleAdsAccount, AnomalyAlert, DateRangePeriod } from '@/types/adoptimize';
import {
  calculateCampaignsMetrics,
  getCampaignPeriodMetrics,
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
  userEmail,
  userId,
  accessToken,
  period = 'LAST_7_DAYS',
  customDays = 14,
}: CompactAiAssistantProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [latestAnswer, setLatestAnswer] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);

  // Compute live, strictly grounded metrics for the active period & campaigns
  const { current: periodMetrics } = useMemo(() => {
    return calculateCampaignsMetrics(campaigns, period, customDays);
  }, [campaigns, period, customDays]);

  // Specific campaign findings based on the selected period
  const { periodLabel, wastedSpendCampaigns, topPerformer } = useMemo(() => {
    let label = 'Last 7 Days';
    switch (period) {
      case 'TODAY': label = 'Today'; break;
      case 'YESTERDAY': label = 'Yesterday'; break;
      case 'LAST_2_DAYS': label = 'Last 2 Days'; break;
      case 'LAST_7_DAYS': label = 'Last 7 Days'; break;
      case 'LAST_14_DAYS': label = 'Last 14 Days'; break;
      case 'LAST_30_DAYS': label = 'Last 30 Days'; break;
      case 'THIS_MONTH': label = 'This Month'; break;
      case 'LAST_MONTH': label = 'Last Month'; break;
      case 'CUSTOM': label = `Custom (${customDays}d)`; break;
      case 'ALL_TIME': label = 'All Time'; break;
    }

    const campaignPeriodList = campaigns.map((c) => ({
      campaign: c,
      metrics: getCampaignPeriodMetrics(c, period, customDays),
    }));

    // Find campaigns spending without conversions in this period
    const wasted = campaignPeriodList.filter(
      (item) => item.metrics.spend > 20 && item.metrics.conversions === 0
    );

    // Top performer by ROAS (with min spend)
    const sortedByRoas = [...campaignPeriodList]
      .filter((item) => item.metrics.spend > 0)
      .sort((a, b) => (b.metrics.roas || 0) - (a.metrics.roas || 0));

    return {
      periodLabel: label,
      wastedSpendCampaigns: wasted,
      topPerformer: sortedByRoas[0] || null,
    };
  }, [campaigns, period, customDays]);

  const suggestedPrompts = [
    {
      label: 'Find wasted spend',
      prompt: `Analyze my campaigns for ${periodLabel} and identify keywords or campaigns spending budget without generating conversions.`,
    },
    {
      label: 'Analyze my campaigns',
      prompt: `Provide an executive performance analysis for my Google Ads campaigns during ${periodLabel} with key risks and upside opportunities.`,
    },
    {
      label: 'Optimize my budget',
      prompt: `Recommend optimal daily budget reallocations based on ${periodLabel} ROAS and CPA performance across my active campaigns.`,
    },
  ];

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || isLoading) return;

    setActivePrompt(promptText);
    setQuery('');
    setIsLoading(true);
    setLatestAnswer(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          model: 'deepseek',
          modelTier: 'deepseek',
          conversationHistory: [],
          context: {
            userId,
            account,
            campaigns,
            anomalies,
            accessToken,
            selectedPeriod: period,
            periodMetrics,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate response');
      }

      const data = await res.json();
      setLatestAnswer(data.reply || 'Analysis completed.');
    } catch {
      setLatestAnswer(
        `Analysis for ${periodLabel}: Total ad spend is ${formatCurrency(
          periodMetrics.spend,
          account.currency
        )} generating ${periodMetrics.conversions} conversions (${periodMetrics.roas.toFixed(
          2
        )}x ROAS). Open the Full Chat for customized bidding adjustments.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleSendPrompt(query);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 select-none">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-sky-500 p-0.5 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">AdOptimize AI</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-500">Google Ads Optimization Copilot</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200">
              {periodLabel}
            </span>
            <Link
              href="/chat"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
            >
              <span>Full Chat</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Real Data Performance Summary */}
        <div className="mt-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-700 space-y-2 leading-relaxed">
          <div className="text-[11px] font-bold text-slate-900 flex items-center justify-between">
            <span>{periodLabel} Real Account Summary</span>
            <span className="font-mono text-emerald-700 font-semibold">
              {campaigns.length} {campaigns.length === 1 ? 'Campaign' : 'Campaigns'}
            </span>
          </div>

          {campaigns.length > 0 ? (
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-2 py-1 border-y border-slate-200/60 font-mono text-[11px]">
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Spend</span>
                  <strong className="text-slate-900">
                    {formatCurrency(periodMetrics.spend, account.currency, 0)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">Conversions</span>
                  <strong className="text-slate-900">{periodMetrics.conversions}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-sans text-slate-400 block">ROAS</span>
                  <strong className="text-emerald-700">{periodMetrics.roas.toFixed(2)}x</strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-600">
                {wastedSpendCampaigns.length > 0 ? (
                  <span className="text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>
                      {wastedSpendCampaigns.length} campaign{wastedSpendCampaigns.length > 1 ? 's' : ''} spent{' '}
                      <strong>
                        {formatCurrency(
                          wastedSpendCampaigns.reduce((s, i) => s + i.metrics.spend, 0),
                          account.currency,
                          0
                        )}
                      </strong>{' '}
                      with 0 conversions in {periodLabel}.
                    </span>
                  </span>
                ) : topPerformer ? (
                  <span>
                    Top performer <strong>&ldquo;{topPerformer.campaign.name}&rdquo;</strong> delivered{' '}
                    <strong>{topPerformer.metrics.roas.toFixed(2)}x ROAS</strong> with {topPerformer.metrics.conversions} conversions.
                  </span>
                ) : (
                  <span>Performance tracking active across selected Google Ads campaigns.</span>
                )}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">
              Connect an active Google Ads account to generate automated real-time diagnosis and performance insights.
            </p>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="mt-3 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Suggested Analyses
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendPrompt(p.prompt)}
                disabled={isLoading}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200/90 rounded-xl text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer text-left shadow-2xs hover:border-slate-300 disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Answer Preview (if query submitted) */}
        {latestAnswer && (
          <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-200/70 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between font-bold text-emerald-950 text-[11px]">
              <span className="truncate max-w-[200px]">{activePrompt || 'Analysis'}</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                AdOptimize AI
              </span>
            </div>
            <p className="text-[11px] text-slate-800 leading-relaxed max-h-36 overflow-y-auto pr-1">
              {latestAnswer}
            </p>
            <div className="pt-1 border-t border-emerald-200/60 flex items-center justify-between text-[10px]">
              <span className="text-emerald-800">Need multi-step automated adjustments?</span>
              <Link
                href="/chat"
                className="font-bold text-emerald-900 hover:underline flex items-center gap-0.5"
              >
                <span>Open in Full Chat</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Input Field Form */}
      <form onSubmit={handleFormSubmit} className="pt-2 border-t border-slate-100">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask AdOptimize AI about your campaigns..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d67d] focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-1.5 p-1.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
            title="Ask AI"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00d67d]" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#00d67d]" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
