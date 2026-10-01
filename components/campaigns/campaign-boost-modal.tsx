'use client';

import React, { useState } from 'react';
import { X, Sparkles, TrendingUp, ShieldAlert, Target, DollarSign, CheckCircle2, Zap } from 'lucide-react';
import { Campaign } from '@/types/adoptimize';

interface CampaignBoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onApplyBoost: (
    campaignId: string,
    boostType: string,
    boostDetails: { newBudget?: number; newRoas?: number; newCpa?: number; description: string }
  ) => Promise<void>;
}

export function CampaignBoostModal({
  isOpen,
  onClose,
  campaign,
  onApplyBoost,
}: CampaignBoostModalProps) {
  const [selectedBoost, setSelectedBoost] = useState<string>('ROAS_SCALE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !campaign) return null;

  const boostOptions = [
    {
      id: 'ROAS_SCALE',
      title: 'Auto-Scale High-ROAS Performance',
      icon: TrendingUp,
      badge: 'Recommended',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      description: `Increase daily budget by +15% ($${(campaign.budgetDaily * 1.15).toFixed(2)}/day) and allocate +20% bid adjustment during high-converting search hours.`,
      expectedOutcome: `+18% projected conversions, aiming for ${(campaign.roas * 1.08).toFixed(2)}x ROAS.`,
      compute: () => ({
        newBudget: Number((campaign.budgetDaily * 1.15).toFixed(2)),
        newRoas: Number((campaign.roas * 1.08).toFixed(2)),
        description: `Scaled budget from $${campaign.budgetDaily}/day to $${(campaign.budgetDaily * 1.15).toFixed(2)}/day with high-ROAS bid multiplier.`,
      }),
    },
    {
      id: 'CPA_REDUCE',
      title: 'CPA Compression & Efficiency Boost',
      icon: Target,
      badge: 'Cost Optimizer',
      badgeColor: 'bg-blue-100 text-blue-800',
      description: `Tighter target CPA bidding ($${(campaign.cpa * 0.9).toFixed(2)}) with automated negative keyword guard for irrelevant clicks.`,
      expectedOutcome: `Reduces blended CPA from $${campaign.cpa.toFixed(2)} to $${(campaign.cpa * 0.9).toFixed(2)} within 48h.`,
      compute: () => ({
        newCpa: Number((campaign.cpa * 0.9).toFixed(2)),
        description: `Optimized CPA target down to $${(campaign.cpa * 0.9).toFixed(2)} with negative match exclusions.`,
      }),
    },
    {
      id: 'WASTE_PRUNING',
      title: 'Waste Defense & Negative Term Pruning',
      icon: ShieldAlert,
      badge: 'Budget Saver',
      badgeColor: 'bg-amber-100 text-amber-800',
      description: 'Isolate queries with spend > $50 and 0 conversions. Redirect capital immediately to high-intent converting phrases.',
      expectedOutcome: 'Recovers an estimated $140/week in non-converting budget leakage.',
      compute: () => ({
        description: 'Pruned zero-converting queries and redirected saved funds into core phrase match keywords.',
      }),
    },
  ];

  const handleExecute = async () => {
    const chosen = boostOptions.find((b) => b.id === selectedBoost);
    if (!chosen) return;

    setIsSubmitting(true);
    try {
      const details = chosen.compute();
      await onApplyBoost(campaign.id, chosen.id, details);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Boost Campaign Performance</h3>
              <p className="text-xs text-slate-500">Autonomous Google Ads Optimization</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Campaign info */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Target Campaign: </span>
            <span className="font-bold text-slate-900">{campaign.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-600">${campaign.budgetDaily}/day</span>
            <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
              {campaign.roas}x ROAS
            </span>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
            Select Optimization Strategy
          </label>
          <div className="space-y-2.5">
            {boostOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedBoost === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedBoost(opt.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-slate-900 bg-slate-950 text-white shadow-md'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#00d67d]' : 'text-slate-700'}`} />
                      <span className="text-xs font-bold">{opt.title}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-slate-800 text-[#00d67d]' : opt.badgeColor}`}>
                      {opt.badge}
                    </span>
                  </div>
                  <p className={`text-xs mt-2 leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                    {opt.description}
                  </p>
                  <div className={`mt-2.5 pt-2 border-t text-[11px] font-medium flex items-center gap-1.5 ${
                    isSelected ? 'border-slate-800 text-emerald-400' : 'border-slate-100 text-emerald-600'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{opt.expectedOutcome}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleExecute}
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#00d67d]" />
            <span>{isSubmitting ? 'Applying Optimization...' : 'Execute Boost'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
