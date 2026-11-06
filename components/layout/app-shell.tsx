'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, NavTab } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ConnectModal } from '@/components/connect-modal';
import { CopilotDrawer } from '@/components/copilot/copilot-drawer';
import { AdOptimizeProvider, useAdOptimize } from '@/context/adoptimize-context';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowRight,
  LogIn,
} from 'lucide-react';
import { acquireGoogleAdsToken, clearStoredGoogleAdsToken } from '@/lib/google-identity';

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  headerExtra?: React.ReactNode;
}

export function AppShell(props: AppShellProps) {
  return (
    <AdOptimizeProvider>
      <AppShellInner {...props} />
    </AdOptimizeProvider>
  );
}

function AppShellInner({ children, title, headerExtra }: AppShellProps) {
  const pathname = usePathname();
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
    showCopilot,
    setShowCopilot,
    selectedCampaign,
    setSelectedCampaign,
    isSyncing,
    syncCooldownRemaining,
    lastSyncTimestamp,
    handleSignInWithGoogle,
    handleSignOut,
    handleSync,
    handleConnectAccount,
    handleApplyRecommendation,
    handleSaveCampaign,
    handleResetData,
  } = useAdOptimize();

  const { account, campaigns, anomalies, budgetRecommendations, auditLogs } = state;

  useEffect(() => {
    if (syncedPathRef.current === pathname) return;
    syncedPathRef.current = pathname;
    if (!authLoading && account.isConnected && account.clientCustomerId !== 'Not Connected') {
      void handleSync(true);
    }
  }, [pathname, authLoading, account.isConnected, account.clientCustomerId, handleSync]);

  // Determine current tab from route
  const getCurrentTab = (): NavTab => {
    if (!pathname) return 'overview';
    if (pathname.includes('/campaigns')) return 'campaigns';
    if (pathname.includes('/audit') || pathname.includes('/insights')) return 'audit';
    if (pathname.includes('/optimizer')) return 'optimizer';
    if (pathname.includes('/automations') || pathname.includes('/automation')) return 'automations';
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

  return (
    <div className="min-h-screen flex items-stretch bg-[#f6f8fa] text-slate-900 selection:bg-[#00d67d]/20 selection:text-slate-900 font-sans overflow-x-hidden">
      {/* 1. Sidebar Navigation (Desktop collapsible + Mobile slide-over drawer) */}
      <Sidebar
        currentTab={currentTab}
        anomaliesCount={anomalies.filter((a) => !a.resolved).length}
        recommendationsCount={budgetRecommendations.filter((b) => b.status === 'PENDING').length}
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
          anomalies={anomalies}
          isSyncing={isSyncing}
          syncCooldownRemaining={syncCooldownRemaining}
          lastSyncTimestamp={lastSyncTimestamp}
          user={user}
          authLoading={authLoading}
          onRefreshSync={() => handleSync(true)}
          onOpenCopilot={() => setShowCopilot(true)}
          onSelectAnomaly={(anomaly) => {
            const camp = campaigns.find((c) => c.id === anomaly.campaignId);
            if (camp) setSelectedCampaign(camp);
          }}
          onSignInWithGoogle={handleSignInWithGoogle}
          onSignOut={handleSignOut}
          headerExtra={headerExtra}
          onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
          isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
          onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
        />

        {/* Dynamic View Container */}
        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 pb-10 space-y-6 max-w-7xl w-full mx-auto min-w-0">


          {/* Page Content */}
          {children}
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

      {/* Copilot Chat Drawer */}
      <CopilotDrawer
        isOpen={showCopilot}
        onClose={() => setShowCopilot(false)}
        account={account}
        campaigns={campaigns}
        anomalies={anomalies}
        totalSpend={campaigns.reduce((s, c) => s + (c.spend || 0), 0)}
        totalConversions={campaigns.reduce((s, c) => s + (c.conversions || 0), 0)}
        overallCpa={
          campaigns.reduce((s, c) => s + (c.conversions || 0), 0) > 0
            ? campaigns.reduce((s, c) => s + (c.spend || 0), 0) /
              campaigns.reduce((s, c) => s + (c.conversions || 0), 0)
            : 0
        }
        overallRoas={
          campaigns.reduce((s, c) => s + (c.spend || 0), 0) > 0
            ? campaigns.reduce((s, c) => s + (c.conversionValue || 0), 0) /
              campaigns.reduce((s, c) => s + (c.spend || 0), 0)
            : 0
        }
        userName={user?.displayName || user?.email || undefined}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200">
          <div className="w-2 h-2 rounded-full bg-[#00d67d] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
