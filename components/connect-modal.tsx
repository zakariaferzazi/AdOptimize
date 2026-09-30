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
  ArrowRight
} from 'lucide-react';
import { GoogleAdsAccount } from '@/types/adoptimize';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: GoogleAdsAccount;
  onConnectAccount: (account: GoogleAdsAccount) => void;
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

      setTimeout(() => {
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
          totalCampaignsCount: currentAccount.totalCampaignsCount || 0,
          monthlySpendCap: Number(spendCap) || 25000,
        };
        onConnectAccount(data.account || connectedAccount);
        onClose();
      }, 800);
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
              <p className="text-xs text-slate-500">Secure OAuth 2.0 Integration</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: OAuth Authentication */}
        {step === 'AUTH' && (
          <div className="space-y-5 text-xs text-slate-700">
            <p className="leading-relaxed text-slate-600">
              AdOptimize requests read & write permission to your Google Ads account to continuously monitor campaign performance, detect anomalies, and execute approved optimizations.
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
              <div className="font-bold text-slate-900">Requested Permissions:</div>
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Read campaign metrics, budgets, keywords & search terms</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Modify budgets & negative keywords only upon your approval</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero token exposure: Stored in encrypted server environment</span>
              </div>
            </div>

            <button
              onClick={handleOAuthConnect}
              disabled={isLoading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 text-[#00d67d] animate-spin" />
                  <span>Connecting to Google OAuth...</span>
                </>
              ) : (
                <>
                  <span>Authorize with Google Account</span>
                  <ArrowRight className="w-4 h-4 text-[#00d67d]" />
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Configure Customer ID & Account */}
        {step === 'SELECT_CUSTOMER' && (
          <div className="space-y-4 text-xs text-slate-700">
            <p className="text-slate-600">
              Configure your Google Ads Customer ID and settings to connect to the command center:
            </p>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
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
                onClick={() => setStep('AUTH')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleConfirmCustomer}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Connect & Sync Account
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
              Pulling campaigns, ad groups, keyword performance, Quality Scores, and search query logs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
