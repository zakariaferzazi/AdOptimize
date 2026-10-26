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
import { CampaignAnalysisPage } from '@/components/campaigns/campaign-analysis-page';
import { CampaignsFullView } from '@/components/campaigns/campaigns-full-view';
import { InsightsView } from '@/components/insights/insights-view';
import { BudgetOptimizerView } from '@/components/optimizer/budget-optimizer-view';
import { AutomationView } from '@/components/automation/automation-view';
import { CopilotDrawer } from '@/components/copilot/copilot-drawer';
import { AuditLogView } from '@/components/audit/audit-log-view';
import { AiChatView } from '@/components/chat/ai-chat-view';
import { ReportsView } from '@/components/reports/reports-view';
import { SettingsView } from '@/components/settings/settings-view';
import { ConnectModal } from '@/components/connect-modal';
import { CampaignSyncModal } from '@/components/campaigns/campaign-sync-modal';
import { AuthGate } from '@/components/auth/auth-gate';
import { ConnectAccountsStep } from '@/components/onboarding/connect-accounts-step';
import { LandingPage } from '@/components/landing/landing-page';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  MousePointerClick,
  Percent,
  Layers,
  ArrowUpRight,
  Check,
  LogIn,
  Plus,
  RefreshCw,
  ExternalLink,
  Zap,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Sliders,
  SlidersHorizontal,
  History,
  Sparkles,
  Clock,
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
  requestGoogleAdsAccessToken,
  acquireGoogleAdsToken,
  getStoredGoogleAdsToken,
  clearStoredGoogleAdsToken,
} from '@/lib/google-identity';
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
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function AdOptimizeApp() {
  const [state, setState] = useState<AdOptimizeState>(() => getInitialState());
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [showCopilot, setShowCopilot] = useState<boolean>(false);
  const [showKpiModal, setShowKpiModal] = useState<boolean>(false);
  const [selectedKpis, setSelectedKpis] = useState<{
    spend: boolean;
    conversions: boolean;
    cpa: boolean;
    conversionValue: boolean;
    roas: boolean;
    clicks: boolean;
    ctr: boolean;
  }>({
    spend: true,
    conversions: true,
    cpa: true,
    conversionValue: true,
    roas: true,
    clicks: false,
    ctr: false,
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [oauthToken, setOauthToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('google_ads_oauth_token');
    }
    return null;
  });
  const [apiIssue, setApiIssue] = useState<{
    message: string;
    cid: string;
    timestamp: string;
    severity: 'error' | 'warning';
    statusCode?: number;
    details?: string;
    accessibleCustomers?: string[];
    isAuthExpired?: boolean;
  } | null>(null);

  // Real Firebase Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [showAuthGate, setShowAuthGate] = useState<boolean>(false);

  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 1. Listen to Real Firebase Auth State Changes with Abort Safety
  useEffect(() => {
    let isSubscribed = true;

    // Suppress benign abort signals and popup cancellations (e.g. user closed popup, browser popup blocked, hot reload)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = typeof reason === 'string' ? reason : reason?.message || '';
      const code = reason?.code || '';
      if (
        reason?.name === 'AbortError' ||
        msg.includes('signal is aborted without reason') ||
        msg.includes('aborted') ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/popup-blocked' ||
        msg.includes('cancelled-popup-request') ||
        msg.includes('popup-blocked') ||
        msg.includes('Pending promise was never set')
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
        msg.includes('aborted') ||
        msg.includes('cancelled-popup-request') ||
        msg.includes('popup-blocked') ||
        msg.includes('Pending promise was never set')
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

  const metrics = computeAccountMetrics(campaigns, selectedPeriod);
  const sevenDayMetrics = computeAccountMetrics(campaigns, 'LAST_7_DAYS');
  const allTimeMetrics = computeAccountMetrics(campaigns, 'ALL_TIME');

  // --- ACTIONS & HANDLERS ---

  // Real Firebase Sign In with Google
  const handleSignInWithGoogle = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const res = await signInWithGoogle();
      if (res?.user) {
        showToast('Signed in successfully');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err?.code === 'auth/popup-blocked' || msg.includes('blocked')) {
        showToast('Popup was blocked by your browser. Opening login options...');
        setShowAuthGate(true);
        return;
      }
      showToast(msg || 'Sign-in cancelled or closed');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Real Firebase Sign Out
  const handleSignOut = async () => {
    try {
      await logOut();
      setState((prev) => ({ ...prev, isDemoMode: false }));
      setHasCompletedOnboarding(false);
      showToast('Signed out successfully');
    } catch (err: any) {
      showToast('Sign-out error');
    }
  };

  // Refresh Sync directly from Google Ads API
  const handleRefreshSync = async () => {
    if (!account.isConnected || account.clientCustomerId === 'Not Connected') {
      setShowConnectModal(true);
      return;
    }

    // 1. Check token freshness
    const tokenStatus = getStoredGoogleAdsToken();
    let tokenToUse = oauthToken || tokenStatus.token;

    if (!tokenToUse || tokenStatus.isExpired) {
      showToast('Refreshing Google Ads OAuth token...');
      try {
        const freshToken = await acquireGoogleAdsToken({
          emailHint: user?.email || undefined,
        });
        if (freshToken) {
          tokenToUse = freshToken;
          setOauthToken(freshToken);
        } else {
          setApiIssue({
            message: 'Google Ads session expired. Please re-authenticate your Google account to sync live campaigns.',
            cid: account.clientCustomerId,
            timestamp: new Date().toLocaleTimeString(),
            severity: 'warning',
            isAuthExpired: true,
          });
          setShowConnectModal(true);
          return;
        }
      } catch (authErr: any) {
        if (authErr.code !== 'auth/popup-closed-by-user') {
          setApiIssue({
            message: 'Google Ads session expired. Please re-authenticate your Google account.',
            cid: account.clientCustomerId,
            timestamp: new Date().toLocaleTimeString(),
            severity: 'warning',
            isAuthExpired: true,
          });
          setShowConnectModal(true);
        }
        return;
      }
    }

    setIsSyncing(true);
    try {
      const loginCustomerIdToUse =
        account.loginCustomerId ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('google_ads_login_cid') : undefined) ||
        undefined;
      const developerTokenToUse =
        account.developerToken ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('google_ads_dev_token') : undefined) ||
        undefined;

      const res = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          customerId: account.clientCustomerId,
          accountName: account.accountName,
          accessToken: tokenToUse,
          loginCustomerId: loginCustomerIdToUse,
          developerToken: developerTokenToUse,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || data.apiError || 'Failed to sync with Google Ads API';
        const isAuthIssue =
          res.status === 401 ||
          data.isAuthExpired ||
          /invalid authentication credentials|Expected OAuth 2 access token|UNAUTHENTICATED/i.test(errorMsg);

        if (isAuthIssue) {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('google_ads_oauth_token');
            sessionStorage.removeItem('google_ads_oauth_token_timestamp');
          }
          setOauthToken(null);
        }

        setApiIssue({
          message: isAuthIssue
            ? 'Google Ads authorization session expired. Please re-authenticate your Google account to refresh your credentials.'
            : errorMsg,
          cid: account.clientCustomerId,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'error',
          statusCode: data.statusCode || res.status,
          details: data.details,
          accessibleCustomers: data.accessibleCustomers,
          isAuthExpired: isAuthIssue,
        });
        showToast(isAuthIssue ? 'Google Ads session expired' : `API Error: ${errorMsg}`);
        return;
      }

      // Successful sync: clear previous API issue!
      setApiIssue(null);

      const updatedAccount: GoogleAdsAccount = {
        ...account,
        lastSyncAt: data.lastSyncAt || new Date().toISOString(),
        syncStatus: 'SYNCED',
        isConnected: true,
        totalCampaignsCount: data.campaigns?.length ?? 0,
      };

      const loginCidToKeep = data.loginCustomerIdUsed || account.loginCustomerId;
      if (loginCidToKeep) {
        updatedAccount.loginCustomerId = loginCidToKeep;
      } else {
        delete updatedAccount.loginCustomerId;
      }

      if (data.loginCustomerIdUsed && typeof window !== 'undefined') {
        sessionStorage.setItem('google_ads_login_cid', data.loginCustomerIdUsed);
      }

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
      const errMsg = err.message || 'Error syncing with Google Ads API';
      setApiIssue({
        message: errMsg,
        cid: account.clientCustomerId,
        timestamp: new Date().toLocaleTimeString(),
        severity: 'error',
      });
      showToast('Error syncing with Google Ads');
    } finally {
      setIsSyncing(false);
    }
  };

  // Switch to another Google Account directly
  const handleSwitchGoogleAccount = async () => {
    try {
      clearStoredGoogleAdsToken();
      setOauthToken(null);
      showToast('Opening Google authorization...');
      const token = await acquireGoogleAdsToken();
      if (token) {
        setOauthToken(token);
        showToast('Google account authorized. Opening account connector...');
        setShowConnectModal(true);
      }
    } catch (err: any) {
      if (!err?.message?.includes('closed') && !err?.message?.includes('cancelled')) {
        showToast(`Authorization error: ${err.message || 'Cancelled'}`);
      }
    }
  };

  // Re-authorize Google Ads OAuth and sync immediately
  const handleReauthenticateAndSync = async () => {
    setIsSyncing(true);
    setApiIssue(null);
    try {
      showToast('Opening Google authorization to renew access...');
      clearStoredGoogleAdsToken();
      const freshToken = await acquireGoogleAdsToken({
        emailHint: user?.email || undefined,
      });
      if (!freshToken) {
        showToast('Authorization was cancelled.');
        setIsSyncing(false);
        return;
      }
      setOauthToken(freshToken);
      showToast('Authorization renewed! Syncing live campaigns now...');

      const loginCustomerIdToUse =
        account.loginCustomerId ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('google_ads_login_cid') : undefined) ||
        undefined;
      const developerTokenToUse =
        account.developerToken ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('google_ads_dev_token') : undefined) ||
        undefined;

      const res = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          customerId: account.clientCustomerId,
          accountName: account.accountName,
          accessToken: freshToken,
          loginCustomerId: loginCustomerIdToUse,
          developerToken: developerTokenToUse,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || data.apiError || 'Failed to sync with Google Ads API';
        setApiIssue({
          message: errorMsg,
          cid: account.clientCustomerId,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'error',
          statusCode: data.statusCode || res.status,
          details: data.details,
          accessibleCustomers: data.accessibleCustomers,
          isAuthExpired: data.isAuthExpired,
        });
        showToast(`API Error: ${errorMsg}`);
        return;
      }

      setApiIssue(null);
      const newCampaigns: Campaign[] = data.campaigns || [];
      const newKeywords = data.keywords || [];
      const newSearchTerms = data.searchTerms || [];

      const updatedAccount: GoogleAdsAccount = {
        ...account,
        lastSyncAt: data.lastSyncAt || new Date().toISOString(),
        syncStatus: 'SYNCED',
        isConnected: true,
        totalCampaignsCount: newCampaigns.length,
        isDemo: false,
      };

      setState((prev) => ({
        ...prev,
        account: updatedAccount,
        campaigns: newCampaigns,
        keywords: newKeywords.length > 0 ? newKeywords : prev.keywords,
        searchTerms: newSearchTerms.length > 0 ? newSearchTerms : prev.searchTerms,
      }));

      if (auth.currentUser) {
        try {
          const uid = auth.currentUser.uid;
          await saveUserAccount(uid, updatedAccount);
          for (const camp of newCampaigns) {
            await saveCampaignToFirestore(uid, camp);
          }
        } catch (e) {
          console.warn('Could not save synced account:', e);
        }
      }

      showToast(`Synchronized ${newCampaigns.length} live campaigns for ${account.clientCustomerId}!`);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast(`Re-authentication error: ${err.message || 'Cancelled'}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Switch to one of the user's accessible CIDs and sync
  const handleSwitchToAccessibleCid = async (newCid: string) => {
    const tokenToUse =
      oauthToken ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('google_ads_oauth_token') : null);

    if (!tokenToUse) {
      setShowConnectModal(true);
      return;
    }

    setIsSyncing(true);
    setApiIssue(null);
    try {
      const loginCustomerIdToUse =
        account.loginCustomerId ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('google_ads_login_cid') : undefined) ||
        undefined;
      const developerTokenToUse =
        account.developerToken ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('google_ads_dev_token') : undefined) ||
        undefined;

      const cleanCid = String(newCid || '').replace(/\D/g, '');
      const res = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: `acc-${cleanCid}`,
          customerId: newCid,
          accountName: `Google Ads (${newCid})`,
          accessToken: tokenToUse,
          loginCustomerId: loginCustomerIdToUse,
          developerToken: developerTokenToUse,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || data.apiError || 'Failed to sync with Google Ads API';
        setApiIssue({
          message: errorMsg,
          cid: newCid,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'error',
          statusCode: data.statusCode || res.status,
          details: data.details,
          accessibleCustomers: data.accessibleCustomers,
        });
        showToast(`API Error: ${errorMsg}`);
        return;
      }

      setApiIssue(null);
      const updatedAccount: GoogleAdsAccount = {
        ...account,
        id: `acc-${cleanCid}`,
        clientCustomerId: newCid,
        accountName: `Google Ads (${newCid})`,
        lastSyncAt: data.lastSyncAt || new Date().toISOString(),
        syncStatus: 'SYNCED',
        isConnected: true,
        totalCampaignsCount: data.campaigns?.length ?? 0,
        loginCustomerId: data.loginCustomerIdUsed || account.loginCustomerId,
      };

      if (data.loginCustomerIdUsed && typeof window !== 'undefined') {
        sessionStorage.setItem('google_ads_login_cid', data.loginCustomerIdUsed);
      }

      const newCampaigns: Campaign[] = data.campaigns || [];
      setState((prev) => ({
        ...prev,
        account: updatedAccount,
        campaigns: newCampaigns,
        keywords: newCampaigns.length > 0 ? prev.keywords : [],
        isDemoMode: false,
      }));

      if (user) {
        await saveUserAccount(user.uid, updatedAccount);
      }
      showToast(`Successfully switched to CID ${newCid} and synchronized ${newCampaigns.length} campaigns!`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to switch account'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Connect Google Ads account
  const handleConnectAccount = async (
    newAccount: GoogleAdsAccount,
    syncedCampaigns?: Campaign[],
    token?: string | null,
    syncedKeywords?: Keyword[],
    syncedSearchTerms?: SearchTerm[]
  ) => {
    if (token) {
      setOauthToken(token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('google_ads_oauth_token', token);
      }
    }

    if ((newAccount as any).apiWarning) {
      setApiIssue({
        message: (newAccount as any).apiWarning,
        cid: newAccount.clientCustomerId,
        timestamp: new Date().toLocaleTimeString(),
        severity: 'warning',
      });
    } else {
      setApiIssue(null);
    }

    const campaignsToSet = syncedCampaigns || [];
    setState((prev) => ({
      ...prev,
      account: newAccount,
      campaigns: campaignsToSet,
      keywords: syncedKeywords && syncedKeywords.length > 0 ? syncedKeywords : (campaignsToSet.length > 0 ? prev.keywords : []),
      searchTerms: syncedSearchTerms && syncedSearchTerms.length > 0 ? syncedSearchTerms : (campaignsToSet.length > 0 ? prev.searchTerms : []),
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

  // 1. Unauthenticated: Show LandingPage by default, or AuthGate when clicked
  if (!user && !state.isDemoMode) {
    if (showAuthGate) {
      return (
        <AuthGate
          onSignInSuccess={() => {}}
          onExploreDemo={() => {
            setState((prev) => ({ ...prev, isDemoMode: true }));
          }}
          onBack={() => setShowAuthGate(false)}
        />
      );
    }

    return (
      <LandingPage
        onOpenApp={() => setShowAuthGate(true)}
        onConnectGoogleAds={() => setShowAuthGate(true)}
        onSignInWithGoogle={handleSignInWithGoogle}
        onExploreDemo={() => {
          setState((prev) => ({ ...prev, isDemoMode: true }));
        }}
        user={user}
        onSignOut={handleSignOut}
      />
    );
  }

  // 2. Authenticated but no ad account connected: Show Adspirer Step 2 (Connect Ad Accounts)
  const isAccountConnected = Boolean(
    account.isConnected &&
    account.clientCustomerId &&
    account.clientCustomerId !== 'Not Connected'
  );

  if (user && !isAccountConnected && !hasCompletedOnboarding) {
    return (
      <ConnectAccountsStep
        user={user}
        account={account}
        onConnectSuccess={(connectedAccount, syncedCampaigns, token, keywords, searchTerms) => {
          handleConnectAccount(connectedAccount, syncedCampaigns, token, keywords, searchTerms);
        }}
        onContinueToDashboard={() => {
          setHasCompletedOnboarding(true);
        }}
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
                        Google Ads API Issue
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

                    {(apiIssue.statusCode === 401 || apiIssue.isAuthExpired || apiIssue.message.toLowerCase().includes('authentication') || apiIssue.message.toLowerCase().includes('oauth') || apiIssue.message.toLowerCase().includes('origin')) && (
                      <div className="bg-white/95 border border-rose-200 rounded-2xl p-4 text-xs text-rose-950 space-y-3 mt-2 max-w-3xl">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold flex items-center gap-1.5 text-rose-900">
                            <span>🔑 Google Ads Authorization Session Renewal:</span>
                          </span>
                          <span className="text-[11px] text-rose-700 font-mono">
                            User: {user?.email || 'Authenticated user'}
                          </span>
                        </div>

                        <p className="text-[11px] text-rose-900 leading-relaxed">
                          Your Google Ads session token has expired or requires renewal. Re-authorizing will grant a fresh access token and resume live synchronization:
                        </p>

                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleReauthenticateAndSync()}
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
                            <span>💡 Fix &quot;The caller does not have permission&quot;:</span>
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
                                className="px-3 py-1 bg-rose-950 hover:bg-rose-900 text-white rounded-lg font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              >
                                <span>Switch Google Account</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </li>
                          <li>
                            <strong>Grant access in Google Ads:</strong> In Google Ads, go to{' '}
                            <a
                              href="https://ads.google.com/aw/access"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-bold text-rose-950 hover:text-black inline-flex items-center gap-0.5"
                            >
                              <span>Tools &amp; Settings → Access and Security</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>{' '}
                            and invite <code>{user?.email || 'this email'}</code> with Standard or Administrative access.
                          </li>
                          <li>
                            <strong>Managed under MCC:</strong> If this account is managed under an agency or MCC manager account, open{' '}
                            <button
                              onClick={() => setShowConnectModal(true)}
                              className="underline font-bold text-rose-950 hover:text-black cursor-pointer"
                            >
                              Advanced Settings
                            </button>{' '}
                            and enter your Manager Account ID as the Login Customer ID.
                          </li>
                        </ul>

                        <div className="pt-2 border-t border-rose-200/80 flex items-center gap-2 flex-wrap">
                          <button
                            onClick={handleSwitchGoogleAccount}
                            className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#00d67d]" />
                            <span>Switch Google Account</span>
                          </button>
                          <button
                            onClick={() => setShowConnectModal(true)}
                            className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-300 text-rose-900 rounded-xl font-semibold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>Account Settings</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                  <button
                    onClick={handleRefreshSync}
                    disabled={isSyncing}
                    className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Retry Sync</span>
                  </button>
                  <button
                    onClick={handleSwitchGoogleAccount}
                    className="px-3 py-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Switch Account
                  </button>
                  <button
                    onClick={() => setShowConnectModal(true)}
                    className="px-3 py-2 bg-white hover:bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Change CID / MCC
                  </button>
                  <button
                    onClick={() => setApiIssue(null)}
                    className="p-2 text-rose-400 hover:text-rose-700 rounded-xl hover:bg-rose-100/60 transition-colors cursor-pointer"
                    title="Dismiss alert"
                  >
                    <span className="text-sm font-bold">✕</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WHOLE-PAGE VIEW: CAMPAIGN ANALYSIS (Opens in full page, not sidebar) */}
          {selectedCampaign ? (
            <CampaignAnalysisPage
              campaign={selectedCampaign}
              keywords={keywords}
              searchTerms={searchTerms}
              ads={ads}
              deviceBreakdown={deviceBreakdown}
              locationBreakdown={locationBreakdown}
              insights={insights}
              account={account}
              onBack={() => setSelectedCampaign(null)}
              onApplyInsight={handleApplyInsight}
              onAddNegativeKeyword={handleAddNegativeKeyword}
              onToggleCampaignStatus={handleToggleCampaignStatus}
              onSyncCampaign={handleRefreshSync}
            />
          ) : (
            <>
              {/* VIEW 1: OVERVIEW */}
              {(currentTab === 'overview' || currentTab === 'dashboard') && (
                <div className="space-y-6">
                  {/* If no campaigns created yet, show welcoming setup card */}
                  {campaigns.length === 0 && (
                    <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-5 text-center animate-in fade-in duration-200">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 text-[#00d67d] flex items-center justify-center mx-auto shadow-sm">
                        <Layers className="w-6 h-6 text-[#00d67d]" />
                      </div>
                      <div className="max-w-md mx-auto space-y-1.5">
                        <h3 className="text-lg font-bold text-slate-900">
                          {account.isConnected && account.clientCustomerId !== 'Not Connected'
                            ? `Connected to Account: ${account.clientCustomerId}`
                            : 'Welcome to your Google Ads Command Center'}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {account.isConnected && account.clientCustomerId !== 'Not Connected'
                            ? 'Your account is connected. No active campaigns are detected yet in Google Ads. Click below to synchronize your active campaigns.'
                            : 'Connect your Google Ads account to pull your active campaigns, enable performance monitoring, and boost conversion efficiency.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => setIsSyncModalOpen(true)}
                          className="px-6 py-2.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4 text-slate-950" />
                          <span>Sync Campaigns</span>
                        </button>

                        <button
                          onClick={() => setShowConnectModal(true)}
                          className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <span>Connect Google Ads Account</span>
                        </button>

                        <a
                          href="https://ads.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-colors flex items-center gap-2"
                        >
                          <span>Open ads.google.com</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Customizable KPI & Timing Period Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 px-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900">Performance Period:</span>
                      <span className="text-slate-500 hidden sm:inline">
                        {selectedPeriod === 'LAST_7_DAYS'
                          ? 'Past 7 days performance metrics.'
                          : 'Cumulative all-time performance across all campaigns.'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Period Switcher */}
                      <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                          onClick={() => setState((prev) => ({ ...prev, selectedPeriod: 'LAST_7_DAYS' }))}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            selectedPeriod === 'LAST_7_DAYS'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Last 7 Days
                        </button>
                        <button
                          onClick={() => setState((prev) => ({ ...prev, selectedPeriod: 'ALL_TIME' }))}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            selectedPeriod === 'ALL_TIME'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All-Time Lifetime
                        </button>
                      </div>

                      {/* Customize KPIs Toggle Button */}
                      <button
                        onClick={() => setShowKpiModal(!showKpiModal)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors border flex items-center gap-1.5 cursor-pointer ${
                          showKpiModal
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5 text-[#00d67d]" />
                        <span>Customize KPIs</span>
                      </button>
                    </div>
                  </div>

                  {/* KPI Customizer Drawer/Panel */}
                  {showKpiModal && (
                    <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm animate-in fade-in duration-150 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-900">
                          Toggle Displayed KPI Cards on Overview:
                        </div>
                        <button
                          onClick={() => setShowKpiModal(false)}
                          className="text-xs text-slate-400 hover:text-slate-700"
                        >
                          Done
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-xs">
                        {[
                          { key: 'spend', label: 'Total Ad Spend' },
                          { key: 'conversions', label: 'Conversions' },
                          { key: 'cpa', label: 'Cost / Conv (CPA)' },
                          { key: 'conversionValue', label: 'Conversion Value' },
                          { key: 'roas', label: 'ROAS Yield' },
                          { key: 'clicks', label: 'Clicks' },
                          { key: 'ctr', label: 'Click Rate (CTR)' },
                        ].map((k) => {
                          const isChecked = (selectedKpis as any)[k.key];
                          return (
                            <label
                              key={k.key}
                              className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                isChecked
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                                  : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) =>
                                  setSelectedKpis((prev) => ({
                                    ...prev,
                                    [k.key]: e.target.checked,
                                  }))
                                }
                                className="rounded text-[#00d67d] focus:ring-[#00d67d]"
                              />
                              <span className="text-[11px] truncate">{k.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Customizable Metric Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {selectedKpis.spend && (
                      <MetricCard
                        label={selectedPeriod === 'ALL_TIME' ? 'Total Ad Spend (All-Time)' : 'Total Ad Spend (Last 7 Days)'}
                        value={`$${metrics.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        changeText={
                          selectedPeriod === 'ALL_TIME'
                            ? `Cumulative across ${campaigns.length} campaigns`
                            : metrics.spend > 0
                            ? `Daily avg: $${(metrics.spend / 7).toFixed(2)}/day`
                            : '0 active spend'
                        }
                        isPositiveChange={true}
                        isNegativeBad={false}
                        icon={DollarSign}
                        variant="dark"
                        onClick={() => setCurrentTab('campaigns')}
                      />
                    )}

                    {selectedKpis.conversions && (
                      <MetricCard
                        label={selectedPeriod === 'ALL_TIME' ? 'Conversions (All-Time)' : 'Conversions (Last 7 Days)'}
                        value={metrics.conversions.toString()}
                        changeText={
                          metrics.conversions > 0
                            ? `Conv. Rate: ${metrics.conversionRate.toFixed(2)}%`
                            : '0 recorded conversions'
                        }
                        isPositiveChange={true}
                        isNegativeBad={false}
                        icon={Target}
                        variant="light"
                        onClick={() => setCurrentTab('campaigns')}
                      />
                    )}

                    {selectedKpis.cpa && (
                      <MetricCard
                        label="Cost Per Conversion (CPA)"
                        value={metrics.conversions > 0 ? `$${metrics.cpa.toFixed(2)}` : '$0.00'}
                        changeText={
                          metrics.conversions > 0
                            ? metrics.cpa <= 45
                              ? 'Within target efficiency'
                              : 'Above target benchmark'
                            : 'Awaiting conversions'
                        }
                        isPositiveChange={metrics.cpa <= 45}
                        isNegativeBad={true}
                        icon={TrendingDown}
                        variant="light"
                        onClick={() => setCurrentTab('audit')}
                      />
                    )}

                    {selectedKpis.conversionValue && (
                      <MetricCard
                        label="Conversion Value"
                        value={`$${metrics.conversionValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                        changeText={
                          metrics.conversionValue > metrics.spend
                            ? `+$${(metrics.conversionValue - metrics.spend).toFixed(2)} net margin`
                            : 'Gross revenue generated'
                        }
                        isPositiveChange={true}
                        isNegativeBad={false}
                        icon={DollarSign}
                        variant="light"
                        onClick={() => setCurrentTab('campaigns')}
                      />
                    )}

                    {selectedKpis.roas && (
                      <MetricCard
                        label="Account ROAS"
                        value={`${metrics.roas.toFixed(2)}x`}
                        changeText={
                          metrics.roas >= 3
                            ? 'Profitable commercial return'
                            : metrics.spend > 0
                            ? 'Target ROAS: 3.50x'
                            : '0.00x return'
                        }
                        isPositiveChange={metrics.roas >= 2.5}
                        isNegativeBad={false}
                        icon={TrendingUp}
                        variant="light"
                        onClick={() => setCurrentTab('optimizer')}
                      />
                    )}

                    {selectedKpis.clicks && (
                      <MetricCard
                        label="Total Paid Clicks"
                        value={metrics.clicks.toLocaleString()}
                        changeText={`Avg CPC: $${metrics.cpc.toFixed(2)}`}
                        isPositiveChange={true}
                        isNegativeBad={false}
                        icon={MousePointerClick}
                        variant="light"
                        onClick={() => setCurrentTab('campaigns')}
                      />
                    )}

                    {selectedKpis.ctr && (
                      <MetricCard
                        label="Click-Through Rate (CTR)"
                        value={`${metrics.ctr.toFixed(2)}%`}
                        changeText={`${metrics.impressions.toLocaleString()} impressions`}
                        isPositiveChange={metrics.ctr >= 3.0}
                        isNegativeBad={false}
                        icon={Percent}
                        variant="light"
                        onClick={() => setCurrentTab('campaigns')}
                      />
                    )}
                  </div>

                  {/* Middle Section: Chart & Anomaly Highlights */}
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
                        onViewAll={() => setCurrentTab('audit')}
                      />
                    </div>
                  </div>

                  {/* Campaign Performance Summary Table */}
                  <div>
                    <CampaignsTable
                      campaigns={campaigns}
                      onSelectCampaign={(c) => setSelectedCampaign(c)}
                      onViewAll={() => setCurrentTab('campaigns')}
                      onOpenSyncCampaigns={() => setIsSyncModalOpen(true)}
                      onToggleStatus={handleToggleCampaignStatus}
                      isSyncing={isSyncing}
                    />
                  </div>

                  {/* Recent Account Activity Feed (Overview Requirement) */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-[#00d67d] flex items-center justify-center font-bold">
                          <History className="w-4 h-4 text-[#00d67d]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">
                            Recent Account Activity
                          </h3>
                          <p className="text-xs text-slate-500">
                            Recent changes, optimizations, and budget adjustments
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setCurrentTab('activity_log')}
                        className="text-xs font-bold text-[#00a85e] hover:underline cursor-pointer"
                      >
                        View Full Activity History →
                      </button>
                    </div>

                    {auditLogs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No recent changes recorded yet. Changes made in Campaigns, Optimizer, or AI Chat will be tracked here.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                              <th className="pb-2.5">Timestamp</th>
                              <th className="pb-2.5">Campaign Affected</th>
                              <th className="pb-2.5">Action Taken</th>
                              <th className="pb-2.5">Previous Value</th>
                              <th className="pb-2.5">New Value</th>
                              <th className="pb-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {auditLogs.slice(0, 5).map((log) => (
                              <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-2.5 font-mono text-slate-500">
                                  {new Date(log.timestamp).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td className="py-2.5 font-semibold text-slate-900 max-w-[180px] truncate">
                                  {log.campaignName}
                                </td>
                                <td className="py-2.5">
                                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700">
                                    {log.actionType}
                                  </span>
                                </td>
                                <td className="py-2.5 text-slate-600 font-mono">
                                  {log.previousValue}
                                </td>
                                <td className="py-2.5 text-slate-950 font-bold font-mono">
                                  {log.newValue}
                                </td>
                                <td className="py-2.5">
                                  <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    {log.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 2: CAMPAIGNS */}
              {currentTab === 'campaigns' && (
                <CampaignsFullView
                  campaigns={campaigns}
                  onSelectCampaign={(c) => setSelectedCampaign(c)}
                  onToggleStatus={handleToggleCampaignStatus}
                  onOpenSyncCampaigns={() => setIsSyncModalOpen(true)}
                  onDeleteCampaign={handleDeleteCampaign}
                  isSyncing={isSyncing}
                />
              )}

              {/* VIEW 3: AI ADS AUDIT */}
              {(currentTab === 'audit' || currentTab === 'insights') && (
                <InsightsView
                  insights={insights}
                  onApplyInsight={handleApplyInsight}
                  onDismissInsight={handleDismissInsight}
                  onMarkReviewed={handleMarkReviewed}
                />
              )}

              {/* VIEW 4: BUDGET OPTIMIZER */}
              {currentTab === 'optimizer' && (
                <BudgetOptimizerView
                  recommendations={budgetRecommendations}
                  campaigns={campaigns}
                  onApproveRecommendation={handleApproveRecommendation}
                  onRejectRecommendation={handleRejectRecommendation}
                />
              )}

              {/* VIEW 5: AUTOMATIONS */}
              {(currentTab === 'automations' || currentTab === 'automation') && (
                <AutomationView
                  rules={automationRules}
                  onToggleRule={handleToggleRule}
                  onAddRule={handleAddRule}
                />
              )}

              {/* VIEW 6: AI CHAT ASSISTANT */}
              {(currentTab === 'chat' || currentTab === 'copilot') && (
                <AiChatView
                  account={account}
                  campaigns={campaigns}
                  keywords={keywords}
                  searchTerms={searchTerms}
                  auditLogs={auditLogs}
                  anomalies={anomalies}
                  insights={insights}
                  recommendations={budgetRecommendations}
                  rules={automationRules}
                  userId={user?.uid}
                  accessToken={oauthToken || undefined}
                  onMutateCampaign={(updatedCampaign, newAuditLog) => {
                    setState((prev) => ({
                      ...prev,
                      campaigns: prev.campaigns.map((c) =>
                        c.id === updatedCampaign.id ? updatedCampaign : c
                      ),
                      auditLogs: [newAuditLog, ...prev.auditLogs],
                    }));
                    if (user) {
                      saveCampaignToFirestore(user.uid, updatedCampaign);
                      addAuditLogToFirestore(user.uid, newAuditLog);
                    }
                    showToast(`Updated campaign: ${updatedCampaign.name}`);
                  }}
                  onSelectCampaign={(c) => setSelectedCampaign(c)}
                  onSelectCampaignByName={(name) => {
                    const match = campaigns.find(
                      (c) =>
                        c.name.toLowerCase().includes(name.toLowerCase()) ||
                        c.id === name
                    );
                    if (match) setSelectedCampaign(match);
                  }}
                />
              )}

              {/* SECONDARY VIEW: ACTIVITY LOG */}
              {currentTab === 'activity_log' && (
                <AuditLogView logs={auditLogs} onRevertLog={handleRevertLog} />
              )}

              {/* SECONDARY VIEW: SETTINGS */}
              {currentTab === 'settings' && (
                <SettingsView
                  account={account}
                  onOpenConnectModal={() => setShowConnectModal(true)}
                  onResetDemo={handleClearAllData}
                  userEmail={user?.email}
                />
              )}
            </>
          )}
        </main>
      </div>

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
        onApiError={(issue) => setApiIssue(issue)}
        userEmail={user?.email}
      />

      {/* Sync Google Ads Campaigns Modal */}
      <CampaignSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        account={account}
        onSync={handleRefreshSync}
        isSyncing={isSyncing}
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
