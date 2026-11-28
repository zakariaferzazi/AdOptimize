'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { AppLoader } from '@/components/ui/app-loader';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Sidebar, NavTab } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ConnectModal } from '@/components/connect-modal';
import { useAdOptimize } from '@/context/adoptimize-context';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { acquireGoogleAdsToken, clearStoredGoogleAdsToken } from '@/lib/google-identity';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  headerExtra?: React.ReactNode;
  proLocked?: boolean;
  limitedAccess?: boolean;
}

export function AppShell(props: AppShellProps) {
  return <Suspense fallback={<p role="status" className="flex items-center gap-2 p-8 text-sm text-slate-500"><AppLoader className="h-5 w-5" /> Loading workspace...</p>}><AppShellInner {...props} /></Suspense>;
}

function AppShellInner({ children, title, headerExtra, proLocked = false, limitedAccess = proLocked }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const isDemo = pathname === '/dashboard' && params.get('demo') === 'true';
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const syncedPathRef = useRef(pathname);

  // Close mobile sidebar if route changed
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsMobileSidebarOpen(false);
  }

  const {
    state,
    setState,
    user,
    authLoading,
    toastMessage,
    showToast,
    apiIssue,
    setApiIssue,
    showConnectModal,
    setShowConnectModal,
    isSyncModalOpen,
    setIsSyncModalOpen,
    selectedCampaign,
    setSelectedCampaign,
    isSyncing,
    syncCooldownRemaining,
    lastSyncTimestamp,
    handleSignOut,
    handleSync,
    handleConnectAccount,
    handleApplyRecommendation,
    handleSaveCampaign,
    handleResetData,
  } = useAdOptimize();

  const { account, campaigns, anomalies, budgetRecommendations, auditLogs } = state;

  useEffect(() => {
    if (!authLoading && !user && !isDemo) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname || '/dashboard')}`);
    }
  }, [authLoading, user, isDemo, pathname, router]);

  useEffect(() => {
    if (syncedPathRef.current === pathname) return;
    syncedPathRef.current = pathname;
    if (!limitedAccess && !authLoading && account.isConnected && account.clientCustomerId !== 'Not Connected') {
      void handleSync(true);
    }
  }, [pathname, authLoading, account.isConnected, account.clientCustomerId, handleSync, limitedAccess]);

  // Determine current tab from route
  const getCurrentTab = (): NavTab => {
    if (!pathname) return 'overview';
    if (pathname.includes('/campaigns')) return 'campaigns';
    if (pathname.includes('/audit') || pathname.includes('/insights')) return 'audit';
    if (pathname.includes('/optimizer')) return 'optimizer';
    if (pathname.includes('/chat') || pathname.includes('/copilot')) return 'chat';
    if (pathname.includes('/activity-log')) return 'activity_log';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/settings')) return 'settings';
    return 'overview';
  };

  const handleSwitchToAccessibleCid = async (cid: string) => {
    setApiIssue(null);
    showToast(`Switching to Customer ID ${cid}...`);
    try {
      const res = await fetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_connect',
          customerId: cid,
          userEmail: user?.email || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.account) {
        handleConnectAccount(data.account, data.campaigns || []);
        showToast(`Connected: ${cid}`);
      } else {
        showToast(data.error || 'Failed to switch CID');
      }
    } catch (err: any) {
      showToast('Error switching account');
    }
  };

  const handleReauthenticateAndSync = async () => {
    try {
      clearStoredGoogleAdsToken();
      const token = await acquireGoogleAdsToken({
        emailHint: user?.email || undefined,
        forceFresh: true,
      });
      if (token) {
        await handleSync();
      }
    } catch (err) {
      showToast('Re-authorization failed');
    }
  };

  const handleSwitchGoogleAccount = async () => {
    clearStoredGoogleAdsToken();
    setShowConnectModal(true);
  };

  const currentTab = getCurrentTab();

  if (authLoading || (!user && !isDemo)) {
    return <p role="status" className="flex items-center gap-2 p-8 text-sm text-slate-500"><AppLoader className="h-5 w-5" /> Loading your workspace...</p>;
  }

  return (
    <div className="min-h-screen flex items-stretch bg-[#F5F3FF] text-[#1F2937] selection:bg-[#DDD6FE] selection:text-[#2E1065] font-sans overflow-x-hidden">
      {/* 1. Sidebar Navigation (Desktop collapsible + Mobile slide-over drawer) */}
      <Sidebar
        currentTab={currentTab}
        anomaliesCount={limitedAccess ? 0 : anomalies.filter((a) => !a.resolved).length}
        recommendationsCount={limitedAccess ? 0 : budgetRecommendations.filter((b) => b.status === 'PENDING').length}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isDesktopCollapsed={isDesktopSidebarCollapsed}
        onToggleDesktop={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
      />

      {/* 2. Main Content Canvas (Offset by fixed sidebar width) */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden transition-all duration-300 ${
        isDesktopSidebarCollapsed ? 'lg:pl-0' : 'lg:pl-64'
      }`}>
        {/* Top Header */}
        <Header
          title={title || currentTab}
          account={account}
          anomalies={limitedAccess ? [] : anomalies}
          isSyncing={isSyncing}
          syncCooldownRemaining={syncCooldownRemaining}
          lastSyncTimestamp={lastSyncTimestamp}
          user={user}
          authLoading={authLoading}
          onRefreshSync={() => limitedAccess ? router.push('/pricing') : handleSync(true)}
          onSelectAnomaly={(anomaly) => {
            const camp = campaigns.find((c) => c.id === anomaly.campaignId);
            if (camp) setSelectedCampaign(camp);
          }}
          onSignInWithGoogle={() => router.push('/sign-in')}
          onSignOut={handleSignOut}
          headerExtra={headerExtra}
          onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
          isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
          onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
        />

        {/* Dynamic View Container */}
        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 pb-10 space-y-6 max-w-7xl w-full mx-auto min-w-0">


          {/* Page Content */}
          {proLocked ? (
            <>
              <section className="rounded-xl border border-[#DDD6FE] bg-white p-5 text-sm text-[#2E1065]" aria-label="Pro access required">
                <p className="font-semibold">Upgrade to Pro to use this feature and view live data.</p>
                <p className="mt-1 text-slate-600">The workspace below is a locked preview; values shown are not your account data.</p>
                <Link href="/pricing" className="mt-3 inline-block font-semibold text-[#6D28D9] underline">See Pro plans</Link>
              </section>
              <div inert aria-hidden="true" className="select-none opacity-70">{children}</div>
            </>
          ) : children}
        </main>
      </div>

      {/* Connect Account Modal */}
      <ConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        currentAccount={account}
        onConnectAccount={(connectedAccount, syncedCampaigns, token, keywords, searchTerms) => {
          handleConnectAccount(connectedAccount, syncedCampaigns, token, keywords, searchTerms);
        }}
        onApiError={(issue) => {
          setApiIssue(issue);
        }}
        userEmail={user?.email}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-2 h-2 rounded-full bg-[#6D28D9] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
