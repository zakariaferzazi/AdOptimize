'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
  Info
} from 'lucide-react';
import { AIInsight } from '@/types/adoptimize';

interface InsightsViewProps {
  insights: AIInsight[];
  onApplyInsight: (insight: AIInsight) => void;
  onDismissInsight: (insightId: string) => void;
  onMarkReviewed: (insightId: string) => void;
}

export function InsightsView({
  insights,
  onApplyInsight,
  onDismissInsight,
  onMarkReviewed,
}: InsightsViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All Insights' },
    { id: 'CRITICAL_ISSUE', label: 'Critical Issues' },
    { id: 'BUDGET_OPPORTUNITY', label: 'Budget Opportunities' },
    { id: 'WASTED_SPEND', label: 'Wasted Spend' },
    { id: 'GROWTH_OPPORTUNITY', label: 'Growth Opportunities' },
    { id: 'PERFORMANCE_IMPROVEMENT', label: 'Performance' },
  ];

  const filtered = insights.filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Marketing Analyst · Strictly Grounded Root-Cause Engine</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Campaign Diagnostics & Evidence
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Every recommendation is calculated from your live Google Ads performance, query logs, and auction data. Never fabricated or speculative.
          </p>
        </div>

        {/* Filter bar inside header */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  categoryFilter === c.id
                    ? 'bg-[#00d67d] text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {['ALL', 'NEW', 'REVIEWED', 'APPLIED', 'DISMISSED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                  statusFilter === st
                    ? 'bg-white text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Insights Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No Insights Match Your Filter</h3>
            <p className="text-xs text-slate-500 mt-1">
              Switch filters to view all active recommendations or force refresh campaign data.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isApplied = item.status === 'APPLIED';
            const isDismissed = item.status === 'DISMISSED';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-3xl p-6 sm:p-7 border transition-all duration-200 shadow-xs space-y-5 ${
                  isApplied
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isDismissed
                    ? 'border-slate-200 opacity-60'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Header: Category, Campaign, Confidence & Status */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-xl uppercase tracking-wider ${
                        item.category === 'CRITICAL_ISSUE'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : item.category === 'BUDGET_OPPORTUNITY'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : item.category === 'WASTED_SPEND'
                          ? 'bg-amber-50 text-amber-800 border border-amber-100'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {item.category.replace('_', ' ')}
                    </span>

                    {item.campaignName && (
                      <span className="text-xs font-semibold text-slate-600">
                        {item.campaignName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-950 text-[#00d67d] rounded-xl flex items-center gap-1.5 shadow-2xs">
                      <span>{item.confidence}% Confidence</span>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        item.status === 'APPLIED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'DISMISSED'
                          ? 'bg-slate-200 text-slate-700'
                          : item.status === 'REVIEWED'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Grid: Problem & Why it matters */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Problem */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Problem Identified
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1 leading-snug">
                      {item.problem}
                    </div>
                  </div>

                  {/* Why It Matters */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Why It Matters (Financial Impact)
                    </div>
                    <div className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {item.whyItMatters}
                    </div>
                  </div>
                </div>

                {/* Concrete Evidence Strip */}
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Data Evidence · {item.evidence.metric}</span>
                    </div>
                    <div className="text-xs text-emerald-800 mt-1">
                      {item.evidence.context}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono font-bold">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-sans uppercase">Previous</div>
                      <div className="text-slate-700">{item.evidence.before}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="text-left">
                      <div className="text-[10px] text-slate-400 font-sans uppercase">Current</div>
                      <div className="text-slate-900">{item.evidence.current}</div>
                    </div>
                    <div className="px-2.5 py-1 bg-white rounded-xl border border-emerald-200 text-emerald-800 shadow-2xs">
                      {item.evidence.changePercent}
                    </div>
                  </div>
                </div>

                {/* Recommended Action & Impact */}
                <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-4">
                  <div className="max-w-xl">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#00d67d]">
                      Recommended Action
                    </div>
                    <div className="text-xs font-semibold text-white mt-1">
                      {item.recommendedAction}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      Expected Impact: {item.expectedImpact}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status !== 'APPLIED' && (
                      <button
                        onClick={() => onApplyInsight(item)}
                        className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#00d67d]/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-slate-950" />
                        <span>One-Click Apply</span>
                      </button>
                    )}

                    {item.status !== 'REVIEWED' && item.status !== 'APPLIED' && (
                      <button
                        onClick={() => onMarkReviewed(item.id)}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        Mark Reviewed
                      </button>
                    )}

                    {item.status !== 'DISMISSED' && item.status !== 'APPLIED' && (
                      <button
                        onClick={() => onDismissInsight(item.id)}
                        className="px-3 py-2 text-slate-400 hover:text-white rounded-xl text-xs transition-colors"
                      >
                        Dismiss
                      </button>
                    )}

                    {item.status === 'APPLIED' && (
                      <div className="flex items-center gap-1.5 text-xs text-[#00d67d] font-bold px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                        <Check className="w-4 h-4" />
                        <span>Applied to Account</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
