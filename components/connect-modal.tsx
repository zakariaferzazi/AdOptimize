'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  acquireGoogleAdsToken,
  getStoredGoogleAdsToken,
  clearStoredGoogleAdsToken,
} from '@/lib/google-identity';
import { GoogleAdsAccount, Campaign } from '@/types/adoptimize';
import { GoogleIcon } from '@/components/ui/google-icon';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: GoogleAdsAccount;
  onConnectAccount: (
    account: GoogleAdsAccount,
    syncedCampaigns?: Campaign[],
    token?: string | null,
    syncedKeywords?: any[],
    syncedSearchTerms?: any[]
  ) => void;
  onApiError?: (issue: {
    message: string;
    cid: string;
    timestamp: string;
    severity: 'error' | 'warning';
    statusCode?: number;
    details?: string;
    isAuthExpired?: boolean;
    accessibleCustomers?: string[];
  }) => void;
  userEmail?: string | null;
}

export function ConnectModal({
  isOpen,
  onClose,
  currentAccount,
  onConnectAccount,
  onApiError,
  userEmail,
}: ConnectModalProps) {
  const [loadingState, setLoadingState] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [discoveredAccounts, setDiscoveredAccounts] = useState<string[]>([]);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [manualCid, setManualCid] = useState('');
  const [managerCid, setManagerCid] = useState(() => {
    if (typeof window !== 'undefined') return sessionStorage.getItem('google_ads_login_cid') || '';
    return '';
  });

  if (!isOpen) return null;

  const isConnected = currentAccount.isConnected && currentAccount.clientCustomerId !== 'Not Connected';

  // 1-Click Auto Connect (Adspirer Model)
  // Connects Google Ads and automatically discovers accounts without asking for CID
  const handleOneClickConnect = async (selectedCid?: string) => {
    setErrorMessage(null);
    setLoadingState('Connecting to Google...');

    try {
      // 1. Acquire Google Ads OAuth token
      const token = await acquireGoogleAdsToken({
        emailHint: userEmail || undefined,
      });

      if (!token) {
        setLoadingState(null);
        setErrorMessage('Google authorization was cancelled.');
        return;
      }

      setLoadingState('Discovering your Google Ads accounts...');

      // 2. Call auto_connect endpoint
      const res = await fetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_connect',
          accessToken: token,
          customerId: selectedCid || manualCid.trim() || undefined,
          userEmail: userEmail || undefined,
          loginCustomerId: managerCid.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setLoadingState(null);
        const errMsg = data.error || data.message || 'Could not connect to Google Ads account.';
        setErrorMessage(errMsg);

        if (Array.isArray(data.accessibleCustomers) && data.accessibleCustomers.length > 0) {
          setDiscoveredAccounts(data.accessibleCustomers);
        }

        if (onApiError) {
          onApiError({
            message: errMsg,
            cid: selectedCid || manualCid || currentAccount.clientCustomerId,
            timestamp: new Date().toLocaleTimeString(),
            severity: 'error',
            statusCode: data.statusCode || res.status,
            details: data.details,
            accessibleCustomers: data.accessibleCustomers,
          });
        }
        return;
      }

      // 3. If multiple accounts were discovered, prompt user to select with 1 click
      if (data.requiresSelection && Array.isArray(data.customers) && data.customers.length > 1) {
        setLoadingState(null);
        setDiscoveredAccounts(data.customers);
        return;
      }

      // 4. Single account auto-connected successfully!
      setLoadingState(null);
      if (typeof window !== 'undefined') {
        if (data.loginCustomerIdUsed) {
          sessionStorage.setItem('google_ads_login_cid', data.loginCustomerIdUsed);
        }
      }

      onConnectAccount(
        data.account,
        data.campaigns || [],
        token,
        data.keywords || [],
        data.searchTerms || []
      );
      onClose();
    } catch (err: any) {
      setLoadingState(null);
      const isClosed = err?.message?.includes('closed') || err?.code === 'auth/popup-closed-by-user';
      setErrorMessage(
        isClosed
          ? 'Google authorization window was closed.'
          : err?.message || 'Failed to connect to Google Ads.'
      );
    }
  };

  const handleSwitchAccount = async () => {
    clearStoredGoogleAdsToken();
    setDiscoveredAccounts([]);
    setErrorMessage(null);
    await handleOneClickConnect();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center text-[#00d67d] shadow-sm">
              <GoogleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isConnected ? 'Google Ads Connected' : 'Connect Google Ads'}
              </h3>
              <p className="text-xs text-slate-500">Official Google Ads API (1-Click Sync)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2 font-bold text-rose-950">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>Connection Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed pl-6 text-rose-800">
              {errorMessage}
            </p>
          </div>
        )}

        {/* State A: Multiple accounts discovered -> 1-click selection */}
        {discoveredAccounts.length > 1 ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Select Google Ads Account to Connect:</h4>
              <p className="text-xs text-slate-500">
                We found {discoveredAccounts.length} accounts linked to your Google login. Select the one you want to optimize:
              </p>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {discoveredAccounts.map((cid) => (
                <button
                  key={cid}
                  type="button"
                  onClick={() => handleOneClickConnect(cid)}
                  disabled={Boolean(loadingState)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-emerald-50/80 border border-slate-200 hover:border-emerald-300 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 group-hover:border-emerald-300">
                      G
                    </div>
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900 block">{cid}</span>
                      <span className="text-[10px] text-slate-500">Google Ads Customer Account</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-white group-hover:bg-emerald-500 group-hover:text-slate-950 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1">
                    <span>Connect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : isConnected && !loadingState ? (
          /* State B: Already connected account summary */
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Active Google Ads Account</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                  Connected ✓
                </span>
              </div>
              <div className="pt-1 flex items-baseline justify-between">
                <div>
                  <span className="text-lg font-mono font-bold text-slate-900 block">
                    {currentAccount.clientCustomerId}
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {currentAccount.accountName || 'Google Ads Account'}
                  </span>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span>{currentAccount.totalCampaignsCount ?? 0} campaigns</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Switch Google Account
              </button>
              <button
                type="button"
                onClick={() => handleOneClickConnect(currentAccount.clientCustomerId)}
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#00d67d]" />
                <span>Re-sync Campaigns Now</span>
              </button>
            </div>
          </div>
        ) : (
          /* State C: 1-Click Connect (Adspirer experience - no forms, no manual CID entry) */
          <div className="space-y-5 text-center py-2">
            <div className="space-y-2 max-w-sm mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>1-Click Auto Connect</span>
              </div>
              <h4 className="text-xl font-bold tracking-tight text-slate-900">
                Connect your Google Ads account
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Click below to authorize with Google. AdOptimize will automatically discover your active accounts and sync live campaigns.
              </p>
            </div>

            {/* 1-Click Connect Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleOneClickConnect()}
                disabled={Boolean(loadingState)}
                className="w-full py-3.5 px-6 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-lg shadow-slate-950/10 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 group"
              >
                {loadingState ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-[#00d67d] animate-spin" />
                    <span>{loadingState}</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center font-bold text-xs text-slate-900">
                      G
                    </div>
                    <span>Connect Google Ads with Google</span>
                    <ArrowRight className="w-4 h-4 text-[#00d67d] group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>

            {/* Trust highlights */}
            <div className="pt-3 grid grid-cols-2 gap-2 text-left">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-[11px] text-slate-600 font-medium leading-tight">
                  Zero manual CID entry — Instant account detection
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-[11px] text-slate-600 font-medium leading-tight">
                  Official Google Ads API v25 OAuth security
                </span>
              </div>
            </div>

            {/* Optional Collapsed Fallback for Manager MCC or specific CID */}
            <div className="pt-2 border-t border-slate-100 text-left">
              <button
                type="button"
                onClick={() => setShowManualFallback(!showManualFallback)}
                className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors font-medium cursor-pointer block mx-auto"
              >
                {showManualFallback ? '▾ Hide specific CID / Manager MCC' : '▸ Agency MCC or specific CID?'}
              </button>

              {showManualFallback && (
                <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Customer ID (CID) (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123-456-7890"
                      value={manualCid}
                      onChange={(e) => setManualCid(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Manager MCC CID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 555-666-7777 (if access is through an MCC)"
                      value={managerCid}
                      onChange={(e) => setManagerCid(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
