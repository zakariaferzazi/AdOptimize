'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdOptimize } from '@/context/adoptimize-context';
import { LandingPage } from '@/components/landing/landing-page';
import { AuthGate } from '@/components/auth/auth-gate';
import { ConnectAccountsStep } from '@/components/onboarding/connect-accounts-step';
import { DashboardClientView } from '@/app/dashboard/dashboard-client';

export default function AdOptimizeRootPage() {
  const router = useRouter();
  const {
    state,
    user,
    authLoading,
    isInitialLoading,
    handleSignInWithGoogle,
    handleSignOut,
    handleConnectAccount,
  } = useAdOptimize();

  const [showAuthGate, setShowAuthGate] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adoptimize_onboarding_completed') === 'true';
    }
    return false;
  });

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

  // 1. Unauthenticated: Show LandingPage by default, or AuthGate when clicked
  if (!user) {
    if (showAuthGate) {
      return (
        <AuthGate
          onSignInSuccess={() => {
            router.push('/dashboard');
          }}
          onBack={() => setShowAuthGate(false)}
        />
      );
    }

    return (
      <LandingPage
        onOpenApp={() => router.push('/dashboard')}
        onConnectGoogleAds={() => setShowAuthGate(true)}
        onSignInWithGoogle={handleSignInWithGoogle}
        user={user}
        onSignOut={handleSignOut}
      />
    );
  }

  // 2. Authenticated: Check if ad account is connected
  const isAccountConnected = Boolean(
    state.account.isConnected &&
    state.account.clientCustomerId &&
    state.account.clientCustomerId !== 'Not Connected'
  );

  // If user is connected OR has already completed onboarding, go straight to dashboard
  if (user && !isAccountConnected && !hasCompletedOnboarding) {
    return (
      <ConnectAccountsStep
        user={user}
        account={state.account}
        onConnectSuccess={(connectedAccount, syncedCampaigns, token, keywords, searchTerms) => {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('adoptimize_onboarding_completed', 'true');
            } catch {}
          }
          setHasCompletedOnboarding(true);
          handleConnectAccount(connectedAccount, syncedCampaigns, token, keywords, searchTerms);
          router.push('/dashboard');
        }}
        onContinueToDashboard={() => {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('adoptimize_onboarding_completed', 'true');
            } catch {}
          }
          setHasCompletedOnboarding(true);
          router.push('/dashboard');
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  // 3. Authenticated workspace: Render Dashboard directly
  return <DashboardClientView />;
}
