'use client';

import React, { useState } from 'react';
import { GoogleAdsLogo } from '@/components/ui/google-ads-logo';
import { acquireGoogleAdsToken } from '@/lib/google-identity';
import { GoogleAdsAccount, Campaign } from '@/types/adoptimize';
import { Check, RefreshCw, ArrowRight, AlertCircle, LogOut, ShieldCheck, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-[#00d67d]/30 selection:text-white font-sans relative">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 px-6 py-4 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d67d] to-emerald-600 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm">
              AD
            </div>
            <span className="font-extrabold tracking-tight text-white text-base">
              Ad<span className="text-[#00d67d]">Optimize</span>
            </span>
          </div>

          {onSignOut && (
            <button
              onClick={onSignOut}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-slate-800"
            >
              <span>{user?.email || 'Sign out'}</span>
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 pb-32">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d67d] animate-pulse" />
            <span>Connect Ad Accounts</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Connect your Google Ads account
          </h1>

          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Link your Google account in one click via official Google OAuth. AdOptimize will automatically detect your ad account, sync active campaigns, and begin continuous background monitoring.
          </p>

          <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Official Google Ads API</span>
            </span>
            <span>·</span>
            <span>Zero credentials stored</span>
            <span>·</span>
            <span>Revoke anytime</span>
          </div>
        </div>

        {/* Error message (if any) */}
        {errorMessage && (
          <div className="mt-6 p-4 bg-rose-950/60 border border-rose-800/80 rounded-2xl text-xs text-rose-200 flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-rose-100 block">Connection Notice</span>
              <p className="text-rose-300 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Available Integrations Section */}
        <div className="mt-10 space-y-4">
          <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase block">
            Ad Platforms
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Google Ads Card */}
            <div className={`p-6 rounded-3xl border transition-all ${
              isConnected
                ? 'bg-slate-950/90 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md'
            }`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center p-2.5">
                    <GoogleAdsLogo className="w-full h-full" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">Google Ads</h3>
                    <p className="text-xs text-slate-400">Search, Performance Max, Display</p>
                  </div>
                </div>

                {isConnected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-[11px] font-bold text-emerald-400">
                    <Check className="w-3 h-3 text-[#00d67d]" />
                    <span>Active</span>
                  </span>
                )}
              </div>

              {/* Multiple accounts selector */}
              {multipleAccounts.length > 1 ? (
                <div className="space-y-2 pt-2 animate-in fade-in border-t border-slate-800">
                  <p className="text-xs font-semibold text-slate-300">Select Google Ads account:</p>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {multipleAccounts.map((cid) => (
                      <button
                        key={cid}
                        onClick={() => handleConnectGoogleAds(cid)}
                        disabled={isConnecting}
                        className="w-full text-left px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-emerald-500/50 text-xs font-mono font-semibold text-slate-200 transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <span>{cid}</span>
                        <span className="text-[11px] font-sans text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform">
                          Connect →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : isConnected ? (
                /* Connected State */
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Connected Customer ID:</span>
                    <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {account.clientCustomerId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Synchronized Campaigns:</span>
                    <span className="font-bold text-emerald-400">
                      {account.totalCampaignsCount ?? 0} active
                    </span>
                  </div>
                  <button
                    onClick={() => handleConnectGoogleAds()}
                    disabled={isConnecting}
                    className="w-full text-center text-xs text-slate-400 hover:text-slate-200 font-medium pt-1 cursor-pointer transition-colors"
                  >
                    Switch or reconnect account
                  </button>
                </div>
              ) : (
                /* Connect Button */
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => handleConnectGoogleAds()}
                    disabled={isConnecting}
                    className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-slate-950 animate-spin" />
                        <span>Connecting Google Ads...</span>
                      </>
                    ) : (
                      <>
                        <span>Connect My Google Ads Account</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Meta Ads (Upcoming) */}
            <div className="p-6 rounded-3xl border border-slate-800/60 bg-slate-950/40 opacity-70">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400 font-bold text-lg">
                    ∞
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-300">Meta Ads</h3>
                    <p className="text-xs text-slate-500">Facebook &amp; Instagram Feeds</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-400">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-slate-500 pt-2 border-t border-slate-800/60">
                Multi-platform budget balancing across Google and Meta is in development.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-40 pointer-events-none px-4">
        <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 px-5 py-3 flex items-center gap-5 max-w-lg w-full justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[#00d67d] animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-xs font-semibold text-slate-300">
              {isConnected
                ? `Google Ads ${account.clientCustomerId} linked`
                : 'Google Ads Account'}
            </span>
          </div>

          <button
            onClick={onContinueToDashboard}
            disabled={!isConnected}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              isConnected
                ? 'bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 shadow-md cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <span>Continue to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
