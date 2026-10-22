'use client';

import React, { useState } from 'react';
import { GoogleAdsLogo } from '@/components/ui/google-ads-logo';
import { acquireGoogleAdsToken } from '@/lib/google-identity';
import { GoogleAdsAccount, Campaign } from '@/types/adoptimize';
import { Check, RefreshCw, Zap, ArrowRight, AlertCircle, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface ConnectAccountsStepProps {
  user: User | null;
  account: GoogleAdsAccount;
  onConnectSuccess: (
    account: GoogleAdsAccount,
    campaigns: Campaign[],
    token: string | null,
    keywords?: any[],
    searchTerms?: any[]
  ) => void;
  onContinueToDashboard: () => void;
  onSignOut?: () => void;
}

export function ConnectAccountsStep({
  user,
  account,
  onConnectSuccess,
  onContinueToDashboard,
  onSignOut,
}: ConnectAccountsStepProps) {
  const isConnected = account.isConnected && account.clientCustomerId !== 'Not Connected';
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [multipleAccounts, setMultipleAccounts] = useState<string[]>([]);

  const handleConnectGoogleAds = async (selectedCid?: string) => {
    setErrorMessage(null);
    setIsConnecting(true);
    try {
      // 1. Acquire Google OAuth access token
      const token = await acquireGoogleAdsToken({
        emailHint: user?.email || undefined,
      });

      if (!token) {
        setIsConnecting(false);
        setErrorMessage('Google authorization was cancelled.');
        return;
      }

      // 2. Auto-connect with backend
      const res = await fetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_connect',
          accessToken: token,
          customerId: selectedCid || undefined,
          userEmail: user?.email || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsConnecting(false);
        setErrorMessage(data.error || 'Could not connect Google Ads account.');
        return;
      }

      // If user has multiple CIDs linked to their Google login
      if (data.requiresSelection && Array.isArray(data.customers) && data.customers.length > 1) {
        setIsConnecting(false);
        setMultipleAccounts(data.customers);
        return;
      }

      // Single account auto-connected!
      setIsConnecting(false);
      setMultipleAccounts([]);
      onConnectSuccess(
        data.account,
        data.campaigns || [],
        token,
        data.keywords || [],
        data.searchTerms || []
      );
    } catch (err: any) {
      setIsConnecting(false);
      const isClosed = err?.message?.includes('closed') || err?.code === 'auth/popup-closed-by-user';
      setErrorMessage(
        isClosed
          ? 'Google authorization window was closed.'
          : err?.message || 'Connection could not be completed.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-900 flex flex-col justify-between selection:bg-purple-100 selection:text-purple-900 relative">
      {/* Top subtle progress indicator (matching adspirer design) */}
      <div className="w-full h-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600" />

      {/* Main Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-6 pt-12 pb-32">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
              Connect Ad Accounts
            </span>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{user?.email || 'Sign out'}</span>
                <LogOut className="w-3.5 h-3.5 ml-1" />
              </button>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-serif">
            Congratulations, connect your ad accounts.
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed">
            OAuth-secured · revoke anytime · ~30 seconds per platform. AdOptimize never stores your credentials.
          </p>

          <p className="text-xs text-slate-400 leading-relaxed pt-1">
            Connect individual ad accounts — Manager (MCC) accounts can&apos;t be activated, and blocked or deactivated accounts won&apos;t appear here.
          </p>
        </div>

        {/* Error message (if any) */}
        {errorMessage && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-rose-950 block">Connection Error</span>
              <p className="text-rose-900">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Section: Available Now */}
        <div className="mt-12 space-y-4">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase block">
            Available Now
          </span>

          <div className="flex flex-wrap gap-4 items-start">
            {/* Google Ads Card (Adspirer format) */}
            <div className="w-72 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 transition-all hover:border-slate-300">
              <div className="flex items-start gap-3.5">
                <div className="shrink-0 pt-0.5">
                  <GoogleAdsLogo className="w-8 h-8" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm text-slate-900">Google Ads</h3>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Search, PMax, Display, YouTube
                  </p>
                </div>
              </div>

              {/* Multiple accounts selection dropdown */}
              {multipleAccounts.length > 1 ? (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <p className="text-[11px] font-semibold text-slate-700">Choose account to connect:</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {multipleAccounts.map((cid) => (
                      <button
                        key={cid}
                        onClick={() => handleConnectGoogleAds(cid)}
                        disabled={isConnecting}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-xs font-mono font-semibold text-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>{cid}</span>
                        <span className="text-[10px] font-sans text-emerald-700 font-bold">Select →</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : isConnected ? (
                /* Connected State */
                <div className="pt-1">
                  <div className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    <span>Connected ({account.clientCustomerId})</span>
                  </div>
                  <button
                    onClick={() => handleConnectGoogleAds()}
                    disabled={isConnecting}
                    className="w-full text-center text-[10px] text-slate-400 hover:text-slate-600 font-medium mt-2 cursor-pointer transition-colors"
                  >
                    Reconnect or switch account
                  </button>
                </div>
              ) : (
                /* Connect Button */
                <div className="pt-1">
                  <button
                    onClick={() => handleConnectGoogleAds()}
                    disabled={isConnecting}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 bg-white shadow-2xs"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <span>Connect</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Pill Bar (matches Adspirer screenshot) */}
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-40 pointer-events-none px-4">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-xl border border-slate-200/90 px-4 py-2.5 flex items-center gap-4 max-w-md w-full justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5 fill-current" />
            </div>
            <span className="text-xs font-medium text-slate-700">
              {isConnected
                ? 'Account connected! Ready to optimize.'
                : "Connect your ad account to fully unlock your agent's power"}
            </span>
          </div>

          <button
            onClick={onContinueToDashboard}
            disabled={!isConnected}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              isConnected
                ? 'bg-slate-950 hover:bg-slate-800 text-white shadow-sm cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Continue</span>
            {isConnected && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Right Logo Mark (matches screenshot AD logo) */}
      <div className="fixed bottom-6 right-6 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-slate-950 text-white font-bold text-xs tracking-tight shadow-md select-none">
        <span>AD</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#00d67d] ml-0.5 mb-1" />
      </div>
    </div>
  );
}
