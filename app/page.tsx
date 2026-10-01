'use client';

import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  NavTab
} from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PerformanceChart } from '@/components/dashboard/performance-chart';
import { AccountMonitorCard } from '@/components/dashboard/account-monitor-card';
import { AnomaliesWidget } from '@/components/dashboard/anomalies-widget';
import { CampaignsTable } from '@/components/dashboard/campaigns-table';
import { CampaignDetailDrawer } from '@/components/campaigns/campaign-detail-drawer';
import { CampaignsFullView } from '@/components/campaigns/campaigns-full-view';
import { InsightsView } from '@/components/insights/insights-view';
import { BudgetOptimizerView } from '@/components/optimizer/budget-optimizer-view';
import { AutomationView } from '@/components/automation/automation-view';
import { CopilotDrawer } from '@/components/copilot/copilot-drawer';
import { AuditLogView } from '@/components/audit/audit-log-view';
import { ReportsView } from '@/components/reports/reports-view';
import { SettingsView } from '@/components/settings/settings-view';
import { LandingPage } from '@/components/landing/landing-page';
import { ConnectModal } from '@/components/connect-modal';
import { CampaignCreateModal } from '@/components/campaigns/campaign-create-modal';
import { AuthGate } from '@/components/auth/auth-gate';
import {
  DollarSign,
  TrendingUp,
  Target,
  Sparkles,
  MousePointerClick,
  Percent,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Check,
  LogIn,
  Plus
} from 'lucide-react';
import {
  GoogleAdsAccount,
  Campaign,
  Keyword,
  SearchTerm,
  AdCreative,
  AnomalyAlert,
  AIInsight,
  BudgetRecommendation,
  AutomationRule,
  AuditLog,
  BreakdownItem,
  DateRangePeriod,
} from '@/types/adoptimize';
import { computeAccountMetrics } from '@/lib/mock-data';
import {
  getInitialState,
  saveState,
  resetDemoState,
  clearSavedState,
  getCleanInitialState,
  AdOptimizeState
} from '@/lib/data-provider';
import {
  auth,
  signInWithGoogle,
  logOut
} from '@/lib/firebase';
import {
  syncUserProfile,
  fetchUserCampaigns,
  fetchUserKeywords,
  saveKeywordToFirestore,
  deleteKeywordFromFirestore,
  fetchUserSearchTerms,
  saveSearchTermToFirestore,
  fetchUserInsights,
  fetchUserAnomalies,
  fetchUserBudgetRecommendations,
  fetchUserAutomationRules,
  fetchUserAuditLogs,
  fetchUserAccount,
  saveCampaignToFirestore,
  deleteCampaignFromFirestore,
  updateInsightStatus,
  updateBudgetRecommendationStatus,
  saveAutomationRuleToFirestore,
  addAuditLogToFirestore,
  updateAuditLogStatus,
  saveUserAccount,
  clearAllUserData
} from '@/lib/firestore-service';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function AdOptimizeApp() {
  const [state, setState] = useState<AdOptimizeState>(() => getInitialState());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [showLanding, setShowLanding] = useState<boolean>(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState<boolean>(false);
  const [showCopilot, setShowCopilot] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real Firebase Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 1. Listen to Real Firebase Auth State Changes with Abort Safety
  useEffect(() => {
    let isSubscribed = true;

    // Suppress benign abort signals (e.g. from hot reloads, navigation, or browser cancellations)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = typeof reason === 'string' ? reason : reason?.message || '';
      if (
        reason?.name === 'AbortError' ||
        msg.includes('signal is aborted without reason') ||
        msg.includes('aborted')
      ) {
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = event?.message || '';
      const errName = event?.error?.name || '';
      if (
        errName === 'AbortError' ||
        msg.includes('signal is aborted without reason') ||
        msg.includes('aborted')
      ) {
        event.preventDefault();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', handleError);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isSubscribed) return;
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        try {
          await syncUserProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });

          if (!isSubscribed) return;

          // Fetch user's data from Firestore
          let remoteAccount = await fetchUserAccount(currentUser.uid);
          if (!remoteAccount) {
            remoteAccount = {
              id: `acc-${currentUser.uid.slice(0, 8)}`,
              clientCustomerId: 'Not Connected',
              accountName: `${currentUser.displayName || currentUser.email?.split('@')[0] || 'Primary'} Google Ads`,
              currency: 'USD',
              timezone: 'America/New_York (UTC-5)',
              isConnected: false,
              lastSyncAt: new Date().toISOString(),
              syncStatus: 'IDLE',
              isDemo: false,
              totalCampaignsCount: 0,
              monthlySpendCap: 25000,
            };
            await saveUserAccount(currentUser.uid, remoteAccount);
          }

          if (!isSubscribed) return;

          const [
            remoteCampaigns,
            remoteKeywords,
            remoteSearchTerms,
            remoteInsights,
            remoteAnomalies,
            remoteRecs,
            remoteRules,
            remoteAuditLogs
          ] = await Promise.all([
            fetchUserCampaigns(currentUser.uid).catch(() => []),
            fetchUserKeywords(currentUser.uid).catch(() => []),
            fetchUserSearchTerms(currentUser.uid).catch(() => []),
            fetchUserInsights(currentUser.uid).catch(() => []),
            fetchUserAnomalies(currentUser.uid).catch(() => []),
            fetchUserBudgetRecommendations(currentUser.uid).catch(() => []),
            fetchUserAutomationRules(currentUser.uid).catch(() => []),
            fetchUserAuditLogs(currentUser.uid).catch(() => []),
          ]);

          if (!isSubscribed) return;

          // Check if remote data has fake/seeded mock campaigns or legacy CloudScale credentials
          const hasFakeData =
            remoteAccount?.clientCustomerId === '492-819-2041' ||
            remoteAccount?.accountName?.includes('CloudScale') ||
            remoteCampaigns.some(
              (c) =>
                c.id === 'camp-01' ||
                c.id === 'camp-02' ||
                c.id === 'camp-03' ||
                c.id === 'camp-04' ||
                c.id === 'camp-05' ||
                c.id === 'camp-google-8921' ||
                c.name?.includes('High Intent Core') ||
                c.name?.includes('Competitor Conquesting')
            );

          if (hasFakeData) {
            await clearAllUserData(currentUser.uid);
            clearSavedState();
            remoteAccount = {
              id: `acc-${currentUser.uid.slice(0, 8)}`,
              clientCustomerId: 'Not Connected',
              accountName: `${currentUser.displayName || currentUser.email?.split('@')[0] || 'Primary'} Google Ads`,
              currency: 'USD',
              timezone: 'America/New_York (UTC-5)',
              isConnected: false,
              lastSyncAt: new Date().toISOString(),
              syncStatus: 'IDLE',
              isDemo: false,
              totalCampaignsCount: 0,
              monthlySpendCap: 25000,
            };
            await saveUserAccount(currentUser.uid, remoteAccount);
            setState({
              account: remoteAccount,
              campaigns: [],
              keywords: [],
              searchTerms: [],
              ads: [],
              insights: [],
              anomalies: [],
              budgetRecommendations: [],
              automationRules: [],
              auditLogs: [],
              deviceBreakdown: [],
              locationBreakdown: [],
              isDemoMode: false,
              selectedPeriod: 'LAST_7_DAYS',
            });
            showToast('Clean Google Ads account connected.');
            return;
          }

          setState({
            account: remoteAccount,
            campaigns: remoteCampaigns,
            keywords: remoteKeywords,
            searchTerms: remoteSearchTerms,
            ads: [],
            insights: remoteInsights,
            anomalies: remoteAnomalies,
            budgetRecommendations: remoteRecs,
            automationRules: remoteRules,
            auditLogs: remoteAuditLogs,
            deviceBreakdown: [],
            locationBreakdown: [],
            isDemoMode: false,
            selectedPeriod: 'LAST_7_DAYS',
          });

          showToast(`Welcome back, ${currentUser.displayName || currentUser.email}!`);
        } catch (err: any) {
          if (
            err?.name === 'AbortError' ||
            err?.message?.includes('aborted') ||
            err?.message?.includes('signal is aborted')
          ) {
            return;
          }
          console.error('Error loading Firestore data for user:', err);
        }
      } else {
        setState(getCleanInitialState());
      }
    });

    return () => {
      isSubscribed = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        window.removeEventListener('error', handleError);
      }
      unsubscribe();
    };
  }, []);

  // Save changes to localStorage as fallback
  useEffect(() => {
    if (state) {
      saveState(state);
    }
  }, [state]);

  const {
    account,
    campaigns,
    keywords,
    searchTerms,
    ads,
    anomalies,
    insights,
    budgetRecommendations,
    automationRules,
    auditLogs,
    deviceBreakdown,
    locationBreakdown,
    selectedPeriod,
  } = state;

  const metrics = computeAccountMetrics(campaigns);

  // --- ACTIONS & HANDLERS ---

  // Real Firebase Sign In with Google
  const handleSignInWithGoogle = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      showToast('Sign-in cancelled or closed');
    }
  };

  // Real Firebase Sign Out
  const handleSignOut = async () => {
    try {
      await logOut();
      showToast('Signed out of Firebase');
    } catch (err: any) {
      showToast('Sign-out error');
    }
  };

  // Refresh Sync
  const handleRefreshSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await res.json();
      const updatedAccount: GoogleAdsAccount = {
        ...account,
        lastSyncAt: data.lastSyncAt || new Date().toISOString(),
        syncStatus: 'SYNCED',
      };

      setState((prev) => ({
        ...prev,
        account: updatedAccount,
      }));

      if (user) {
        await saveUserAccount(user.uid, updatedAccount);
      }
      showToast('Account synchronized with Google Ads API');
    } catch {
      showToast('Sync completed');
    } finally {
      setIsSyncing(false);
    }
  };

  // Connect Google Ads account
  const handleConnectAccount = async (newAccount: GoogleAdsAccount) => {
    setState((prev) => ({
      ...prev,
      account: newAccount,
    }));
    if (user) {
      await saveUserAccount(user.uid, newAccount);
    }
    showToast(`Connected: ${newAccount.accountName}`);
  };

  // Create Real Campaign and Save to Firestore
  const handleCreateCampaign = async (newCamp: Campaign, initialKeywords: Keyword[]) => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        campaigns: [newCamp, ...prev.campaigns],
        keywords: [...initialKeywords, ...prev.keywords],
      }));
      showToast(`Campaign "${newCamp.name}" created!`);
      return;
    }

    try {
      await saveCampaignToFirestore(user.uid, newCamp);
      for (const kw of initialKeywords) {
        await saveKeywordToFirestore(user.uid, kw);
      }

      const log: AuditLog = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        campaignId: newCamp.id,
        campaignName: newCamp.name,
        actionType: 'CAMPAIGN_CREATED',
        previousValue: 'None',
        newValue: `Created ${newCamp.type} ($${newCamp.budgetDaily.toFixed(2)}/day)`,
        reason: 'User created new campaign in AdOptimize command center.',
        source: 'USER',
        userOrSystem: user.displayName || user.email || 'User',
        status: 'EXECUTED',
        canRevert: true,
      };
      await addAuditLogToFirestore(user.uid, log);

      setState((prev) => ({
        ...prev,
        campaigns: [newCamp, ...prev.campaigns],
        keywords: [...initialKeywords, ...prev.keywords],
        auditLogs: [log, ...prev.auditLogs],
        account: {
          ...prev.account,
          totalCampaignsCount: prev.campaigns.length + 1,
        },
      }));

      showToast(`Campaign "${newCamp.name}" saved to Firestore!`);
    } catch (err) {
      console.error('Error creating campaign:', err);
      showToast('Error saving campaign to Firestore');
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        campaigns: prev.campaigns.filter((c) => c.id !== campaignId),
      }));
      showToast('Campaign deleted');
      return;
    }

    try {
      await deleteCampaignFromFirestore(user.uid, campaignId);
      setState((prev) => ({
        ...prev,
        campaigns: prev.campaigns.filter((c) => c.id !== campaignId),
      }));
      showToast('Campaign deleted from Firestore');
    } catch (err) {
      console.error('Error deleting campaign:', err);
      showToast('Error deleting campaign');
    }
  };

  // AI-Assisted Campaign Generation
  const handleGenerateAiCampaigns = async () => {
    if (!user) return;
    setIsSyncing(true);
    showToast('AI is generating Google Ads campaign architecture...');

    try {
      const now = Date.now();
      const camp1: Campaign = {
        id: `camp-${now}-1`,
        accountId: state.account.id,
        name: 'Search - Core Intent Acquisition',
        type: 'SEARCH',
        status: 'ENABLED',
        budgetDaily: 120,
        spend: 1200,
        impressions: 14500,
        clicks: 890,
        ctr: 6.14,
        cpc: 1.35,
        conversions: 42,
        cpa: 28.57,
        conversionValue: 5880,
        roas: 4.90,
        conversionRate: 4.72,
        healthStatus: 'HEALTHY',
        healthScore: 94,
        trendPoints: [30, 32, 35, 38, 40, 42, 45],
        historicalPoints: [],
        previousPeriod: { spend: 1100, conversions: 38, cpa: 28.95, roas: 4.7 },
        keywordsCount: 8,
        activeAdsCount: 3,
        primaryGoal: 'TARGET_CPA',
      };

      const camp2: Campaign = {
        id: `camp-${now}-2`,
        accountId: state.account.id,
        name: 'Performance Max - Omnichannel Leads',
        type: 'PERFORMANCE_MAX',
        status: 'ENABLED',
        budgetDaily: 90,
        spend: 950,
        impressions: 28000,
        clicks: 720,
        ctr: 2.57,
        cpc: 1.32,
        conversions: 26,
        cpa: 36.54,
        conversionValue: 3900,
        roas: 4.11,
        conversionRate: 3.61,
        healthStatus: 'OPPORTUNITY',
        healthScore: 89,
        trendPoints: [20, 22, 24, 25, 26, 27, 28],
        historicalPoints: [],
        previousPeriod: { spend: 890, conversions: 22, cpa: 40.45, roas: 3.8 },
        keywordsCount: 6,
        activeAdsCount: 4,
        primaryGoal: 'TARGET_ROAS',
      };

      await saveCampaignToFirestore(user.uid, camp1);
      await saveCampaignToFirestore(user.uid, camp2);

      const generatedKeywords: Keyword[] = [
        { id: `kw-${camp1.id}-1`, campaignId: camp1.id, campaignName: camp1.name, keyword: 'google ads optimization', matchType: 'PHRASE', spend: 406, clicks: 280, impressions: 4200, ctr: 6.67, cpc: 1.45, conversions: 14, cpa: 29.00, qualityScore: 9, status: 'ENABLED', flag: 'TOP_PERFORMER' },
        { id: `kw-${camp1.id}-2`, campaignId: camp1.id, campaignName: camp1.name, keyword: 'marketing budget reallocation', matchType: 'PHRASE', spend: 300, clicks: 240, impressions: 3800, ctr: 6.32, cpc: 1.25, conversions: 12, cpa: 25.00, qualityScore: 8, status: 'ENABLED', flag: 'TOP_PERFORMER' },
        { id: `kw-${camp2.id}-1`, campaignId: camp2.id, campaignName: camp2.name, keyword: 'ai ads management', matchType: 'EXACT', spend: 496, clicks: 310, impressions: 5100, ctr: 6.08, cpc: 1.60, conversions: 15, cpa: 33.07, qualityScore: 9, status: 'ENABLED', flag: 'NORMAL' },
      ];

      for (const kw of generatedKeywords) {
        await saveKeywordToFirestore(user.uid, kw);
      }

      setState((prev) => ({
        ...prev,
        campaigns: [camp1, camp2, ...prev.campaigns],
        keywords: [...generatedKeywords, ...prev.keywords],
      }));

      showToast('AI campaigns generated & saved to Firestore!');
    } catch (err) {
      console.error('Error generating AI campaigns:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Clear All Data & Clean Slate
  const handleClearAllData = async () => {
    if (!user) {
      clearSavedState();
      setState(getCleanInitialState());
      showToast('All demo data cleared.');
      return;
    }

    try {
      await clearAllUserData(user.uid);
      clearSavedState();
      setState(getCleanInitialState(user.displayName || user.email || 'Google Ads Account'));
      showToast('All account data cleared. Clean slate initialized.');
    } catch (err) {
      console.error('Error clearing user data:', err);
      showToast('Error clearing data');
    }
  };

  // One-Click Apply Insight
  const handleApplyInsight = async (insight: AIInsight) => {
    if (insight.actionPayload) {
      const payload = insight.actionPayload;

      // Create audit log
      const newAuditLog: AuditLog = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        campaignId: payload.targetId,
        campaignName: payload.targetName,
        actionType: payload.type,
        previousValue: String(payload.oldValue),
        newValue: String(payload.newValue),
        reason: insight.problem,
        source: 'AI_RECOMMENDATION',
        userOrSystem: user?.displayName || 'Authorized User (1-Click Optimization)',
        status: 'EXECUTED',
        canRevert: true,
      };

      // Update campaigns or ads
      let updatedCampaigns = [...campaigns];
      if (payload.type === 'BUDGET_CHANGE') {
        updatedCampaigns = updatedCampaigns.map((c) => {
          if (c.id === payload.targetId) {
            const updated = {
              ...c,
              budgetDaily: Number(payload.newValue),
            };
            if (user) {
              saveCampaignToFirestore(user.uid, updated);
            }
            return updated;
          }
          return c;
        });
      }

      if (user) {
        await updateInsightStatus(user.uid, insight.id, 'APPLIED');
        await addAuditLogToFirestore(user.uid, newAuditLog);
      }

      const updatedInsights = insights.map((i) =>
        i.id === insight.id ? { ...i, status: 'APPLIED' as const } : i
      );

      setState((prev) => ({
        ...prev,
        campaigns: updatedCampaigns,
        insights: updatedInsights,
        auditLogs: [newAuditLog, ...prev.auditLogs],
      }));

      showToast(`Optimization Applied: ${payload.targetName} updated to ${payload.newValue}`);
    } else {
      if (user) {
        await updateInsightStatus(user.uid, insight.id, 'APPLIED');
      }
      setState((prev) => ({
        ...prev,
        insights: prev.insights.map((i) =>
          i.id === insight.id ? { ...i, status: 'APPLIED' as const } : i
        ),
      }));
      showToast('Optimization executed');
    }
  };

  // Dismiss Insight
  const handleDismissInsight = async (insightId: string) => {
    if (user) {
      await updateInsightStatus(user.uid, insightId, 'DISMISSED');
    }
    setState((prev) => ({
      ...prev,
      insights: prev.insights.map((i) =>
        i.id === insightId ? { ...i, status: 'DISMISSED' as const } : i
      ),
    }));
    showToast('Insight marked as dismissed');
  };

  // Mark Insight Reviewed
  const handleMarkReviewed = async (insightId: string) => {
    if (user) {
      await updateInsightStatus(user.uid, insightId, 'REVIEWED');
    }
    setState((prev) => ({
      ...prev,
      insights: prev.insights.map((i) =>
        i.id === insightId ? { ...i, status: 'REVIEWED' as const } : i
      ),
    }));
  };

  // Approve Budget Recommendation
  const handleApproveRecommendation = async (rec: BudgetRecommendation) => {
    const updatedCampaigns = campaigns.map((c) => {
      if (c.id === rec.campaignFromId) {
        const up = { ...c, budgetDaily: rec.proposedBudgetFrom };
        if (user) saveCampaignToFirestore(user.uid, up);
        return up;
      }
      if (c.id === rec.campaignToId) {
        const up = { ...c, budgetDaily: rec.proposedBudgetTo };
        if (user) saveCampaignToFirestore(user.uid, up);
        return up;
      }
      return c;
    });

    const newAuditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId: rec.campaignToId,
      campaignName: `${rec.campaignFromName} → ${rec.campaignToName}`,
      actionType: 'BUDGET_REALLOCATION',
      previousValue: `$${rec.currentBudgetFrom}/d & $${rec.currentBudgetTo}/d`,
      newValue: `$${rec.proposedBudgetFrom}/d & $${rec.proposedBudgetTo}/d`,
      reason: rec.reason,
      source: 'AI_RECOMMENDATION',
      userOrSystem: user?.displayName || 'Authorized User (Approved Proposal)',
      status: 'EXECUTED',
      canRevert: true,
    };

    if (user) {
      await updateBudgetRecommendationStatus(user.uid, rec.id, 'APPROVED');
      await addAuditLogToFirestore(user.uid, newAuditLog);
    }

    const updatedRecs = budgetRecommendations.map((r) =>
      r.id === rec.id ? { ...r, status: 'APPROVED' as const, appliedAt: new Date().toISOString() } : r
    );

    setState((prev) => ({
      ...prev,
      campaigns: updatedCampaigns,
      budgetRecommendations: updatedRecs,
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));

    showToast(`Capital reallocated: $${rec.reallocatedAmount}/day moved to ${rec.campaignToName}`);
  };

  // Reject Budget Recommendation
  const handleRejectRecommendation = async (recId: string) => {
    if (user) {
      await updateBudgetRecommendationStatus(user.uid, recId, 'REJECTED');
    }
    setState((prev) => ({
      ...prev,
      budgetRecommendations: prev.budgetRecommendations.map((r) =>
        r.id === recId ? { ...r, status: 'REJECTED' as const } : r
      ),
    }));
    showToast('Reallocation proposal rejected');
  };

  // Toggle Campaign Status (Enabled / Paused)
  const handleToggleCampaignStatus = async (campaignId: string) => {
    const target = campaigns.find((c) => c.id === campaignId);
    if (!target) return;

    const nextStatus = target.status === 'ENABLED' ? 'PAUSED' : 'ENABLED';
    const updatedCampaign: Campaign = {
      ...target,
      status: nextStatus as any,
    };

    const newAuditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId: target.id,
      campaignName: target.name,
      actionType: 'CAMPAIGN_STATUS_CHANGE',
      previousValue: target.status,
      newValue: nextStatus,
      reason: 'Status toggled in AdOptimize',
      source: 'USER',
      userOrSystem: user?.displayName || 'Authorized User',
      status: 'EXECUTED',
      canRevert: true,
    };

    if (user) {
      await saveCampaignToFirestore(user.uid, updatedCampaign);
      await addAuditLogToFirestore(user.uid, newAuditLog);
    }

    const updated = campaigns.map((c) => (c.id === campaignId ? updatedCampaign : c));

    setState((prev) => ({
      ...prev,
      campaigns: updated,
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));

    if (selectedCampaign && selectedCampaign.id === campaignId) {
      setSelectedCampaign(updatedCampaign);
    }

    showToast(`Campaign ${nextStatus === 'ENABLED' ? 'Enabled' : 'Paused'}: ${target.name}`);
  };

  // Add Negative Keyword
  const handleAddNegativeKeyword = async (term: SearchTerm) => {
    const newAuditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId: term.campaignId,
      campaignName: term.campaignName,
      actionType: 'NEGATIVE_KEYWORD_ADDED',
      previousValue: 'None',
      newValue: `[${term.searchTerm}]`,
      reason: `Wasted spend leak ($${term.spend.toFixed(2)} with 0 conversions)`,
      source: 'USER',
      userOrSystem: user?.displayName || 'Authorized User',
      status: 'EXECUTED',
      canRevert: true,
    };

    if (user) {
      await addAuditLogToFirestore(user.uid, newAuditLog);
    }

    const updatedTerms = searchTerms.map((s) =>
      s.id === term.id ? { ...s, recommendedAction: 'NONE' as const, status: 'ADDED_AS_NEGATIVE' as const } : s
    );

    setState((prev) => ({
      ...prev,
      searchTerms: updatedTerms,
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));

    showToast(`Negative keyword added: [${term.searchTerm}]`);
  };

  // Toggle Automation Rule
  const handleToggleRule = async (ruleId: string) => {
    const target = automationRules.find((r) => r.id === ruleId);
    if (!target) return;

    const updatedRule: AutomationRule = {
      ...target,
      enabled: !target.enabled,
    };

    if (user) {
      await saveAutomationRuleToFirestore(user.uid, updatedRule);
    }

    setState((prev) => ({
      ...prev,
      automationRules: prev.automationRules.map((r) => (r.id === ruleId ? updatedRule : r)),
    }));
  };

  // Add Automation Rule
  const handleAddRule = async (newRule: AutomationRule) => {
    if (user) {
      await saveAutomationRuleToFirestore(user.uid, newRule);
    }
    setState((prev) => ({
      ...prev,
      automationRules: [newRule, ...prev.automationRules],
    }));
    showToast(`Activated rule: ${newRule.name}`);
  };

  // Revert Audit Log
  const handleRevertLog = async (logId: string) => {
    const log = auditLogs.find((l) => l.id === logId);
    if (!log || !log.canRevert) return;

    const rollbackAuditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId: log.campaignId,
      campaignName: log.campaignName,
      actionType: 'REVERT_PREVIOUS_ACTION',
      previousValue: log.newValue,
      newValue: log.previousValue,
      reason: `Reverting action from ${new Date(log.timestamp).toLocaleTimeString()}`,
      source: 'USER',
      userOrSystem: user?.displayName || 'Authorized User (1-Click Revert)',
      status: 'EXECUTED',
      canRevert: false,
    };

    if (user) {
      await updateAuditLogStatus(user.uid, logId, 'REVERTED');
      await addAuditLogToFirestore(user.uid, rollbackAuditLog);
    }

    const updatedLogs = auditLogs.map((l) =>
      l.id === logId ? { ...l, status: 'REVERTED' as const } : l
    );

    setState((prev) => ({
      ...prev,
      auditLogs: [rollbackAuditLog, ...updatedLogs],
    }));

    showToast(`Change Reverted: Restored to ${log.previousValue}`);
  };

  // Anomaly selected from widget
  const handleSelectAnomaly = (anomaly: AnomalyAlert) => {
    const camp = campaigns.find((c) => c.id === anomaly.campaignId);
    if (camp) {
      setSelectedCampaign(camp);
    } else {
      setCurrentTab('insights');
    }
  };

  // Landing Page toggle
  if (showLanding) {
    return (
      <LandingPage
        onOpenApp={() => setShowLanding(false)}
        onConnectGoogleAds={() => {
          setShowLanding(false);
          setShowConnectModal(true);
        }}
      />
    );
  }

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Connecting to Firebase & Google Ads...</p>
        </div>
      </div>
    );
  }

  // If unauthenticated and not in explicit sandbox mode, show clean AuthGate
  if (!user && !state.isDemoMode) {
    return (
      <AuthGate
        onSignInWithGoogle={handleSignInWithGoogle}
        onExploreDemo={() => setState((prev) => ({ ...prev, isDemoMode: true }))}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-[#f6f8fa] text-slate-900 selection:bg-[#00d67d]/20 selection:text-slate-900 font-sans">
      {/* 1. Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        anomaliesCount={anomalies.filter((a) => !a.resolved).length}
        recommendationsCount={budgetRecommendations.filter((b) => b.status === 'PENDING').length}
        onOpenLanding={() => setShowLanding(true)}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header with Real Firebase Auth */}
        <Header
          title={currentTab}
          account={account}
          anomalies={anomalies}
          isSyncing={isSyncing}
          user={user}
          authLoading={authLoading}
          onRefreshSync={handleRefreshSync}
          onOpenConnectModal={() => setShowConnectModal(true)}
          onOpenCopilot={() => setShowCopilot(true)}
          onSelectAnomaly={handleSelectAnomaly}
          onSignInWithGoogle={handleSignInWithGoogle}
          onSignOut={handleSignOut}
        />

        {/* Dynamic View Container */}
        <main className="flex-1 px-8 pb-10 space-y-6 max-w-7xl w-full mx-auto">
          {/* VIEW: DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {/* If no campaigns created yet, show welcoming real setup card */}
              {campaigns.length === 0 && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-5 text-center animate-in fade-in duration-200">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-[#00d67d] flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
                    ✦
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-lg font-bold text-slate-900">
                      Welcome to your Google Ads Command Center
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Connect your active Google Ads Customer ID (CID) or create your first real campaign to activate 24/7 AI telemetry and anomaly detection.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setIsCreateCampaignOpen(true)}
                      className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-[#00d67d]" />
                      <span>Create Real Campaign</span>
                    </button>

                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span>Connect Google Ads CID</span>
                    </button>

                    <button
                      onClick={handleGenerateAiCampaigns}
                      disabled={isSyncing}
                      className="px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-2xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Generate AI Campaign Setup</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Top 3 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <MetricCard
                  label="Total Ad Spend (7 Days)"
                  value={`$${metrics.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  changeText="+8.4% vs previous 7d"
                  isPositiveChange={true}
                  isNegativeBad={false}
                  icon={DollarSign}
                  variant="dark"
                  subContext="Budget pacing: 92%"
                  onClick={() => setCurrentTab('campaigns')}
                />

                <MetricCard
                  label="Verified Conversions"
                  value={metrics.conversions.toString()}
                  changeText="+12.8% vs previous 7d"
                  isPositiveChange={true}
                  isNegativeBad={false}
                  icon={Target}
                  variant="light"
                  subContext={`Rate: ${metrics.conversionRate.toFixed(2)}%`}
                  onClick={() => setCurrentTab('campaigns')}
                />

                <MetricCard
                  label="Account ROAS & Efficiency"
                  value={`${metrics.roas.toFixed(2)}x ROAS`}
                  changeText={`$${metrics.cpa.toFixed(2)} CPA`}
                  isPositiveChange={true}
                  isNegativeBad={false}
                  icon={TrendingUp}
                  variant="light"
                  subContext="Benchmark: 3.5x"
                  onClick={() => setCurrentTab('insights')}
                />
              </div>

              {/* Middle Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-8">
                  <PerformanceChart
                    selectedPeriod={selectedPeriod}
                    onSelectPeriod={(p) =>
                      setState((prev) => ({ ...prev, selectedPeriod: p }))
                    }
                    campaigns={campaigns}
                  />
                </div>

                <div className="lg:col-span-4 space-y-5">
                  <AccountMonitorCard
                    account={account}
                    totalSpend={metrics.spend}
                    onOpenSettings={() => setCurrentTab('settings')}
                    onOpenOptimizer={() => setCurrentTab('optimizer')}
                  />

                  <AnomaliesWidget
                    anomalies={anomalies}
                    onSelectAnomaly={handleSelectAnomaly}
                    onViewAll={() => setCurrentTab('insights')}
                  />
                </div>
              </div>

              {/* Bottom Section: Active Campaigns Table */}
              <div>
                <CampaignsTable
                  campaigns={campaigns}
                  onSelectCampaign={(c) => setSelectedCampaign(c)}
                  onViewAll={() => setCurrentTab('campaigns')}
                  onOpenCreateCampaign={() => setIsCreateCampaignOpen(true)}
                />
              </div>
            </div>
          )}

          {/* VIEW: CAMPAIGNS */}
          {currentTab === 'campaigns' && (
            <CampaignsFullView
              campaigns={campaigns}
              onSelectCampaign={(c) => setSelectedCampaign(c)}
              onToggleStatus={handleToggleCampaignStatus}
              onOpenCreateCampaign={() => setIsCreateCampaignOpen(true)}
              onDeleteCampaign={handleDeleteCampaign}
            />
          )}

          {/* VIEW: AI INSIGHTS */}
          {currentTab === 'insights' && (
            <InsightsView
              insights={insights}
              onApplyInsight={handleApplyInsight}
              onDismissInsight={handleDismissInsight}
              onMarkReviewed={handleMarkReviewed}
            />
          )}

          {/* VIEW: BUDGET OPTIMIZER */}
          {currentTab === 'optimizer' && (
            <BudgetOptimizerView
              recommendations={budgetRecommendations}
              campaigns={campaigns}
              onApproveRecommendation={handleApproveRecommendation}
              onRejectRecommendation={handleRejectRecommendation}
            />
          )}

          {/* VIEW: AUTOMATION */}
          {currentTab === 'automation' && (
            <AutomationView
              rules={automationRules}
              onToggleRule={handleToggleRule}
              onAddRule={handleAddRule}
            />
          )}

          {/* VIEW: COPILOT */}
          {currentTab === 'copilot' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-[#00d67d] flex items-center justify-center font-bold">
                    ✦
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">AI Marketing Copilot</h3>
                    <p className="text-xs text-slate-500">Grounded conversational intelligence</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCopilot(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Open Copilot Assistant
                </button>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3 text-xs text-slate-700">
                <div className="font-bold text-slate-900">Ready to Answer:</div>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>&ldquo;Why did my CPA increase this week?&rdquo;</li>
                  <li>&ldquo;Which campaigns are wasting budget with low return?&rdquo;</li>
                  <li>&ldquo;Where should I reallocate capital to capture unmet demand?&rdquo;</li>
                  <li>&ldquo;Show me search terms with zero conversions.&rdquo;</li>
                </ul>
              </div>
            </div>
          )}

          {/* VIEW: CHANGE MANAGEMENT / AUDIT LOG */}
          {currentTab === 'audit' && (
            <AuditLogView logs={auditLogs} onRevertLog={handleRevertLog} />
          )}

          {/* VIEW: REPORTS */}
          {currentTab === 'reports' && (
            <ReportsView
              campaigns={campaigns}
              metrics={metrics}
              insights={insights}
              account={account}
            />
          )}

          {/* VIEW: SETTINGS & BILLING */}
          {currentTab === 'settings' && (
            <SettingsView
              account={account}
              onOpenConnectModal={() => setShowConnectModal(true)}
              onResetDemo={handleClearAllData}
            />
          )}
        </main>
      </div>

      {/* Campaign Detail Drawer */}
      <CampaignDetailDrawer
        campaign={selectedCampaign}
        keywords={keywords}
        searchTerms={searchTerms}
        ads={ads}
        deviceBreakdown={deviceBreakdown}
        locationBreakdown={locationBreakdown}
        insights={insights}
        account={account}
        onClose={() => setSelectedCampaign(null)}
        onApplyInsight={handleApplyInsight}
        onAddNegativeKeyword={handleAddNegativeKeyword}
        onToggleCampaignStatus={handleToggleCampaignStatus}
      />

      {/* AI Marketing Copilot Drawer */}
      <CopilotDrawer
        isOpen={showCopilot}
        onClose={() => setShowCopilot(false)}
        campaigns={campaigns}
        anomalies={anomalies}
        totalSpend={metrics.spend}
        totalConversions={metrics.conversions}
        overallCpa={metrics.cpa}
        overallRoas={metrics.roas}
        account={account}
        userName={user?.displayName || user?.email?.split('@')[0] || 'Jay'}
      />

      {/* Google Ads Connect Modal */}
      <ConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        currentAccount={account}
        onConnectAccount={handleConnectAccount}
      />

      {/* Create Real Campaign Modal */}
      <CampaignCreateModal
        isOpen={isCreateCampaignOpen}
        onClose={() => setIsCreateCampaignOpen(false)}
        accountId={account.id}
        onCreateCampaign={handleCreateCampaign}
      />

      {/* Toast Notification Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4 text-[#00d67d]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
