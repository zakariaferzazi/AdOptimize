'use client';

import React, { useState, useEffect } from 'react';
import { X, Layers, DollarSign, Target, Plus, Check } from 'lucide-react';
import { Campaign } from '@/types/adoptimize';

interface CampaignEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign?: Campaign | null;
  onSave: (campaign: Campaign) => Promise<void>;
  accountId: string;
}

export function CampaignEditModal({
  isOpen,
  onClose,
  campaign,
  onSave,
  accountId,
}: CampaignEditModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Campaign['type']>('SEARCH');
  const [budgetDaily, setBudgetDaily] = useState('80');
  const [spend, setSpend] = useState('560');
  const [conversions, setConversions] = useState('20');
  const [primaryGoal, setPrimaryGoal] = useState<Campaign['primaryGoal']>('TARGET_CPA');
  const [status, setStatus] = useState<Campaign['status']>('ENABLED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setType(campaign.type);
      setBudgetDaily(String(campaign.budgetDaily));
      setSpend(String(campaign.spend));
      setConversions(String(campaign.conversions));
      setPrimaryGoal(campaign.primaryGoal || 'TARGET_CPA');
      setStatus(campaign.status);
    } else {
      setName('');
      setType('SEARCH');
      setBudgetDaily('80');
      setSpend('560');
      setConversions('18');
      setPrimaryGoal('TARGET_CPA');
      setStatus('ENABLED');
    }
    setErrorMessage(null);
  }, [campaign, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please provide a campaign name.');
      return;
    }

    const daily = Number(budgetDaily);
    if (isNaN(daily) || daily <= 0) {
      setErrorMessage('Daily budget must be greater than $0.');
      return;
    }

    const totalSpend = Number(spend) || daily * 7;
    const totalConvs = Number(conversions) || 0;
    const cpa = totalConvs > 0 ? Number((totalSpend / totalConvs).toFixed(2)) : totalSpend;
    const convValue = Number((totalSpend * 3.8).toFixed(2));
    const roas = totalSpend > 0 ? Number((convValue / totalSpend).toFixed(2)) : 0;
    const cpc = type === 'SEARCH' ? 1.45 : type === 'PERFORMANCE_MAX' ? 1.65 : 0.85;
    const clicks = Math.round(totalSpend / cpc);
    const impressions = Math.round(clicks * (type === 'DISPLAY' ? 40 : 15));
    const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;

    setIsSubmitting(true);
    setErrorMessage(null);

    const campData: Campaign = {
      id: campaign?.id || `camp-user-${Date.now()}`,
      accountId,
      name: name.trim(),
      type,
      status,
      budgetDaily: daily,
      spend: totalSpend,
      impressions,
      clicks,
      ctr,
      cpc,
      conversions: totalConvs,
      cpa,
      conversionValue: convValue,
      roas,
      conversionRate: clicks > 0 ? Number(((totalConvs / clicks) * 100).toFixed(2)) : 0,
      primaryGoal,
      healthStatus: roas >= 3.5 ? 'HEALTHY' : cpa > 80 ? 'WARNING' : 'HEALTHY',
      healthScore: roas >= 3.5 ? 94 : 78,
      historicalPoints: campaign?.historicalPoints || [],
      trendPoints: campaign?.trendPoints || [totalConvs, totalConvs, totalConvs],
    };

    try {
      await onSave(campData);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Failed to save campaign');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-xs">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {campaign ? 'Edit Campaign Settings' : 'Add Google Ads Campaign'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Search - Brand Core High Intent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Campaign Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              >
                <option value="SEARCH">Search Ads</option>
                <option value="PERFORMANCE_MAX">Performance Max</option>
                <option value="DISPLAY">Display Network</option>
                <option value="SHOPPING">Shopping</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              >
                <option value="ENABLED">Active (Enabled)</option>
                <option value="PAUSED">Paused</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Daily Budget ($)
              </label>
              <input
                type="number"
                min="1"
                step="5"
                required
                value={budgetDaily}
                onChange={(e) => setBudgetDaily(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                7-Day Spend ($)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={spend}
                onChange={(e) => setSpend(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Conversions
              </label>
              <input
                type="number"
                min="0"
                value={conversions}
                onChange={(e) => setConversions(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Primary Bidding Goal
            </label>
            <select
              value={primaryGoal}
              onChange={(e) => setPrimaryGoal(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
            >
              <option value="TARGET_CPA">Target CPA (Cost Per Acquisition)</option>
              <option value="TARGET_ROAS">Target ROAS (Return On Ad Spend)</option>
              <option value="MAXIMIZE_CONVERSIONS">Maximize Conversions</option>
            </select>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-[#00d67d]" />
              <span>{isSubmitting ? 'Saving...' : campaign ? 'Save Changes' : 'Add Campaign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
