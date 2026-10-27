'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  DollarSign,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  Target,
} from 'lucide-react';
import { CampaignType, CampaignStatus } from '@/types/adoptimize';
import { getCurrencySymbol } from '@/lib/metrics-calculator';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  onCreateCampaign: (data: {
    name: string;
    budgetDaily: number;
    channelType: CampaignType;
    status: CampaignStatus;
  }) => Promise<boolean>;
}

export function CreateCampaignModal({
  isOpen,
  onClose,
  currency = 'USD',
  onCreateCampaign,
}: CreateCampaignModalProps) {
  const sym = getCurrencySymbol(currency);
  const [name, setName] = useState('');
  const [budgetDaily, setBudgetDaily] = useState('50');
  const [channelType, setChannelType] = useState<CampaignType>('SEARCH');
  const [status, setStatus] = useState<CampaignStatus>('ENABLED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a campaign name.');
      return;
    }
    const budgetNum = parseFloat(budgetDaily);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      setErrorMsg('Please enter a valid daily budget greater than 0.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const success = await onCreateCampaign({
        name: name.trim(),
        budgetDaily: budgetNum,
        channelType,
        status,
      });

      if (success) {
        setName('');
        setBudgetDaily('50');
        onClose();
      }
    } catch {
      setErrorMsg('Failed to create campaign. Check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200/90 relative animate-in zoom-in-95 duration-150 select-none">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Create Google Ads Campaign</h3>
              <p className="text-xs text-slate-500">Launch a new campaign directly in your connected account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Campaign Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Promo - High Intent Search"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d67d]/40 focus:bg-white transition-all"
            />
          </div>

          {/* Advertising Channel Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'SEARCH' as CampaignType, title: 'Google Search', desc: 'Text ads on Google Search & partners' },
                { id: 'PERFORMANCE_MAX' as CampaignType, title: 'Performance Max', desc: 'Multi-channel automated conversion optimization' },
                { id: 'DISPLAY' as CampaignType, title: 'Display Network', desc: 'Visual banner ads across 3M+ sites & apps' },
                { id: 'SHOPPING' as CampaignType, title: 'Shopping', desc: 'Product listings & inventory feeds' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setChannelType(t.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    channelType === t.id
                      ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-900">{t.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Budget */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Daily Budget ({currency})</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                {sym}
              </span>
              <input
                type="number"
                step="1"
                min="5"
                value={budgetDaily}
                onChange={(e) => setBudgetDaily(e.target.value)}
                placeholder="50"
                required
                className="w-full pl-8 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00d67d]/40 focus:bg-white transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                / day
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Google Ads standard daily budget with real-time automatic pacing.
            </p>
          </div>

          {/* Initial Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('ENABLED')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  status === 'ENABLED'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-1 ring-emerald-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Enabled (Active)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('PAUSED')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  status === 'PAUSED'
                    ? 'bg-slate-200 border-slate-400 text-slate-900 ring-1 ring-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Paused (Draft)</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating in Google Ads...</span>
                </>
              ) : (
                <>
                  <span>Create Campaign</span>
                  <Plus className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
