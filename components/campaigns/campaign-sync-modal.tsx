'use client';

import React, { useState } from 'react';
import { X, RefreshCw, ExternalLink, Sparkles, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { GoogleAdsAccount } from '@/types/adoptimize';

interface CampaignSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: GoogleAdsAccount;
  onSync: (customCampaignNames?: string[]) => Promise<void>;
  isSyncing: boolean;
}

export function CampaignSyncModal({
  isOpen,
  onClose,
  account,
  onSync,
  isSyncing,
}: CampaignSyncModalProps) {
  const [syncType, setSyncType] = useState<'AUTO' | 'CUSTOM'>('AUTO');
  const [customNamesText, setCustomNamesText] = useState('');

  if (!isOpen) return null;

  const handleExecuteSync = async () => {
    let customNames: string[] | undefined = undefined;
    if (syncType === 'CUSTOM' && customNamesText.trim()) {
      customNames = customNamesText
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    await onSync(customNames);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-sm">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sync Google Ads Campaigns</h3>
              <p className="text-xs text-slate-500">Live Telemetry & Anomaly Monitoring</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative banner clarifying that campaigns are created in Google Ads */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Campaign Creation Policy</span>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Campaigns are created inside <strong>Google Ads</strong>. AdOptimize continuously pulls telemetry, audits search queries, detects budget waste, and provides AI boosting recommendations.
          </p>
          <a
            href="https://ads.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline mt-1"
          >
            <span>Open Google Ads Manager (ads.google.com)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Connected Account status */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-medium">Target Account: </span>
            <span className="font-bold text-slate-800">{account.accountName}</span>
          </div>
          <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-700">
            CID: {account.clientCustomerId}
          </span>
        </div>

        {/* Sync Mode Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
            Choose Sync Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSyncType('AUTO')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                syncType === 'AUTO'
                  ? 'border-slate-900 bg-slate-950 text-white shadow-md'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="font-bold text-xs">Auto-Sync CID</div>
              <div className={`text-[11px] mt-1 ${syncType === 'AUTO' ? 'text-slate-300' : 'text-slate-500'}`}>
                Automatically sync all active Search, PMax & Display campaigns from this account.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSyncType('CUSTOM')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                syncType === 'CUSTOM'
                  ? 'border-slate-900 bg-slate-950 text-white shadow-md'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="font-bold text-xs">Specify Campaign Names</div>
              <div className={`text-[11px] mt-1 ${syncType === 'CUSTOM' ? 'text-slate-300' : 'text-slate-500'}`}>
                Enter specific campaign titles running in Google Ads to monitor immediately.
              </div>
            </button>
          </div>
        </div>

        {/* Custom campaign names input if CUSTOM selected */}
        {syncType === 'CUSTOM' && (
          <div className="space-y-1.5 animate-in fade-in duration-150">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Google Ads Campaign Names (one per line)</span>
              <span className="text-[10px] text-slate-400 font-normal">e.g. Brand Search, PMax Leads</span>
            </label>
            <textarea
              rows={4}
              value={customNamesText}
              onChange={(e) => setCustomNamesText(e.target.value)}
              placeholder="Search - Brand Awareness&#10;Performance Max - Inbound Leads&#10;Display - Retargeting Funnel"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={handleExecuteSync}
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00d67d] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronizing with Google Ads...' : 'Sync Active Campaigns'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
