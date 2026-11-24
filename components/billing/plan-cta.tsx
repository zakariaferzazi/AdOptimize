'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/hooks/use-auth-user';
import type { PlanInterval } from '@/lib/auth-redirect';
import { BillingClientError, fetchBillingStatus, startCheckout } from '@/lib/billing-client';

// New visitors go to sign-up; signed-in users go straight to a server-created checkout.
export function PlanCta({ interval, label, className }: { interval: PlanInterval; label: string; className: string }) {
  const router = useRouter();
  const { user, ready } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const click = async () => {
    if (!ready || busy) return;
    if (!user) { router.push(`/sign-up?plan=${interval}`); return; }
    setBusy(true); setError('');
    try {
      if ((await fetchBillingStatus(user)).hasAccess) { router.push('/dashboard'); return; }
      await startCheckout(user, interval);
    } catch (failure) {
      if (failure instanceof BillingClientError && failure.status === 409) { router.push('/billing'); return; }
      setError(failure instanceof Error ? failure.message : 'Unable to open checkout.');
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => { void click(); }} disabled={!ready || busy} className={`${className} disabled:opacity-60`}>
        {busy ? 'Opening checkout...' : label}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </>
  );
}
