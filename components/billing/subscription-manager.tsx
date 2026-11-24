'use client';

import { useEffect, useState } from 'react';
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
    fetchBillingStatus(user).then(
      (status) => { if (active) setLoaded({ uid: user.uid, status }); },
      (failure) => { if (active) setLoaded({ uid: user.uid, error: failure instanceof Error ? failure.message : 'Unable to load your subscription.' }); },
    );
    return () => { active = false; };
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

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Subscription</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your plan, payment method, and invoices.</p>
      </div>
      {status?.environment === 'sandbox' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Sandbox mode: test payments only.</p>}
      {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</p>}

      {!ready ? <p role="status" className="text-sm text-slate-500">Loading...</p>
        : !user ? <p className="text-sm text-slate-600">
          <Link href="/sign-in?next=/billing" className="font-semibold text-indigo-600 underline">Sign in</Link> to manage your subscription.
        </p>
        : !status ? error ? null : <p role="status" className="text-sm text-slate-500 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Loading your subscription...</p>
        : <div className="space-y-5">
          <div className="rounded-xl bg-slate-50 p-4 text-sm space-y-1.5">
            <p><span className="text-slate-500">Plan:</span> <strong>{label}</strong></p>
            <p><span className="text-slate-500">Status:</span> {status.status.replaceAll('_', ' ')}</p>
            {status.periodEnd && <p><span className="text-slate-500">{status.cancelAtPeriodEnd ? 'Access ends' : 'Renews'}:</span> {new Date(status.periodEnd).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>}
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
            <button disabled={busy} onClick={load} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-50">Refresh status</button>
          </div>
        </div>}
    </section>
  );
}
