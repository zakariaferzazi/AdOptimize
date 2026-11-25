'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { Stepper } from '@/components/auth/auth-flow';
import { useAuthUser } from '@/hooks/use-auth-user';
import { synchronizeServerSession } from '@/lib/auth-session';
import { fetchBillingStatus } from '@/lib/billing-client';
import { PostPaymentConnect } from '@/components/billing/post-payment-connect';

type Phase = 'waiting' | 'active' | 'timeout' | 'error';
const ATTEMPTS = 20;

// Returning from checkout proves nothing. Access appears only after the verified webhook updates server state.
export function CheckoutSuccess() {
  const { user, ready } = useAuthUser();
  const [phase, setPhase] = useState<Phase>('waiting');

  useEffect(() => {
    if (!user) return;
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const status = await fetchBillingStatus(user);
        if (!active) return;
        if (status.hasAccess) {
          await synchronizeServerSession(user);
          if (active) setPhase('active');
          return;
        }
        if (++attempts >= ATTEMPTS) { setPhase('timeout'); return; }
        timer = setTimeout(() => { void poll(); }, 3000);
      } catch {
        if (active) setPhase('error');
      }
    };
    void poll();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [user]);

  return (
    <main className="min-h-screen bg-[#a9bffc] p-4 flex items-center justify-center font-sans">
      <div className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl p-8 sm:p-10 space-y-6">
        <Stepper current={phase === 'active' ? 3 : 2} />
        {!ready ? <p role="status" className="text-sm text-slate-500">Loading...</p>
          : !user ? (
            <div className="space-y-3">
              <h1 className="text-2xl font-extrabold text-slate-900">Sign in to confirm your payment</h1>
              <Link href="/sign-in?next=%2Fbilling%2Fsuccess" className="inline-block rounded-full bg-indigo-600 text-white text-sm font-semibold px-6 py-3">Sign in to continue setup</Link>
            </div>
          ) : phase === 'active' ? (
            <div className="space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <h1 className="text-2xl font-extrabold text-slate-900">Welcome to Pro</h1>
              <p className="text-sm text-slate-600">Your payment is confirmed.</p>
              <PostPaymentConnect />
            </div>
          ) : phase === 'waiting' ? (
            <div className="space-y-3" role="status">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <h1 className="text-2xl font-extrabold text-slate-900">Confirming your payment</h1>
              <p className="text-sm text-slate-600">This usually takes a few seconds. Pro unlocks as soon as Polar confirms the payment to our servers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h1 className="text-2xl font-extrabold text-slate-900">{phase === 'timeout' ? 'Still waiting for confirmation' : 'We could not check your payment'}</h1>
              <p className="text-sm text-slate-600">
                {phase === 'timeout'
                  ? 'If you already paid, do not purchase again. Confirmation can take a little longer; check your billing page shortly or contact support.'
                  : 'Please check your connection and try again from your billing page.'}
              </p>
              <Link href="/billing" className="inline-block rounded-full bg-indigo-600 text-white text-sm font-semibold px-6 py-3">Open billing</Link>
            </div>
          )}
      </div>
    </main>
  );
}
