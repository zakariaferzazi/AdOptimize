'use client';

import React from 'react';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Search,
  ExternalLink,
  Sliders,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { InteractiveRecommendation } from '@/types/adoptimize';

interface RecommendationCardProps {
  recommendation: InteractiveRecommendation;
  onActionClick: (prompt: string) => void;
  onCampaignClick?: (campaignName: string) => void;
}

export function RecommendationCard({
  recommendation,
  onActionClick,
  onCampaignClick,
}: RecommendationCardProps) {
  const isWastedSpend = recommendation.type === 'WASTED_SPEND';
  const isBudgetOpportunity = recommendation.type === 'BUDGET_OPPORTUNITY';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all space-y-4">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isWastedSpend
                ? 'bg-rose-50 text-rose-600 border border-rose-200'
                : isBudgetOpportunity
                ? 'bg-emerald-50 text-[#00a85e] border border-emerald-200'
                : 'bg-amber-50 text-amber-600 border border-amber-200'
            }`}
          >
            {isWastedSpend ? (
              <TrendingDown className="w-4 h-4" />
            ) : isBudgetOpportunity ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
          </div>
          <div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                isWastedSpend
                  ? 'bg-rose-100 text-rose-800'
                  : isBudgetOpportunity
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {recommendation.title}
            </span>
            <div className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              <span>Campaign:</span>
              {onCampaignClick ? (
                <button
                  onClick={() => onCampaignClick(recommendation.campaignName)}
                  className="text-slate-950 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{recommendation.campaignName}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
              ) : (
                <span className="text-slate-950">{recommendation.campaignName}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Finding Statement */}
      <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3 rounded-2xl border border-slate-200/70">
        <span className="font-bold text-slate-900 block mb-0.5">Finding:</span>
        <p>{recommendation.finding}</p>
      </div>

      {/* Metric Badges if present */}
      {recommendation.metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.isArray(recommendation.metrics) ? (
            (recommendation.metrics as any[]).map((m, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-center"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {m.label}
                </div>
                <div className="text-xs font-bold font-mono text-slate-900 mt-0.5">
                  {m.value}
                </div>
              </div>
            ))
          ) : (
            <>
              {recommendation.metrics.spend !== undefined && (
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Spend</div>
                  <div className="text-xs font-bold font-mono text-slate-900 mt-0.5">${recommendation.metrics.spend.toLocaleString()}</div>
                </div>
              )}
              {recommendation.metrics.conversions !== undefined && (
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conversions</div>
                  <div className="text-xs font-bold font-mono text-slate-900 mt-0.5">{recommendation.metrics.conversions}</div>
                </div>
              )}
              {recommendation.metrics.cpa !== undefined && (
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CPA</div>
                  <div className="text-xs font-bold font-mono text-slate-900 mt-0.5">${recommendation.metrics.cpa.toFixed(2)}</div>
                </div>
              )}
              {recommendation.metrics.roas !== undefined && (
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ROAS</div>
                  <div className="text-xs font-bold font-mono text-slate-900 mt-0.5">{recommendation.metrics.roas.toFixed(2)}x</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Recommended Action Buttons */}
      {((recommendation.actions && recommendation.actions.length > 0) || ((recommendation as any).recommendedActions && (recommendation as any).recommendedActions.length > 0)) && (
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Recommended Actions:
          </div>
          <div className="flex flex-wrap gap-2">
            {(recommendation.actions || (recommendation as any).recommendedActions).map((act: any, actIdx: number) => (
              <button
                key={actIdx}
                onClick={() => onActionClick(act.prompt)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  act.isPrimary || act.variant === 'primary'
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : act.variant === 'danger'
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 hover:border-slate-300'
                }`}
              >
                <span>{act.label}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
