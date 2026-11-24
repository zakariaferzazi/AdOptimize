'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signInWithGoogle } from '@/lib/firebase';
import { synchronizeServerSession } from '@/lib/auth-session';

interface BillingStatus {
  environment: 'sandbox' | 'production';
  hasAccess: boolean;
  hasCustomer: boolean;
  status: string;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  interval: 'monthly' | 'yearly' | null;
}

export function BillingPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [returnTo, setReturnTo] = useState('/dashboard');
  const [confirming, setConfirming] = useState(false);
  const [checkoutReturned, setCheckoutReturned] = useState(false);

  const load = useCallback(async (current: User): Promise<BillingStatus> => {
    const response = await fetch('/api/billing/status', {
      headers: { Authorization: `Bearer ${await current.getIdToken()}` }, cache: 'no-store',
    });
    const data: BillingStatus & { error?: string } = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load your subscription.');
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const query = new URLSearchParams(window.location.search);
    const destination = query.get('returnTo');
    const waiting = query.get('checkout') === 'complete';
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      if (!active) return;
      if (destination && ['/chat', '/audit', '/reports', '/optimizer'].includes(destination)) setReturnTo(destination);
      if (timer) clearTimeout(timer);
      setUser(current); setStatus(null); setError(''); setConfirming(false); setBusy(false); setCheckoutReturned(waiting);
      if (!current) { setReady(true); return; }
      setReady(false);
      void (async () => {
        try {
          await synchronizeServerSession(current);
          let attempts = 0;
          const refresh = async () => {
            try {
              const next = await load(current);
              if (!active || auth.currentUser?.uid !== current.uid) return;
              setStatus(next); setReady(true); setError('');
              const shouldWait = waiting && !next.hasAccess && attempts++ < 12;
              setConfirming(shouldWait);
              if (shouldWait) timer = setTimeout(() => { void refresh(); }, 5000);
            } catch (failure) {
              if (active && auth.currentUser?.uid === current.uid) { setError(failure instanceof Error ? failure.message : 'Unable to load billing.'); setReady(true); setConfirming(false); }
            }
          };
          await refresh();
        } catch (failure) {
          if (active && auth.currentUser?.uid === current.uid) { setError(failure instanceof Error ? failure.message : 'Unable to establish your session.'); setReady(true); }
        }
      })();
    }, () => { if (active) { setError('Sign-in is unavailable. Please reload.'); setReady(true); } });
    return () => { active = false; unsubscribe(); if (timer) clearTimeout(timer); };
  }, [load]);

  async function action(path: 'checkout' | 'portal', interval?: 'monthly' | 'yearly') {
    if (!user || busy || auth.currentUser?.uid !== user.uid) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/billing/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify(interval ? { interval } : {}),
      });
      const data: { url?: string; error?: string } = await response.json();
      if (auth.currentUser?.uid !== user.uid) return;
      if (!response.ok || !data.url) throw new Error(data.error || 'Unable to open billing.');
      window.location.assign(data.url);
    } catch (failure) {
      if (auth.currentUser?.uid === user.uid) { setError(failure instanceof Error ? failure.message : 'Unable to open billing.'); setBusy(false); }
    }
  }

  return <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Pro billing</h1>
      <p className="mt-2 text-sm text-slate-600">One plan. $29 per month or $99 per year. USD; applicable taxes are calculated at checkout.</p>
    </div>
    {status?.environment === 'sandbox' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Sandbox mode: test payments only.</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!ready ? <p role="status">Loading your secure billing account...</p> : !user ? <div className="space-y-3">
      <p className="text-sm text-slate-600">Sign in to subscribe or manage your existing account.</p>
      <button disabled={busy} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" onClick={() => {
        setBusy(true); setError('');
        void signInWithGoogle().catch(() => setError('Sign-in failed or was canceled. Please try again.')).finally(() => setBusy(false));
      }}>Sign in with Google</button>
      <Link href="/" className="ml-4 text-sm underline">Other sign-in options</Link>
    </div> : <div className="space-y-5">
      {status && <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-2">
        <p><strong>{status.hasAccess ? 'Pro is active' : 'Pro access is not active'}</strong> - {status.status.replaceAll('_', ' ')}</p>
        {status.periodEnd && <p>{status.cancelAtPeriodEnd ? 'Cancels at period end' : 'Current period ends'}: {new Date(status.periodEnd).toLocaleString()}</p>}
        {status.status === 'past_due' && <p>Payment is overdue. Update your payment method in the portal; Pro resumes after Polar confirms recovery.</p>}
      </div>}
      {confirming && <p role="status" className="text-sm text-slate-600">Waiting for verified payment confirmation. Returning from checkout does not activate Pro by itself.</p>}
      {checkoutReturned && status && !status.hasAccess && !confirming && <p role="status" className="text-sm text-amber-900">Pro has not been confirmed as active. If you already paid, do not purchase again. Refresh status or contact support so the webhook delivery can be checked.</p>}
      <ul className="list-disc pl-5 text-sm text-slate-600 space-y-2">
        <li>AI Marketing Agent with account history</li>
        <li>Period-specific Ads Audit and Reports</li>
        <li>Budget Optimizer and Google Ads campaign changes</li>
      </ul>
      <p className="text-xs text-slate-500">Basic dashboard, campaign viewing, settings, and activity history remain available without Pro. Scheduled cancellations retain access until the paid period ends.</p>
      <div className="flex flex-wrap gap-3">
        {!status?.hasCustomer || !['active', 'past_due', 'trialing'].includes(status.status) ? <>
          <button disabled={busy || !status || confirming} onClick={() => { void action('checkout', 'monthly'); }} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Pro monthly - $29</button>
          <button disabled={busy || !status || confirming} onClick={() => { void action('checkout', 'yearly'); }} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-50">Pro yearly - $99</button>
        </> : null}
        {status?.hasCustomer && <button disabled={busy} onClick={() => { void action('portal'); }} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-50">Manage subscription &amp; invoices</button>}
        <button disabled={busy} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-50" onClick={() => {
          if (auth.currentUser?.uid !== user.uid) return;
          setBusy(true); setError('');
          void synchronizeServerSession(user).then(() => load(user)).then((next) => {
            if (auth.currentUser?.uid === user.uid) setStatus(next);
          }).catch((failure) => {
            if (auth.currentUser?.uid === user.uid) setError(failure instanceof Error ? failure.message : 'Unable to refresh billing.');
          }).finally(() => { if (auth.currentUser?.uid === user.uid) setBusy(false); });
        }}>Refresh status</button>
        {status?.hasAccess && <Link href={returnTo} prefetch={false} className="rounded-xl border border-emerald-500 px-5 py-3 text-sm font-semibold text-emerald-800">Continue to app</Link>}
      </div>
    </div>}
  </section>;
}
