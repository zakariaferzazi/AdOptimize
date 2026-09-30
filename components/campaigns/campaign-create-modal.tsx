'use client';

import React, { useState } from 'react';
import { X, Layers, Plus, Sparkles, DollarSign, Target, Check } from 'lucide-react';
import { Campaign, CampaignType, CampaignGoal, Keyword } from '@/types/adoptimize';

interface CampaignCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onCreateCampaign: (campaign: Campaign, initialKeywords: Keyword[]) => Promise<void>;
}

export function CampaignCreateModal({
  isOpen,
  onClose,
  accountId,
  onCreateCampaign,
}: CampaignCreateModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CampaignType>('SEARCH');
  const [primaryGoal, setPrimaryGoal] = useState<CampaignGoal>('TARGET_CPA');
  const [budgetDaily, setBudgetDaily] = useState('100');
  const [targetCpa, setTargetCpa] = useState('35');
  const [targetRoas, setTargetRoas] = useState('4.0');
  const [keywordsText, setKeywordsText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const campId = `camp-${Date.now().toString(36)}`;
      const daily = Number(budgetDaily) || 100;
      const cpaVal = Number(targetCpa) || 35;
      const roasVal = Number(targetRoas) || 4.0;

      const rawKeywords = keywordsText
        .split(/[\n,]/)
        .map((k) => k.trim())
        .filter(Boolean);

      const createdKeywords: Keyword[] = rawKeywords.map((kw, i) => ({
        id: `kw-${campId}-${i + 1}`,
        campaignId: campId,
        campaignName: name.trim(),
        keyword: kw,
        matchType: 'PHRASE',
        spend: 25.9,
        clicks: 14,
        impressions: 120,
        ctr: 11.67,
        cpc: Number((cpaVal / 18).toFixed(2)) || 1.85,
        conversions: 1,
        cpa: cpaVal,
        qualityScore: 8,
        status: 'ENABLED',
      }));

      const newCampaign: Campaign = {
        id: campId,
        accountId: accountId || 'acc-primary',
        name: name.trim(),
        type,
        status: 'ENABLED',
        budgetDaily: daily,
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        conversions: 0,
        cpa: cpaVal,
        conversionValue: 0,
        roas: roasVal,
        conversionRate: 0,
        healthStatus: 'HEALTHY',
        healthScore: 92,
        trendPoints: [0, 0, 0, 0, 0, 0, 0],
        historicalPoints: [],
        previousPeriod: {
          spend: 0,
          conversions: 0,
          cpa: cpaVal,
          roas: roasVal,
        },
        keywordsCount: createdKeywords.length,
        activeAdsCount: 1,
        primaryGoal,
      };

      await onCreateCampaign(newCampaign, createdKeywords);
      onClose();
    } catch (err) {
      console.error('Error creating campaign:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-sm">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Real Campaign</h3>
              <p className="text-xs text-slate-500">Persisted directly to Firestore Cloud</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Search - Core Products Lead Gen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Campaign Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CampaignType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              >
                <option value="SEARCH">Search</option>
                <option value="PERFORMANCE_MAX">Performance Max</option>
                <option value="DISPLAY">Display</option>
                <option value="SHOPPING">Shopping</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bidding Strategy
              </label>
              <select
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value as CampaignGoal)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              >
                <option value="TARGET_CPA">Target CPA</option>
                <option value="TARGET_ROAS">Target ROAS</option>
                <option value="MAXIMIZE_CONVERSIONS">Maximize Conversions</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Daily Budget ($)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={budgetDaily}
                onChange={(e) => setBudgetDaily(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Target CPA ($)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={targetCpa}
                onChange={(e) => setTargetCpa(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Target Keywords (Optional, one per line)
            </label>
            <textarea
              rows={3}
              placeholder="e.g.&#10;best enterprise software&#10;marketing optimization tool&#10;google ads management"
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-[#00d67d]" />
                  <span>Save Campaign</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
