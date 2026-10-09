'use client';

import React, { useState } from 'react';
import { X, RefreshCw, ExternalLink, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, Play, Pause } from 'lucide-react';
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
  if (!isOpen) return null;

  const handleExecuteSync = async () => {
    await onSync();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-sm">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Sync Google Ads Campaigns</h3>
              <p className="text-xs text-slate-500">Live SearchStream API v25 (Enabled &amp; Paused)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Connected Account status */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Google Ads Account:</span>
            <span className="font-bold text-slate-900">{account.accountName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Customer ID (CID):</span>
            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
              {account.clientCustomerId}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
            <span className="text-slate-500 font-medium">Data Source:</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Google Ads REST API v25</span>
            </span>
          </div>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-900 leading-relaxed">
          Clicking <strong>Sync Campaigns</strong> directly queries Google Ads for CID{' '}
          <strong>{account.clientCustomerId}</strong>. It pulls all live Search, Performance Max, Display, and Video campaigns (both Enabled and Paused) with their real spend, clicks, conversions, and ROAS.
        </div>

        {/* Action buttons */}
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
            disabled={isSyncing}
            onClick={handleExecuteSync}
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00d67d] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronizing with Google Ads...' : 'Sync Real Campaigns Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
