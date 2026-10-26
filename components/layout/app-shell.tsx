'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sidebar, NavTab } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ConnectModal } from '@/components/connect-modal';
import { CampaignSyncModal } from '@/components/campaigns/campaign-sync-modal';
import { CopilotDrawer } from '@/components/copilot/copilot-drawer';
import { useAdOptimize } from '@/context/adoptimize-context';
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

export function AppShell({ children, title, headerExtra }: AppShellProps) {
  const pathname = usePathname();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

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
    handleSignInWithGoogle,
    handleSignOut,
    handleSync,
    handleConnectAccount,
    handleApplyRecommendation,
    handleSaveCampaign,
    handleResetData,
  } = useAdOptimize();

  const { account, campaigns, anomalies, budgetRecommendations, auditLogs } = state;

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
    <div className="min-h-screen flex bg-[#f6f8fa] text-slate-900 selection:bg-[#00d67d]/20 selection:text-slate-900 font-sans overflow-x-hidden">
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

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden transition-all duration-300">
        {/* Top Header */}
        <Header
          title={title || currentTab}
          account={account}
          anomalies={anomalies}
          isSyncing={isSyncing}
          user={user}
          authLoading={authLoading}
          onRefreshSync={handleSync}
          onOpenConnectModal={() => setShowConnectModal(true)}
          onOpenCopilot={() => setShowCopilot(true)}
          onSelectAnomaly={(anomaly) => {
            const camp = campaigns.find((c) => c.id === anomaly.campaignId);
            if (camp) setSelectedCampaign(camp);
          }}
          onSignInWithGoogle={handleSignInWithGoogle}
          onSignOut={handleSignOut}
          onClearData={handleResetData}
          headerExtra={headerExtra}
          onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
          isDesktopSidebarCollapsed={isDesktopSidebarCollapsed}
          onToggleDesktopSidebar={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
        />

        {/* Dynamic View Container */}
        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 pb-10 space-y-6 max-w-7xl w-full mx-auto min-w-0">
          {/* Real Google Ads API Issue Alert Banner */}
          {apiIssue && (
            <div className="bg-rose-50/95 border-2 border-rose-300 rounded-3xl p-5 shadow-sm text-slate-900 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-rose-950">
                        Google Ads Connection Notice
                      </h4>
                      {apiIssue.cid && (
                        <span className="font-mono text-xs bg-white px-2 py-0.5 rounded-lg border border-rose-200 font-bold text-rose-900">
                          CID: {apiIssue.cid}
                        </span>
                      )}
                      {apiIssue.statusCode && (
                        <span className="text-[10px] font-mono bg-rose-200 text-rose-900 font-bold px-2 py-0.5 rounded-md">
                          HTTP {apiIssue.statusCode}
                        </span>
                      )}
                      <span className="text-[11px] text-rose-600 font-medium">
                        {apiIssue.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-rose-900 font-medium leading-relaxed max-w-3xl">
                      {apiIssue.message}
                    </p>
                    {apiIssue.details && apiIssue.details !== '{}' && (
                      <p className="text-[11px] text-rose-700 font-mono bg-white/60 p-2 rounded-xl border border-rose-200/60 mt-1 max-w-3xl break-words">
                        {apiIssue.details}
                      </p>
                    )}

                    {/* Accessible Customer IDs detected */}
                    {apiIssue.accessibleCustomers && apiIssue.accessibleCustomers.length > 0 && (
                      <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-3.5 text-xs text-emerald-950 space-y-2 mt-2 max-w-3xl animate-in fade-in">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Accessible Google Ads Accounts for {user?.email || 'this Google login'}:</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          Your Google login has permissions on the following Customer IDs. Click one to switch immediately:
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {apiIssue.accessibleCustomers.map((accCid) => (
                            <button
                              key={accCid}
                              onClick={() => handleSwitchToAccessibleCid(accCid)}
                              disabled={isSyncing}
                              className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl font-mono text-xs font-bold text-emerald-950 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <span>{accCid}</span>
                              <span className="text-[10px] text-emerald-600 font-sans font-bold">↳ Switch &amp; Sync</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(apiIssue.statusCode === 401 || apiIssue.isAuthExpired || apiIssue.message.toLowerCase().includes('authentication') || apiIssue.message.toLowerCase().includes('oauth')) && (
                      <div className="bg-white/95 border border-rose-200 rounded-2xl p-4 text-xs text-rose-950 space-y-3 mt-2 max-w-3xl">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold flex items-center gap-1.5 text-rose-900">
                            <span>🔑 Google Ads Session Renewal:</span>
                          </span>
                          <span className="text-[11px] text-rose-700 font-mono">
                            User: {user?.email || 'Authenticated user'}
                          </span>
                        </div>
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          <button
                            onClick={handleReauthenticateAndSync}
                            disabled={isSyncing}
                            className="px-4 py-2 bg-rose-950 hover:bg-rose-900 disabled:opacity-50 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 text-[#00d67d] ${isSyncing ? 'animate-spin' : ''}`} />
                            <span>Re-authorize Google Ads &amp; Sync</span>
                          </button>
                          <button
                            onClick={() => setShowConnectModal(true)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <span>Open Account Connector</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {(apiIssue.statusCode === 403 || apiIssue.message.toLowerCase().includes('permission')) && (
                      <div className="bg-white/95 border border-rose-200 rounded-2xl p-4 text-xs text-rose-950 space-y-2.5 mt-2 max-w-3xl">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold flex items-center gap-1.5 text-rose-900">
                            <span>Fix &quot;The caller does not have permission&quot;:</span>
                          </span>
                          <span className="text-[11px] text-rose-700 font-mono">
                            Current login: {user?.email || 'Authenticated user'}
                          </span>
                        </div>

                        <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-rose-900 leading-normal">
                          <li>
                            <strong>Account mismatch:</strong> Your signed-in Google account (<code>{user?.email || 'current email'}</code>) does not have access to Google Ads CID <code>{apiIssue.cid}</code>.
                            <div className="pt-1">
                              <button
                                onClick={handleSwitchGoogleAccount}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-950 hover:bg-rose-900 text-white rounded-lg font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                              >
                                <span>Switch Google Account</span>
                                <ArrowRight className="w-3.5 h-3.5 text-[#00d67d]" />
                              </button>
                            </div>
                          </li>
                          <li>
                            <strong>Grant access in Google Ads:</strong> In <a href="https://ads.google.com" target="_blank" rel="noopener noreferrer" className="underline font-bold">ads.google.com</a>, go to <em>Tools &amp; Settings → Access and Security</em>, and verify <code>{user?.email}</code> has been invited with Standard or Admin access.
                          </li>
                          <li>
                            <strong>Managed under MCC:</strong> If your account is accessed via an agency/manager account, click &quot;Change CID&quot;, expand Advanced Settings, and enter your Manager Account ID as the Login Customer ID.
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowConnectModal(true)}
                    className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-950 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    Change CID
                  </button>
                  <button
                    onClick={() => setApiIssue(null)}
                    className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

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

      {/* Sync Campaign Modal */}
      <CampaignSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        account={account}
        onSync={handleSync}
        isSyncing={isSyncing}
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
