'use client';

import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ArrowRight,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { BudgetRecommendation, Campaign } from '@/types/adoptimize';

interface BudgetOptimizerViewProps {
  recommendations: BudgetRecommendation[];
  campaigns: Campaign[];
  onApproveRecommendation: (rec: BudgetRecommendation) => void;
  onRejectRecommendation: (recId: string) => void;
}

export function BudgetOptimizerView({
  recommendations,
  campaigns,
  onApproveRecommendation,
  onRejectRecommendation,
}: BudgetOptimizerViewProps) {
  const pendingRecs = recommendations.filter((r) => r.status === 'PENDING');
  const pastRecs = recommendations.filter((r) => r.status !== 'PENDING');

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 text-xs font-semibold mb-3">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Cross-Campaign Capital Allocator</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Budget Optimizer & Capital Rebalancer
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Eliminate wasted spend by reallocating ad budget from low-ROAS bleeders to high-converting search volume with unmet demand. No silent changes — requires human approval.
          </p>
        </div>

        {/* Safeguard Assurance */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00d67d]" />
            <span>Safeguard: Single change cap ±15%–30% · Audit log recorded</span>
          </div>
          <div className="text-slate-400">
            {pendingRecs.length} pending reallocation proposals
          </div>
        </div>
      </div>

      {/* Current Campaign Budgets & ROAS Distribution Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-4">
          Current Budget & ROAS Distribution
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {campaigns.map((c) => {
            const isWinner = c.roas >= 4.0;
            const isBleeder = c.roas < 1.0;

            return (
              <div
                key={c.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isWinner
                    ? 'bg-emerald-50/40 border-emerald-200/80'
                    : isBleeder
                    ? 'bg-rose-50/40 border-rose-200/80'
                    : 'bg-slate-50 border-slate-200/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                    {c.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isWinner
                        ? 'bg-emerald-100 text-emerald-800'
                        : isBleeder
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {c.roas.toFixed(2)}x ROAS
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between text-xs font-mono">
                  <span className="text-slate-500 font-sans">Daily Budget:</span>
                  <span className="font-bold text-slate-900">${c.budgetDaily.toFixed(2)}/day</span>
                </div>

                <div className="mt-1 flex items-baseline justify-between text-xs font-mono">
                  <span className="text-slate-500 font-sans">Current CPA:</span>
                  <span className={`font-semibold ${isBleeder ? 'text-rose-600' : 'text-slate-800'}`}>
                    ${c.cpa.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Reallocation Proposals */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          Recommended Reallocations ({pendingRecs.length})
        </h3>

        {pendingRecs.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-900">Budgets are currently optimal</div>
            <div className="text-xs text-slate-500 mt-0.5">
              All active campaigns are operating within their target efficiency bands.
            </div>
          </div>
        ) : (
          pendingRecs.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-6 hover:border-slate-300 transition-colors"
            >
              {/* Shift Visualizer: Campaign A -> Campaign B */}
              <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                {/* From Campaign (Cut Budget) */}
                <div className="w-full md:w-5/12 bg-white p-4 rounded-xl border border-rose-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-rose-700 uppercase tracking-wider text-[11px]">
                      Reduce Budget From:
                    </span>
                    <span className="font-mono text-rose-600 font-bold">
                      {rec.supportingMetrics.fromRoas.toFixed(2)}x ROAS
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {rec.campaignFromName}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 font-sans">Current:</span>
                    <span className="line-through text-slate-400">${rec.currentBudgetFrom}/day</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-700 font-sans font-bold">New Proposed:</span>
                    <span className="font-bold text-rose-700 text-sm">${rec.proposedBudgetFrom}/day</span>
                  </div>
                </div>

                {/* Arrow / Shift Badge */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[#00d67d] text-slate-950 flex items-center justify-center font-bold shadow-md shadow-[#00d67d]/20">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 mt-1">
                    +${rec.reallocatedAmount}/day
                  </span>
                </div>

                {/* To Campaign (Increase Budget) */}
                <div className="w-full md:w-5/12 bg-white p-4 rounded-xl border border-emerald-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-emerald-700 uppercase tracking-wider text-[11px]">
                      Reallocate Capital To:
                    </span>
                    <span className="font-mono text-emerald-700 font-bold">
                      {rec.supportingMetrics.toRoas.toFixed(2)}x ROAS
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {rec.campaignToName}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 font-sans">Current:</span>
                    <span className="text-slate-500">${rec.currentBudgetTo}/day</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-700 font-sans font-bold">New Proposed:</span>
                    <span className="font-bold text-emerald-700 text-sm">${rec.proposedBudgetTo}/day</span>
                  </div>
                </div>
              </div>

              {/* Reason & Supporting Data */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Audited Reallocation Reason
                </div>
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {rec.reason}
                </div>
              </div>

              {/* Estimated Impact & Approval Controls */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-500">Projected Value Impact:</span>
                  <span className="font-bold text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    {rec.estimatedMonthlyImpact}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => onRejectRecommendation(rec.id)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => onApproveRecommendation(rec)}
                    className="px-5 py-2 bg-slate-950 hover:bg-slate-900 text-[#00d67d] font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Update Google Ads</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* History of Applied Reallocations */}
      {pastRecs.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Executed Reallocation History
          </h4>
          <div className="divide-y divide-slate-100 text-xs">
            {pastRecs.map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{r.campaignFromName}</span>
                  <span className="text-slate-400 mx-1.5">→</span>
                  <span className="font-bold text-slate-900">{r.campaignToName}</span>
                  <span className="text-slate-400 ml-2">(${r.reallocatedAmount}/day shifted)</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
