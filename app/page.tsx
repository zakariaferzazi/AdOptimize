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
import { CampaignSyncModal } from '@/components/campaigns/campaign-sync-modal';
import { CampaignBoostModal } from '@/components/campaigns/campaign-boost-modal';
import { CampaignEditModal } from '@/components/campaigns/campaign-edit-modal';
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
  Plus,
  RefreshCw,
  ExternalLink,
  Zap
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
  clearAllUserData,
  saveInsightToFirestore,
  saveAnomalyToFirestore
} from '@/lib/firestore-service';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function AdOptimizeApp() {
  const [state, setState] = useState<AdOptimizeState>(() => getInitialState());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [showLanding, setShowLanding] = useState<boolean>(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState<boolean>(false);
  const [boostTargetCampaign, setBoostTargetCampaign] = useState<Campaign | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
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

          // Check if remote data has fake/seeded mock campaigns or legacy fake data
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
                c.name?.includes('High-Intent Core') ||
                c.name?.includes('Omnichannel') ||
                c.name?.includes('Remarketing Funnel') ||
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
      setShowLanding(false);
      showToast('Signed in successfully');
    } catch (err: any) {
      showToast('Sign-in cancelled or closed');
    }
  };

  // Real Firebase Sign Out
  const handleSignOut = async () => {
    try {
      await logOut();
      setState((prev) => ({ ...prev, isDemoMode: false }));
      setShowLanding(true);
      showToast('Signed out successfully');
    } catch (err: any) {
      showToast('Sign-out error');
    }
  };

  // Refresh Sync from Google Ads API
  const handleRefreshSync = async (customCampaignNames?: string[]) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          customerId: account.clientCustomerId,
          accountName: account.accountName,
          customCampaignNames,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      const updatedAccount: GoogleAdsAccount = {
        ...account,
        lastSyncAt: data.lastSyncAt || new Date().toISOString(),
        syncStatus: 'SYNCED',
        isConnected: true,
        totalCampaignsCount: data.campaigns?.length ?? 0,
      };

      const newCampaigns: Campaign[] = data.campaigns || [];
      const newKeywords: Keyword[] = data.keywords || [];
      const newSearchTerms: SearchTerm[] = data.searchTerms || [];
      const newInsights: AIInsight[] = data.insights || [];
      const newAnomalies: AnomalyAlert[] = data.anomalies || [];

      setState((prev) => ({
        ...prev,
        account: updatedAccount,
        campaigns: newCampaigns,
        keywords: newKeywords,
        searchTerms: newSearchTerms,
        insights: newInsights,
        anomalies: newAnomalies,
        isDemoMode: false,
      }));

      if (user) {
        await saveUserAccount(user.uid, updatedAccount);
        if (newCampaigns.length === 0) {
          await clearAllUserData(user.uid);
          await saveUserAccount(user.uid, updatedAccount);
        } else {
          for (const camp of newCampaigns) {
            await saveCampaignToFirestore(user.uid, camp);
          }
          for (const kw of newKeywords) {
            await saveKeywordToFirestore(user.uid, kw);
          }
          for (const st of newSearchTerms) {
            await saveSearchTermToFirestore(user.uid, st);
          }
          for (const ins of newInsights) {
            await saveInsightToFirestore(user.uid, ins);
          }
          for (const anom of newAnomalies) {
            await saveAnomalyToFirestore(user.uid, anom);
          }
        }
      }

      if (newCampaigns.length > 0) {
        showToast(`Synchronized ${newCampaigns.length} campaigns from Google Ads.`);
      } else {
        showToast(data.message || `Sync complete: 0 campaigns found for CID ${account.clientCustomerId}.`);
      }
    } catch (err: any) {
      console.error('Error syncing Google Ads:', err);
      showToast('Error syncing with Google Ads');
    } finally {
      setIsSyncing(false);
    }
  };

  // Connect Google Ads account
  const handleConnectAccount = async (newAccount: GoogleAdsAccount, syncedCampaigns?: Campaign[]) => {
    const campaignsToSet = syncedCampaigns || [];
    setState((prev) => ({
      ...prev,
      account: newAccount,
      campaigns: campaignsToSet,
      keywords: campaignsToSet.length > 0 ? prev.keywords : [],
      searchTerms: campaignsToSet.length > 0 ? prev.searchTerms : [],
      insights: campaignsToSet.length > 0 ? prev.insights : [],
      anomalies: campaignsToSet.length > 0 ? prev.anomalies : [],
      isDemoMode: false,
    }));
    if (user) {
      if (campaignsToSet.length === 0) {
        await clearAllUserData(user.uid);
      }
      await saveUserAccount(user.uid, newAccount);
      if (campaignsToSet.length > 0) {
        for (const camp of campaignsToSet) {
          await saveCampaignToFirestore(user.uid, camp);
        }
      }
    }
    showToast(`Connected: ${newAccount.accountName} (CID: ${newAccount.clientCustomerId})`);
  };

  // Boost Campaign Performance
  const handleApplyBoost = async (
    campaignId: string,
    boostType: string,
    boostDetails: { newBudget?: number; newRoas?: number; newCpa?: number; description: string }
  ) => {
    const targetCamp = state.campaigns.find((c) => c.id === campaignId);
    if (!targetCamp) return;

    const updatedCamp: Campaign = {
      ...targetCamp,
      budgetDaily: boostDetails.newBudget || targetCamp.budgetDaily,
      roas: boostDetails.newRoas || targetCamp.roas,
      cpa: boostDetails.newCpa || targetCamp.cpa,
      healthStatus: 'HEALTHY',
      healthScore: Math.min(99, targetCamp.healthScore + 6),
    };

    const auditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId: targetCamp.id,
      campaignName: targetCamp.name,
      actionType: 'BUDGET_REALLOCATED',
      previousValue: `$${targetCamp.budgetDaily}/d (${targetCamp.roas}x ROAS)`,
      newValue: `$${updatedCamp.budgetDaily}/d (${updatedCamp.roas}x ROAS)`,
      reason: boostDetails.description,
      source: 'AI_RECOMMENDATION',
      userOrSystem: 'AdOptimize AI Agent',
      status: 'EXECUTED',
      canRevert: true,
    };

    setState((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) => (c.id === campaignId ? updatedCamp : c)),
      auditLogs: [auditLog, ...prev.auditLogs],
    }));

    if (user) {
      await saveCampaignToFirestore(user.uid, updatedCamp);
      await addAuditLogToFirestore(user.uid, auditLog);
    }

    showToast(`⚡ Boost Applied: ${targetCamp.name}`);
  };

  // Delete Campaign from Monitoring
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        campaigns: prev.campaigns.filter((c) => c.id !== campaignId),
      }));
      showToast('Campaign removed from monitoring');
      return;
    }

    try {
      await deleteCampaignFromFirestore(user.uid, campaignId);
      setState((prev) => ({
        ...prev,
        campaigns: prev.campaigns.filter((c) => c.id !== campaignId),
      }));
      showToast('Campaign removed from monitoring');
    } catch (err) {
      console.error('Error deleting campaign:', err);
      showToast('Error removing campaign');
    }
  };

  // Open Add/Edit Campaign Modals
  const handleOpenAddCampaign = () => {
    setEditingCampaign(null);
    setIsEditModalOpen(true);
  };

  const handleOpenEditCampaign = (camp: Campaign) => {
    setEditingCampaign(camp);
    setIsEditModalOpen(true);
  };

  // Save / Update Campaign with full Firestore persistence and real AI audit
  const handleSaveCampaign = async (camp: Campaign) => {
    const isExisting = state.campaigns.some((c) => c.id === camp.id);
    let updatedCampaigns: Campaign[] = [];

    if (isExisting) {
      updatedCampaigns = state.campaigns.map((c) => (c.id === camp.id ? camp : c));
    } else {
      updatedCampaigns = [camp, ...state.campaigns];
    }

    const updatedAccount: GoogleAdsAccount = {
      ...state.account,
      isConnected: true,
      totalCampaignsCount: updatedCampaigns.length,
      lastSyncAt: new Date().toISOString(),
    };

    const auditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId: camp.id,
      campaignName: camp.name,
      actionType: isExisting ? 'BUDGET_REALLOCATED' : 'CAMPAIGN_CREATED',
      previousValue: isExisting ? 'Previous settings' : 'None (New campaign)',
      newValue: `$${camp.budgetDaily}/d (${camp.type}, ${camp.status})`,
      reason: isExisting ? 'Manual campaign adjustment' : 'Added to AdOptimize monitoring workspace',
      source: 'USER',
      userOrSystem: user?.displayName || user?.email || 'Marketing Manager',
      status: 'EXECUTED',
      canRevert: false,
    };

    setState((prev) => ({
      ...prev,
      account: updatedAccount,
      campaigns: updatedCampaigns,
      auditLogs: [auditLog, ...prev.auditLogs],
    }));

    if (user) {
      await saveCampaignToFirestore(user.uid, camp);
      await saveUserAccount(user.uid, updatedAccount);
      await addAuditLogToFirestore(user.uid, auditLog);
    }

    showToast(isExisting ? `Updated: ${camp.name}` : `Added campaign: ${camp.name}`);

    // Trigger grounded Gemini AI analysis on updated campaigns in the background
    try {
      fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaigns: updatedCampaigns,
          accountName: updatedAccount.accountName,
        }),
      })
        .then((res) => res.json())
        .then((aiData) => {
          if (aiData.insights && aiData.insights.length > 0) {
            setState((prev) => ({
              ...prev,
              insights: aiData.insights,
              anomalies: aiData.anomalies || prev.anomalies,
              budgetRecommendations: aiData.budgetRecommendations || prev.budgetRecommendations,
            }));
            if (user) {
              for (const ins of aiData.insights) {
                saveInsightToFirestore(user.uid, ins);
              }
            }
          }
        })
        .catch(() => {});
    } catch {}
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

    // Also restore actual campaign values in state and Firestore
    let revertedCampaigns = campaigns;
    if (log.campaignId) {
      const targetCamp = campaigns.find((c) => c.id === log.campaignId);
      if (targetCamp) {
        let updatedCamp = { ...targetCamp };
        if (log.actionType === 'CAMPAIGN_STATUS_CHANGE' && (log.previousValue === 'ENABLED' || log.previousValue === 'PAUSED')) {
          updatedCamp.status = log.previousValue as any;
        } else if (log.actionType === 'BUDGET_REALLOCATED') {
          const match = log.previousValue.match(/\$?(\d+(\.\d+)?)/);
          if (match) {
            updatedCamp.budgetDaily = parseFloat(match[1]);
          }
        }
        revertedCampaigns = campaigns.map((c) => (c.id === log.campaignId ? updatedCamp : c));
        if (user) {
          saveCampaignToFirestore(user.uid, updatedCamp);
        }
      }
    }

    setState((prev) => ({
      ...prev,
      campaigns: revertedCampaigns,
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

  // When user is not logged in and not in demo mode, OR when landing page view is requested:
  // Show the homepage with Sign Up / Log In options, which then seamlessly opens the dashboard
  if (showLanding || (!user && !state.isDemoMode)) {
    return (
      <LandingPage
        onOpenApp={() => {
          setShowLanding(false);
          if (!user && !state.isDemoMode) {
            setState((prev) => ({ ...prev, isDemoMode: true }));
          }
        }}
        onConnectGoogleAds={() => {
          if (!user) {
            handleSignInWithGoogle();
          } else {
            setShowLanding(false);
            setShowConnectModal(true);
          }
        }}
        onSignInWithGoogle={handleSignInWithGoogle}
        user={user}
        onSignOut={handleSignOut}
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
          onClearData={handleClearAllData}
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
                      {account.isConnected && account.clientCustomerId !== 'Not Connected'
                        ? `Connected to CID: ${account.clientCustomerId}`
                        : 'Welcome to your Google Ads Command Center'}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {account.isConnected && account.clientCustomerId !== 'Not Connected'
                        ? 'Your Customer ID is connected. No active campaigns are detected yet in Google Ads. Click below to auto-sync or specify your active campaign names to monitor.'
                        : 'Connect your Google Ads Customer ID (CID) to pull your active campaigns, activate 24/7 AI telemetry, and boost performance.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handleOpenAddCampaign}
                      className="px-5 py-2.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Add Campaign</span>
                    </button>

                    <button
                      onClick={() => setIsSyncModalOpen(true)}
                      className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-[#00d67d]" />
                      <span>Sync Campaigns</span>
                    </button>

                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <span>{account.isConnected && account.clientCustomerId !== 'Not Connected' ? 'Workspace CID' : 'Connect Google Ads CID'}</span>
                    </button>

                    <a
                      href="https://ads.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-2xl text-xs font-bold transition-colors flex items-center gap-2"
                    >
                      <span>Open Google Ads</span>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    </a>
                  </div>
                </div>
              )}

              {/* Top 3 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <MetricCard
                  label="Total Ad Spend (7 Days)"
                  value={`$${metrics.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  changeText={metrics.spend > 0 ? `Daily avg: $${(metrics.spend / 7).toFixed(2)}/day` : 'No spend recorded'}
                  isPositiveChange={true}
                  isNegativeBad={false}
                  icon={DollarSign}
                  variant="dark"
                  subContext={metrics.spend > 0 ? `Pacing: ${Math.round((metrics.spend / (account.monthlySpendCap || 25000)) * 100)}% of cap` : '0 active ad sets'}
                  onClick={() => setCurrentTab('campaigns')}
                />

                <MetricCard
                  label="Verified Conversions"
                  value={metrics.conversions.toString()}
                  changeText={metrics.conversions > 0 ? `Conv. Rate: ${metrics.conversionRate.toFixed(2)}%` : '0 verified conversions'}
                  isPositiveChange={true}
                  isNegativeBad={false}
                  icon={Target}
                  variant="light"
                  subContext={metrics.conversions > 0 ? `${metrics.conversions} goal completions` : 'Awaiting goal conversions'}
                  onClick={() => setCurrentTab('campaigns')}
                />

                <MetricCard
                  label="Account ROAS & Efficiency"
                  value={`${metrics.roas.toFixed(2)}x ROAS`}
                  changeText={metrics.conversions > 0 ? `$${metrics.cpa.toFixed(2)} Blended CPA` : '0.00x return'}
                  isPositiveChange={true}
                  isNegativeBad={false}
                  icon={TrendingUp}
                  variant="light"
                  subContext={metrics.roas >= 3 ? 'Healthy return' : 'Calculated from conversion value / spend'}
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
                  onOpenSyncCampaigns={() => setIsSyncModalOpen(true)}
                  onAddCampaign={handleOpenAddCampaign}
                  onBoostCampaign={(c) => {
                    setBoostTargetCampaign(c);
                    setIsBoostModalOpen(true);
                  }}
                  isSyncing={isSyncing}
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
              onOpenSyncCampaigns={() => setIsSyncModalOpen(true)}
              onAddCampaign={handleOpenAddCampaign}
              onEditCampaign={handleOpenEditCampaign}
              onBoostCampaign={(c) => {
                setBoostTargetCampaign(c);
                setIsBoostModalOpen(true);
              }}
              onDeleteCampaign={handleDeleteCampaign}
              isSyncing={isSyncing}
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
        onBoostCampaign={(c) => {
          setBoostTargetCampaign(c);
          setIsBoostModalOpen(true);
        }}
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

      {/* Sync Google Ads Campaigns Modal */}
      <CampaignSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        account={account}
        onSync={handleRefreshSync}
        isSyncing={isSyncing}
      />

      {/* Campaign Create & Edit Modal */}
      <CampaignEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCampaign(null);
        }}
        campaign={editingCampaign}
        onSave={handleSaveCampaign}
        accountId={account.id}
      />

      {/* Boost Campaign Performance Modal */}
      <CampaignBoostModal
        isOpen={isBoostModalOpen}
        onClose={() => {
          setIsBoostModalOpen(false);
          setBoostTargetCampaign(null);
        }}
        campaign={boostTargetCampaign}
        onApplyBoost={handleApplyBoost}
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
