'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdOptimizeProvider, useAdOptimize } from '@/context/adoptimize-context';
import { LandingPage } from '@/components/landing/landing-page';

export function AdOptimizeRootClient() {
  return (
    <AdOptimizeProvider>
      <AdOptimizeRootView />
    </AdOptimizeProvider>
  );
}

function AdOptimizeRootView() {
  const router = useRouter();
  const {
    user,
    authLoading,
    isInitialLoading,
    handleSignOut,
  } = useAdOptimize();

  // Auth & Workspace Data Loading Screen
  if (authLoading || isInitialLoading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading your Google Ads workspace...</p>
        </div>
      </div>
    );
  }

  return (
      <LandingPage
        onOpenApp={() => router.push(user ? '/dashboard' : '/sign-in')}
        onConnectGoogleAds={() => router.push('/sign-up')}
        user={user}
        onSignOut={handleSignOut}
      />
    );
}
