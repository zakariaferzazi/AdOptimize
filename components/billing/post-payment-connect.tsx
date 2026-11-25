'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { AdOptimizeProvider, useAdOptimize } from '@/context/adoptimize-context';
import { useGoogleAdsConnection } from '@/hooks/use-google-ads-connection';
import { GoogleAdsLogo } from '@/components/ui/google-ads-logo';
import { safeNext } from '@/lib/auth-redirect';
import { synchronizeServerSession } from '@/lib/auth-session';

export function PostPaymentConnect({ next = '/dashboard' }: { next?: string }) {
  return <AdOptimizeProvider><ConnectionStep next={safeNext(next)} /></AdOptimizeProvider>;
}

function ConnectionStep({ next }: { next: string }) {
  const router = useRouter();
  const { user, state, authLoading, isInitialLoading, handleConnectAccount } = useAdOptimize();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const connected = state.account.isConnected && Boolean(state.account.clientCustomerId) && state.account.clientCustomerId !== 'Not Connected';

  const continueToApp = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError('');
    try {
      await synchronizeServerSession(user);
      router.replace(next);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to open your workspace. Please retry.');
      setBusy(false);
    }
  };
  const { connect, loadingState, errorMessage, discoveredAccounts } = useGoogleAdsConnection({
    currentAccount: state.account, userEmail: user?.email,
    onConnectAccount: (...args) => { handleConnectAccount(...args); void continueToApp(); },
  });
  const pending = busy || Boolean(loadingState);

  if (authLoading || isInitialLoading) {
    return <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><RefreshCw className="w-4 h-4 animate-spin" /> Preparing your workspace...</p>;
  }
  if (!user) return <p role="alert" className="text-sm text-rose-700">Please sign in again to connect your Google Ads account.</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <GoogleAdsLogo className="w-8 h-8" />
          <h2 className="text-lg font-bold text-slate-900">{connected ? 'Your workspace is ready' : 'Connect Google Ads'}</h2>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          {connected ? `${state.account.accountName || 'Your Google Ads account'} is connected. Start exploring your campaigns with your AI marketing agent.`
            : 'Your Pro plan is ready. Connect your Google Ads account.'}
        </p>
      </div>
      {(error || errorMessage) && <p role="alert" className="flex items-start gap-2 text-sm text-rose-700"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error || errorMessage}</p>}
      {discoveredAccounts.length > 1 && !connected ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-600">Choose the Google Ads account to connect:</p>
          {discoveredAccounts.map((cid) => (
            <button key={cid} type="button" disabled={pending} onClick={() => { void connect(cid); }} className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm font-medium disabled:opacity-50">{cid}</button>
          ))}
          {loadingState && <p role="status" className="text-sm text-slate-500">{loadingState}</p>}
        </div>
      ) : <button type="button" disabled={pending} onClick={() => { if (connected) void continueToApp(); else void connect(); }}
        className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-6 py-3 text-sm font-semibold text-white inline-flex items-center justify-center gap-2">
        {pending ? <RefreshCw className="w-4 h-4 animate-spin" /> : connected ? <ArrowRight className="w-4 h-4" /> : <GoogleAdsLogo className="w-5 h-5" />}
        {loadingState || (connected ? 'Open your workspace' : 'Connect Google Ads')}
      </button>}
      {!connected && <button type="button" disabled={pending} onClick={() => { void continueToApp(); }} className="text-xs font-semibold text-slate-500 underline">Connect later in Settings</button>}
    </div>
  );
}
