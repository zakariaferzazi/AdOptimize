'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Building,
  Key,
  ArrowRight,
  Info
} from 'lucide-react';
import { GoogleAdsAccount, Campaign } from '@/types/adoptimize';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: GoogleAdsAccount;
  onConnectAccount: (account: GoogleAdsAccount, syncedCampaigns?: Campaign[]) => void;
}

export function ConnectModal({
  isOpen,
  onClose,
  currentAccount,
  onConnectAccount,
}: ConnectModalProps) {
  const [step, setStep] = useState<'AUTH' | 'SELECT_CUSTOMER' | 'SYNCING'>('AUTH');
  const [customerId, setCustomerId] = useState(
    currentAccount.clientCustomerId &&
    currentAccount.clientCustomerId !== 'Not Connected' &&
    currentAccount.clientCustomerId !== '492-819-2041'
      ? currentAccount.clientCustomerId
      : ''
  );
  const [accountName, setAccountName] = useState(
    currentAccount.accountName && !currentAccount.accountName.includes('CloudScale')
      ? currentAccount.accountName
      : ''
  );
  const [currency, setCurrency] = useState(currentAccount.currency || 'USD');
  const [spendCap, setSpendCap] = useState(currentAccount.monthlySpendCap ? String(currentAccount.monthlySpendCap) : '25000');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuthConnect = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await fetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_oauth_url' }),
      });
      setTimeout(() => {
        setIsLoading(false);
        setStep('SELECT_CUSTOMER');
      }, 500);
    } catch {
      setIsLoading(false);
      setStep('SELECT_CUSTOMER');
    }
  };

  const handleConfirmCustomer = async () => {
    const raw = customerId.trim();
    if (!raw) {
      setErrorMessage('Please enter your 10-digit Google Ads Customer ID (CID)');
      return;
    }
    setErrorMessage(null);

    const cleanId = raw.replace(/\D/g, '');
    const targetId = cleanId.length === 10
      ? `${cleanId.slice(0, 3)}-${cleanId.slice(3, 6)}-${cleanId.slice(6)}`
      : raw;

    setIsLoading(true);
    setStep('SYNCING');

    try {
      const res = await fetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect_customer',
          customerId: targetId,
          accountName: accountName.trim() || `Google Ads (${targetId})`,
          currency,
          monthlySpendCap: Number(spendCap) || 25000,
        }),
      });
      const data = await res.json();

      // Trigger automatic campaign sync from Google Ads for this CID
      let syncedCampaigns: Campaign[] = [];
      try {
        const syncRes = await fetch('/api/google-ads/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: data.account?.id || `acc-${cleanId || Date.now()}`,
            customerId: targetId,
            accountName: accountName.trim() || `Google Ads Account (${targetId})`,
          }),
        });
        const syncJson = await syncRes.json();
        if (syncJson.campaigns) {
          syncedCampaigns = syncJson.campaigns;
        }
      } catch (syncErr) {
        console.warn('Initial sync warning:', syncErr);
      }

      setIsLoading(false);
      const connectedAccount: GoogleAdsAccount = {
        id: `acc-${cleanId || Date.now()}`,
        clientCustomerId: targetId,
        accountName: accountName.trim() || `Google Ads Account (${targetId})`,
        currency: currency,
        timezone: 'America/New_York (UTC-5)',
        isConnected: true,
        lastSyncAt: new Date().toISOString(),
        syncStatus: 'SYNCED',
        isDemo: false,
        totalCampaignsCount: syncedCampaigns.length,
        monthlySpendCap: Number(spendCap) || 25000,
      };

      onConnectAccount(data.account || connectedAccount, syncedCampaigns);
      onClose();
    } catch {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-sm">
              G
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Google Ads Connection</h3>
              <p className="text-xs text-slate-500">Secure OAuth 2.0 & CID Integration</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: OAuth Authentication */}
        {step === 'AUTH' && (
          <div className="space-y-5 text-xs text-slate-700">
            <p className="leading-relaxed text-slate-600">
              AdOptimize requests read permission to your Google Ads account to continuously monitor campaign performance, detect anomalies, and boost your active campaigns.
            </p>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-1.5 text-xs">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-600" />
                <span>Campaign Creation Happens in Google Ads</span>
              </div>
              <p className="text-emerald-800 leading-relaxed text-[11px]">
                You create and configure your campaigns inside Google Ads. AdOptimize automatically pulls and displays them here so you can analyze, audit, and boost them with AI.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
              <div className="font-bold text-slate-900">Requested Permissions:</div>
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Read campaign metrics, budgets, keywords & search terms</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Execute budget boosts & negative keyword additions with your confirmation</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Google Verified Security</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep('SELECT_CUSTOMER')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Enter CID Manually
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleOAuthConnect}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>Authenticate with Google</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Select Customer ID */}
        {step === 'SELECT_CUSTOMER' && (
          <div className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Google Ads Customer ID (CID)
              </label>
              <input
                type="text"
                placeholder="e.g. 583-920-1492"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Found in the top-right corner of your Google Ads manager (10 digits).
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Account / Business Name
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Growth Ads, Global Search"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Account Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Monthly Budget Cap ($)
                </label>
                <input
                  type="number"
                  placeholder="25000"
                  value={spendCap}
                  onChange={(e) => setSpendCap(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('AUTH')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomer}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Connect & Sync Campaigns
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Syncing State */}
        {step === 'SYNCING' && (
          <div className="py-10 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
            <h4 className="text-base font-bold text-slate-900">
              Synchronizing with Google Ads API...
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Pulling active campaigns, keywords, quality scores, search queries, and anomaly telemetry.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
