'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuthUser } from '@/hooks/use-auth-user';
import { landing } from './landing-ui';

export function LandingPrimaryCta({ className = '' }: { className?: string }) {
  const { user, ready } = useAuthUser();
  const signedIn = ready && Boolean(user);

  return (
    <Link
      href={signedIn ? '/dashboard' : '/sign-up'}
      className={`${landing.btnPrimary} ${className}`}
    >
      {signedIn ? 'Go to Dashboard' : 'Create free account'}
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
