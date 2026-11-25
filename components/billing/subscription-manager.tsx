'use client';

import React, { useEffect, useState } from 'react';
import { AppLoader } from '@/components/ui/app-loader';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthUser } from '@/hooks/use-auth-user';
import { fetchBillingStatus, openPortal, type BillingStatus } from '@/lib/billing-client';

export function SubscriptionManager() {
  const { user, ready } = useAuthUser();
  const [loaded, setLoaded] = useState<{ uid: string; status?: BillingStatus; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [portalError, setPortalError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let pending = false;
    const update = async () => {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const status = await fetchBillingStatus(user);
        if (active) setLoaded({ uid: user.uid, status });
      } catch (failure) {
        if (active) setLoaded((previous) => ({
          uid: user.uid,
          status: previous?.uid === user.uid ? previous.status : undefined,
          error: failure instanceof Error ? failure.message : 'Unable to load your subscription.',
        }));
      } finally {
        pending = false;
      }
    };
    void update();
    const refresh = () => { void update(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [user, attempt]);

  const current = user && loaded?.uid === user.uid ? loaded : null;
  const status = current?.status ?? null;
  const error = portalError || current?.error || '';
  const load = () => { setLoaded(null); setPortalError(''); setAttempt((value) => value + 1); };

  const portal = async () => {
    if (!user || busy) return;
    setBusy(true); setPortalError('');
    try { await openPortal(user); }
    catch (failure) { setPortalError(failure instanceof Error ? failure.message : 'Unable to open the billing portal.'); setBusy(false); }
  };

  const label = status?.hasAccess
    ? `Pro ${status.interval === 'yearly' ? 'yearly' : 'monthly'}`
    : 'Free';
  const canceled = status?.status === 'canceled' || (status?.status === 'active' && status.cancelAtPeriodEnd);
  const statusLabel = canceled
    ? status?.hasAccess ? 'Canceled (access until period end)' : 'Canceled'
    : status?.status.replaceAll('_', ' ');

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Subscription</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your plan, payment method, and invoices.</p>
      </div>
      {status?.environment === 'sandbox' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Sandbox mode: test payments only.</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}
      {current?.error && <button type="button" onClick={load} className="text-sm font-semibold underline">Retry</button>}

      {!ready ? <p role="status" className="text-sm text-slate-500 flex items-center gap-2"><AppLoader className="h-4 w-4" /> Loading...</p>
        : !user ? <p className="text-sm text-slate-600">
          <Link href="/sign-in?next=/billing" className="font-semibold text-indigo-600 underline">Sign in</Link> to manage your subscription.
        </p>
        : !status ? error ? null : <p role="status" className="text-sm text-slate-500 flex items-center gap-2"><AppLoader className="h-4 w-4" /> Loading your subscription...</p>
        : <div className="space-y-5">
          <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-1.5">
            <p><span className="text-slate-500">Plan:</span> <strong>{label}</strong></p>
            <p><span className="text-slate-500">Status:</span> {statusLabel}</p>
            {status.periodEnd && <p><span className="text-slate-500">{canceled || status.cancelAtPeriodEnd ? 'Access ends' : status.hasAccess ? 'Renews' : 'Paid period ends'}:</span> {new Date(status.periodEnd).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>}
            {status.status === 'past_due' && <p className="text-red-700">Your last payment failed. Update your payment method in the portal; Pro resumes after Polar confirms payment.</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            {!status.hasAccess && status.status !== 'past_due' && (
              <Link href="/sign-up" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Upgrade to Pro</Link>
            )}
            {status.hasCustomer && (
              <button disabled={busy} onClick={() => { void portal(); }} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-50">
                Manage subscription &amp; invoices
              </button>
            )}
          </div>
        </div>}
    </section>
  );
}
