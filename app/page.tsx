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
    handleSignInWithGoogle,
    handleSignOut,
    handleConnectAccount,
  } = useAdOptimize();

  const [showAuthGate, setShowAuthGate] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Auth Loading Screen
  if (authLoading) {
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

  // 2. Authenticated but no ad account connected: Show Step 2 (Connect Ad Accounts)
  const isAccountConnected = Boolean(
    state.account.isConnected &&
    state.account.clientCustomerId &&
    state.account.clientCustomerId !== 'Not Connected'
  );

  if (user && !isAccountConnected && !hasCompletedOnboarding) {
    return (
      <ConnectAccountsStep
        user={user}
        account={state.account}
        onConnectSuccess={(connectedAccount, syncedCampaigns, token, keywords, searchTerms) => {
          handleConnectAccount(connectedAccount, syncedCampaigns, token, keywords, searchTerms);
          router.push('/dashboard');
        }}
        onContinueToDashboard={() => {
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
