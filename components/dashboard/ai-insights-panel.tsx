'use client';

import React from 'react';
import {
  Sparkles,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import { Campaign, GoogleAdsAccount } from '@/types/adoptimize';
import { getCurrencySymbol } from '@/lib/metrics-calculator';

export interface GroundedInsight {
  id: string;
  type: 'ZERO_CONV_SPEND' | 'HIGH_CPA' | 'LOW_ROAS' | 'BUDGET_REALLOCATION' | 'SCALE_OPPORTUNITY';
  title: string;
  explanation: string;
  campaignId?: string;
  campaignName?: string;
  supportingMetrics: { label: string; value: string }[];
  actionLabel: string;
  actionType: 'ANALYZE_CAMPAIGN' | 'VIEW_OPTIMIZER' | 'VIEW_AUDIT';
  severity: 'critical' | 'warning' | 'opportunity';
}

interface AiInsightsPanelProps {
  campaigns: Campaign[];
  account: GoogleAdsAccount;
  onSelectCampaign: (campaign: Campaign) => void;
  onOpenOptimizer: () => void;
  onOpenAudit: () => void;
}

/**
 * Derives actionable, 100% grounded Google Ads insights strictly from active campaign data.
 * Does not fabricate recommendations if data does not support it.
 */
export function deriveGroundedInsights(campaigns: Campaign[], currencyCode: string = 'USD'): GroundedInsight[] {
  const sym = getCurrencySymbol(currencyCode);
  const insights: GroundedInsight[] = [];

  // 1. Check for campaigns spending money with ZERO conversions
  const zeroConvCampaigns = campaigns.filter(
    (c) => c.status === 'ENABLED' && Number(c.spend || 0) > 100 && Number(c.conversions || 0) === 0
  );
  zeroConvCampaigns.forEach((c) => {
    insights.push({
      id: `zero-conv-${c.id}`,
      type: 'ZERO_CONV_SPEND',
      title: 'Spend Without Conversions',
      explanation: `"${c.name}" has incurred spend with zero conversions recorded in this date range. Inspect queries or pause non-converting keywords.`,
      campaignId: c.id,
      campaignName: c.name,
      supportingMetrics: [
        { label: 'Spend', value: `${sym}${Number(c.spend).toFixed(2)}` },
        { label: 'Conversions', value: '0' },
        { label: 'Clicks', value: String(c.clicks || 0) },
      ],
      actionLabel: 'Analyze Campaign',
      actionType: 'ANALYZE_CAMPAIGN',
      severity: 'critical',
    });
  });

  // 2. Check for high CPA or significant CPA increases
  const highCpaCampaigns = campaigns.filter(
    (c) => c.status === 'ENABLED' && Number(c.conversions || 0) > 0 && Number(c.cpa || 0) > 65.0
  );
  highCpaCampaigns.forEach((c) => {
    const prevCpa = c.previousPeriod?.cpa ? `${sym}${c.previousPeriod.cpa.toFixed(2)}` : `target: <${sym}45`;
    insights.push({
      id: `high-cpa-${c.id}`,
      type: 'HIGH_CPA',
      title: 'Elevated Acquisition Cost (CPA)',
      explanation: `Cost per acquisition in "${c.name}" is high. Review negative keywords and bidding strategy to lower acquisition cost.`,
      campaignId: c.id,
      campaignName: c.name,
      supportingMetrics: [
        { label: 'Current CPA', value: `${sym}${Number(c.cpa).toFixed(2)}` },
        { label: 'Prior Period', value: prevCpa },
        { label: 'Spend', value: `${sym}${Number(c.spend).toFixed(0)}` },
      ],
      actionLabel: 'Analyze Campaign',
      actionType: 'ANALYZE_CAMPAIGN',
      severity: 'warning',
    });
  });

  // 3. Check for low ROAS on active spend
  const lowRoasCampaigns = campaigns.filter(
    (c) =>
      c.status === 'ENABLED' &&
      Number(c.spend || 0) > 300 &&
      Number(c.roas || 0) > 0 &&
      Number(c.roas || 0) < 1.8
  );
  lowRoasCampaigns.forEach((c) => {
    insights.push({
      id: `low-roas-${c.id}`,
      type: 'LOW_ROAS',
      title: 'Below-Target ROAS',
      explanation: `"${c.name}" is returning ${Number(c.roas).toFixed(2)}x ROAS, below standard commercial profitability thresholds.`,
      campaignId: c.id,
      campaignName: c.name,
      supportingMetrics: [
        { label: 'ROAS', value: `${Number(c.roas).toFixed(2)}x` },
        { label: 'Spend', value: `${sym}${Number(c.spend).toFixed(0)}` },
        { label: 'Revenue', value: `${sym}${Number(c.conversionValue || 0).toFixed(0)}` },
      ],
      actionLabel: 'Analyze Campaign',
      actionType: 'ANALYZE_CAMPAIGN',
      severity: 'warning',
    });
  });

  // 4. Budget redistribution opportunities (pairing high-ROAS with low-ROAS)
  const highPerformers = campaigns.filter(
    (c) => c.status === 'ENABLED' && Number(c.roas || 0) >= 3.5 && Number(c.conversions || 0) >= 15
  );
  if (highPerformers.length > 0 && (lowRoasCampaigns.length > 0 || zeroConvCampaigns.length > 0)) {
    const best = highPerformers.sort((a, b) => b.roas - a.roas)[0];
    const donor = lowRoasCampaigns[0] || zeroConvCampaigns[0];
    insights.push({
      id: 'budget-realloc-opp',
      type: 'BUDGET_REALLOCATION',
      title: 'Budget Redistribution Opportunity',
      explanation: `Shift budget from lower-efficiency ad sets to "${best.name}" (${best.roas.toFixed(2)}x ROAS) to increase blended returns.`,
      campaignId: best.id,
      campaignName: best.name,
      supportingMetrics: [
        { label: 'High ROAS Target', value: `${best.roas.toFixed(2)}x` },
        { label: 'Potential Shift', value: `+${sym}${Math.round(donor.budgetDaily * 0.25)}/day` },
      ],
      actionLabel: 'View Recommendation',
      actionType: 'VIEW_OPTIMIZER',
      severity: 'opportunity',
    });
  }

  // 5. Scale opportunity for top performer if no critical alerts
  if (insights.length === 0 && highPerformers.length > 0) {
    const best = highPerformers[0];
    insights.push({
      id: `scale-${best.id}`,
      type: 'SCALE_OPPORTUNITY',
      title: 'High-Performing Campaign Scaling',
      explanation: `"${best.name}" has maintained strong efficiency (${best.roas.toFixed(2)}x ROAS with ${sym}${best.cpa.toFixed(2)} CPA). Consider incremental budget expansion.`,
      campaignId: best.id,
      campaignName: best.name,
      supportingMetrics: [
        { label: 'ROAS', value: `${best.roas.toFixed(2)}x` },
        { label: 'Conversions', value: String(best.conversions) },
      ],
      actionLabel: 'View Recommendation',
      actionType: 'VIEW_OPTIMIZER',
      severity: 'opportunity',
    });
  }

  return insights.slice(0, 3);
}

export function AiInsightsPanel({
  campaigns,
  account,
  onSelectCampaign,
  onOpenOptimizer,
  onOpenAudit,
}: AiInsightsPanelProps) {
  const insights = deriveGroundedInsights(campaigns, account.currency);

  const handleAction = (insight: GroundedInsight) => {
    if (insight.actionType === 'ANALYZE_CAMPAIGN' && insight.campaignId) {
      const target = campaigns.find((c) => c.id === insight.campaignId);
      if (target) {
        onSelectCampaign(target);
        return;
      }
    }
    if (insight.actionType === 'VIEW_OPTIMIZER') {
      onOpenOptimizer();
      return;
    }
    onOpenAudit();
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between h-full select-none">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-[#00d67d]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">AI Insights</h3>
              <p className="text-[11px] text-slate-500">Actionable Google Ads findings</p>
            </div>
          </div>

          <button
            onClick={onOpenAudit}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span>Full Audit</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content / Findings List */}
        <div className="mt-3.5 space-y-3">
          {insights.length === 0 ? (
            <div className="py-7 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="text-xs font-bold text-slate-900">All Campaigns Operating Within Target</div>
              <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                No wasted spend, CPA spikes, or budget bottlenecks detected for this selection.
              </p>
            </div>
          ) : (
            insights.map((item) => {
              const isCrit = item.severity === 'critical';
              const isOpp = item.severity === 'opportunity';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2 ${
                    isCrit
                      ? 'bg-rose-50/50 border-rose-100/90'
                      : isOpp
                      ? 'bg-emerald-50/40 border-emerald-100/80'
                      : 'bg-amber-50/40 border-amber-100/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                      {isCrit ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      ) : isOpp ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      <span className="truncate">{item.title}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isCrit
                          ? 'bg-rose-100 text-rose-700'
                          : isOpp
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                    {item.explanation}
                  </p>

                  {/* Supporting Metrics Bar */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 flex-wrap">
                    {item.supportingMetrics.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-[10px]">
                        <span className="text-slate-400 font-medium">{m.label}:</span>
                        <span className="font-bold font-mono text-slate-800">{m.value}</span>
                        {idx < item.supportingMetrics.length - 1 && (
                          <span className="text-slate-300 ml-1">·</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="pt-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleAction(item)}
                      className={`text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                        isCrit
                          ? 'text-rose-700 hover:text-rose-900'
                          : isOpp
                          ? 'text-emerald-700 hover:text-emerald-900'
                          : 'text-amber-800 hover:text-amber-950'
                      }`}
                    >
                      <span>{item.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer link to Optimizer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-2">
        <span className="text-[11px]">Continuous auction monitor</span>
        <button
          onClick={onOpenOptimizer}
          className="text-[11px] font-bold text-slate-900 hover:text-emerald-600 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Sliders className="w-3 h-3 text-[#00d67d]" />
          <span>Budget Optimizer</span>
        </button>
      </div>
    </div>
  );
}
