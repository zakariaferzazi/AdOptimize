'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuthUser } from '@/hooks/use-auth-user';
import { landing } from './landing-ui';
import { fetchBillingStatus, type BillingStatus } from '@/lib/billing-client';

const LandingSessionContext = createContext<{ hasAccess?: boolean; error?: string } | null>(null);

export function LandingAuditCta({ className = '' }: { className?: string }) {
  const { user, ready } = useAuthUser();
  return (
    <Link href={ready && user ? '/audit' : '/sign-up?next=/audit'} className={`${landing.btnPrimary} ${className}`}>
      Audit now <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

export function LandingSessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthUser();
  const [loaded, setLoaded] = useState<{ uid: string; status?: BillingStatus; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let pending = false;
    const update = async () => {
      if (pending) return;
      pending = true;
      try {
        const status = await fetchBillingStatus(user);
        if (active) setLoaded({ uid: user.uid, status });
      } catch (failure) {
        if (active) setLoaded({ uid: user.uid, error: failure instanceof Error ? failure.message : 'Unable to load your plan.' });
      } finally { pending = false; }
    };
    void update();
    const refresh = () => { if (document.visibilityState !== 'hidden') void update(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [user, attempt]);

  const current = user && loaded?.uid === user.uid ? loaded : null;
  return (
    <LandingSessionContext.Provider value={{ hasAccess: current?.status?.hasAccess, error: current?.error }}>
      {children}
      {current?.error && (
        <div role="alert" className="fixed bottom-4 inset-x-4 z-50 mx-auto max-w-md rounded-xl border border-red-200 bg-white p-4 text-sm text-red-800 shadow-sm">
          {current.error} <button type="button" onClick={() => { setLoaded(null); setAttempt((value) => value + 1); }} className="font-semibold underline">Retry</button>
        </div>
      )}
    </LandingSessionContext.Provider>
  );
}

export function LandingPrimaryCta({ className = '', label = 'Get free audit' }: { className?: string; label?: string }) {
  const { user, ready } = useAuthUser();
  const signedIn = ready && Boolean(user);
  const session = useContext(LandingSessionContext);
  const href = !signedIn ? '/sign-up?next=/audit'
    : !session ? '/audit'
    : session.hasAccess ? '/dashboard'
    : session.hasAccess === false ? '/pricing'
    : '/billing';
  const text = !signedIn ? label : !session ? 'Open audit workspace'
    : session.hasAccess ? 'Go to Dashboard'
    : session.hasAccess === false ? 'Upgrade to Pro'
    : session.error ? 'Manage plan' : 'Checking plan...';

  return (
    <Link
      href={href}
      aria-busy={signedIn && session !== null && session.hasAccess === undefined && !session.error}
      className={`${landing.btnPrimary} ${className}`}
    >
      {text}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

export function LandingAccountLink({ mobile = false, className }: { mobile?: boolean; className?: string }) {
  const { user, ready } = useAuthUser();
  const signedIn = ready && Boolean(user);
  if (signedIn) return null;

  return (
    <Link
      href="/sign-in"
      className={className ?? (mobile
        ? 'block rounded-xl px-4 py-3 text-sm font-medium text-[#1F2937] hover:bg-[#F5F3FF]'
        : 'hidden text-sm font-semibold text-[#1F2937] hover:text-[#2E1065] sm:inline')}
    >
      Sign in
    </Link>
  );
}
