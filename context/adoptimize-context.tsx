'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
} from '@/types/adoptimize';
import {
  getInitialState,
  saveState,
  clearSavedState,
  getCleanInitialState,
  AdOptimizeState,
} from '@/lib/data-provider';
import {
  auth,
  signInWithGoogle,
  logOut,
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
  saveAnomalyToFirestore,
} from '@/lib/firestore-service';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export interface ApiIssue {
  message: string;
  cid: string;
  timestamp: string;
  severity: 'error' | 'warning';
  statusCode?: number;
  details?: string;
  accessibleCustomers?: string[];
  isAuthExpired?: boolean;
}

interface AdOptimizeContextType {
  state: AdOptimizeState;
  setState: React.Dispatch<React.SetStateAction<AdOptimizeState>>;
  user: User | null;
  authLoading: boolean;
  isInitialLoading: boolean;
  isSigningIn: boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  apiIssue: ApiIssue | null;
  setApiIssue: React.Dispatch<React.SetStateAction<ApiIssue | null>>;
  showConnectModal: boolean;
  setShowConnectModal: (val: boolean) => void;
  isSyncModalOpen: boolean;
  setIsSyncModalOpen: (val: boolean) => void;
  showCopilot: boolean;
  setShowCopilot: (val: boolean) => void;
  selectedCampaign: Campaign | null;
  setSelectedCampaign: (c: Campaign | null) => void;
  isSyncing: boolean;
  oauthToken: string | null;
  handleSignInWithGoogle: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleSync: () => Promise<void>;
  handleConnectAccount: (
    connectedAccount: GoogleAdsAccount,
    syncedCampaigns?: Campaign[],
    token?: string | null,
    syncedKeywords?: Keyword[],
    syncedSearchTerms?: SearchTerm[]
  ) => void;
  handleApplyRecommendation: (recId: string) => Promise<void>;
  handleToggleRule: (ruleId: string) => Promise<void>;
  handleAddRule: (rule: AutomationRule) => Promise<void>;
  handleDeleteRule: (ruleId: string) => Promise<void>;
  handleRevertLog: (logId: string) => Promise<void>;
  handleResetData: () => Promise<void>;
  handleSaveCampaign: (updatedCamp: Campaign) => Promise<void>;
}

const AdOptimizeContext = createContext<AdOptimizeContextType | undefined>(undefined);

export function AdOptimizeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AdOptimizeState>(() => getInitialState());
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [showCopilot, setShowCopilot] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [oauthToken, setOauthToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('google_ads_oauth_token');
    }
    return null;
  });
  const [apiIssue, setApiIssue] = useState<ApiIssue | null>(null);

  // Firebase Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  // Listen to Firebase Auth
  useEffect(() => {
    let isSubscribed = true;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = typeof reason === 'string' ? reason : reason?.message || '';
      const code = reason?.code || '';
      if (
        reason?.name === 'AbortError' ||
        msg.includes('signal is aborted') ||
        msg.includes('aborted') ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/popup-blocked'
      ) {
        event.preventDefault();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    const safetyTimer = setTimeout(() => {
      if (isSubscribed) {
        setIsInitialLoading(false);
      }
    }, 1400);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isSubscribed) return;
      setUser(currentUser);
      setAuthLoading(false);

      if (!currentUser) {
        setIsInitialLoading(false);
        return;
      }

      if (currentUser) {
        try {
          await syncUserProfile({
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });

          if (!isSubscribed) return;

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
            remoteAuditLogs,
          ] = await Promise.all([
            fetchUserCampaigns(currentUser.uid),
            fetchUserKeywords(currentUser.uid),
            fetchUserSearchTerms(currentUser.uid),
            fetchUserInsights(currentUser.uid),
            fetchUserAnomalies(currentUser.uid),
            fetchUserBudgetRecommendations(currentUser.uid),
            fetchUserAutomationRules(currentUser.uid),
            fetchUserAuditLogs(currentUser.uid),
          ]);

          if (!isSubscribed) return;

          setState((prev) => ({
            ...prev,
            account: remoteAccount || prev.account,
            campaigns: remoteCampaigns.length > 0 ? remoteCampaigns : prev.campaigns,
            keywords: remoteKeywords.length > 0 ? remoteKeywords : prev.keywords,
            searchTerms: remoteSearchTerms.length > 0 ? remoteSearchTerms : prev.searchTerms,
            insights: remoteInsights.length > 0 ? remoteInsights : prev.insights,
            anomalies: remoteAnomalies.length > 0 ? remoteAnomalies : prev.anomalies,
            budgetRecommendations: remoteRecs.length > 0 ? remoteRecs : prev.budgetRecommendations,
            automationRules: remoteRules.length > 0 ? remoteRules : prev.automationRules,
            auditLogs: remoteAuditLogs.length > 0 ? remoteAuditLogs : prev.auditLogs,
            isDemoMode: false,
          }));
        } catch (err) {
          console.error('Error fetching user data from Firestore:', err);
        } finally {
          if (isSubscribed) {
            setIsInitialLoading(false);
          }
        }
      }
    });

    return () => {
      isSubscribed = false;
      clearTimeout(safetyTimer);
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, []);

  const isConnected = state.account.isConnected;
  const clientCustomerId = state.account.clientCustomerId;
  const loginCustomerId = state.account.loginCustomerId;
  const accountCurrency = state.account.currency;

  // Real-time automatic background synchronization for connected Google Ads accounts
  useEffect(() => {
    if (!isConnected || !clientCustomerId || clientCustomerId === 'Not Connected') {
      return;
    }

    const performBackgroundSync = async () => {
      // Only sync if browser tab is active/visible and not already busy syncing
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (isSyncing) return;

      try {
        const token = oauthToken || getStoredGoogleAdsToken();
        const res = await fetch('/api/google-ads/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: clientCustomerId,
            accessToken: token || undefined,
            userEmail: user?.email || undefined,
            loginCustomerId: loginCustomerId || (typeof window !== 'undefined' ? sessionStorage.getItem('google_ads_login_cid') : undefined),
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.campaigns && data.campaigns.length > 0) {
          const detectedCurrency = data.currency || accountCurrency || 'USD';
          setState((prev) => ({
            ...prev,
            campaigns: data.campaigns,
            keywords: data.keywords && data.keywords.length > 0 ? data.keywords : prev.keywords,
            searchTerms: data.searchTerms && data.searchTerms.length > 0 ? data.searchTerms : prev.searchTerms,
            account: {
              ...prev.account,
              currency: detectedCurrency,
              lastSyncAt: new Date().toISOString(),
              syncStatus: 'SYNCED',
              totalCampaignsCount: data.campaigns.length,
            },
          }));

          if (user) {
            data.campaigns.forEach((c: Campaign) => saveCampaignToFirestore(user.uid, c));
            saveUserAccount(user.uid, {
              ...state.account,
              currency: detectedCurrency,
              lastSyncAt: new Date().toISOString(),
              syncStatus: 'SYNCED',
              totalCampaignsCount: data.campaigns.length,
            });
          }
        }
      } catch (err) {
        // Silent background sync - keep running smoothly without disruptive alerts
      }
    };

    // Auto-sync every 60 seconds when active
    const intervalId = setInterval(performBackgroundSync, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performBackgroundSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, clientCustomerId, loginCustomerId, accountCurrency, oauthToken, user, isSyncing, state.account]);

  const handleSignInWithGoogle = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const userCredential = await signInWithGoogle();
      if (userCredential?.user) {
        showToast(`Signed in as ${userCredential.user.displayName || userCredential.user.email}`);
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        showToast('Sign-in cancelled or closed.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      clearStoredGoogleAdsToken();
      setOauthToken(null);
      setState(getCleanInitialState());
      showToast('Signed out successfully.');
    } catch (err: any) {
      showToast('Failed to sign out.');
    }
  };

  const handleConnectAccount = (
    connectedAccount: GoogleAdsAccount,
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

    setState((prev) => ({
      ...prev,
      account: { ...connectedAccount, isConnected: true },
      campaigns: syncedCampaigns && syncedCampaigns.length > 0 ? syncedCampaigns : prev.campaigns,
      keywords: syncedKeywords && syncedKeywords.length > 0 ? syncedKeywords : prev.keywords,
      searchTerms: syncedSearchTerms && syncedSearchTerms.length > 0 ? syncedSearchTerms : prev.searchTerms,
      isDemoMode: false,
    }));

    setApiIssue(null);
    showToast(`Connected: ${connectedAccount.clientCustomerId}`);

    if (user) {
      saveUserAccount(user.uid, { ...connectedAccount, isConnected: true });
      if (syncedCampaigns && syncedCampaigns.length > 0) {
        syncedCampaigns.forEach((c) => saveCampaignToFirestore(user.uid, c));
      }
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setApiIssue(null);
    try {
      let token = oauthToken || getStoredGoogleAdsToken();
      if (!token) {
        token = await acquireGoogleAdsToken({
          emailHint: user?.email || undefined,
        });
        if (token) {
          setOauthToken(token);
        }
      }

      const res = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: state.account.clientCustomerId,
          accessToken: token || undefined,
          userEmail: user?.email || undefined,
          loginCustomerId: state.account.loginCustomerId || (typeof window !== 'undefined' ? sessionStorage.getItem('google_ads_login_cid') : undefined),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || data.message || 'Sync failed. Check permissions.';
        setApiIssue({
          message: errorMsg,
          cid: state.account.clientCustomerId,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'error',
          statusCode: data.statusCode || res.status,
          details: data.details,
          accessibleCustomers: data.accessibleCustomers,
          isAuthExpired: data.isAuthExpired || res.status === 401,
        });
        showToast(errorMsg);
        return;
      }

      if (data.campaigns && data.campaigns.length > 0) {
        const detectedCurrency = data.currency || state.account.currency || 'USD';
        setState((prev) => ({
          ...prev,
          campaigns: data.campaigns,
          keywords: data.keywords && data.keywords.length > 0 ? data.keywords : prev.keywords,
          searchTerms: data.searchTerms && data.searchTerms.length > 0 ? data.searchTerms : prev.searchTerms,
          account: {
            ...prev.account,
            currency: detectedCurrency,
            lastSyncAt: new Date().toISOString(),
            syncStatus: 'SYNCED',
            totalCampaignsCount: data.campaigns.length,
          },
        }));

        if (user) {
          data.campaigns.forEach((c: Campaign) => saveCampaignToFirestore(user.uid, c));
          saveUserAccount(user.uid, {
            ...state.account,
            currency: detectedCurrency,
            lastSyncAt: new Date().toISOString(),
            syncStatus: 'SYNCED',
            totalCampaignsCount: data.campaigns.length,
          });
        }
        showToast(`Synced ${data.campaigns.length} campaigns from Google Ads (${detectedCurrency})`);
      } else {
        showToast('Google Ads account synced.');
      }
    } catch (err: any) {
      showToast('Could not complete live sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplyRecommendation = async (recId: string) => {
    const rec = state.budgetRecommendations.find((r) => r.id === recId);
    if (!rec) return;

    const sourceCamp = state.campaigns.find((c) => c.id === rec.campaignFromId);
    const targetCamp = state.campaigns.find((c) => c.id === rec.campaignToId);
    const amount = rec.reallocatedAmount || 25;

    const updatedCampaigns = state.campaigns.map((c) => {
      if (c.id === rec.campaignFromId) {
        return { ...c, budgetDaily: Math.max(10, c.budgetDaily - amount) };
      }
      if (c.id === rec.campaignToId) {
        return { ...c, budgetDaily: c.budgetDaily + amount };
      }
      return c;
    });

    const newAuditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId: rec.campaignToId,
      campaignName: targetCamp?.name || 'Target Campaign',
      actionType: 'BUDGET_REALLOCATED',
      previousValue: `$${targetCamp?.budgetDaily || 0}/day (Source: $${sourceCamp?.budgetDaily || 0}/day)`,
      newValue: `$${(targetCamp?.budgetDaily || 0) + amount}/day (+$${amount})`,
      reason: rec.reason,
      source: 'USER',
      userOrSystem: user?.displayName || 'Authorized Marketer',
      status: 'EXECUTED',
      canRevert: true,
    };

    if (user) {
      await updateBudgetRecommendationStatus(user.uid, recId, 'APPROVED');
      await addAuditLogToFirestore(user.uid, newAuditLog);
      const updatedTarget = updatedCampaigns.find((c) => c.id === rec.campaignToId);
      const updatedSource = updatedCampaigns.find((c) => c.id === rec.campaignFromId);
      if (updatedTarget) await saveCampaignToFirestore(user.uid, updatedTarget);
      if (updatedSource) await saveCampaignToFirestore(user.uid, updatedSource);
    }

    setState((prev) => ({
      ...prev,
      campaigns: updatedCampaigns,
      budgetRecommendations: prev.budgetRecommendations.map((r) =>
        r.id === recId ? { ...r, status: 'APPROVED' } : r
      ),
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));

    showToast(`Budget reallocated: +$${amount}/day to ${targetCamp?.name}`);
  };

  const handleToggleRule = async (ruleId: string) => {
    const rule = state.automationRules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newEnabled = !rule.enabled;
    const updatedRule: AutomationRule = { ...rule, enabled: newEnabled };

    if (user) {
      await saveAutomationRuleToFirestore(user.uid, updatedRule);
    }

    setState((prev) => ({
      ...prev,
      automationRules: prev.automationRules.map((r) => (r.id === ruleId ? updatedRule : r)),
    }));
    showToast(`Rule ${newEnabled ? 'activated' : 'paused'}: ${rule.name}`);
  };

  const handleAddRule = async (rule: AutomationRule) => {
    if (user) {
      await saveAutomationRuleToFirestore(user.uid, rule);
    }
    setState((prev) => ({
      ...prev,
      automationRules: [rule, ...prev.automationRules],
    }));
    showToast(`Activated safeguard: ${rule.name}`);
  };

  const handleDeleteRule = async (ruleId: string) => {
    setState((prev) => ({
      ...prev,
      automationRules: prev.automationRules.filter((r) => r.id !== ruleId),
    }));
    showToast('Rule removed');
  };

  const handleRevertLog = async (logId: string) => {
    const log = state.auditLogs.find((l) => l.id === logId);
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

    const updatedLogs = state.auditLogs.map((l) =>
      l.id === logId ? { ...l, status: 'REVERTED' as const } : l
    );

    let revertedCampaigns = state.campaigns;
    if (log.campaignId) {
      const targetCamp = state.campaigns.find((c) => c.id === log.campaignId);
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
        revertedCampaigns = state.campaigns.map((c) => (c.id === log.campaignId ? updatedCamp : c));
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

  const handleResetData = async () => {
    if (user) {
      await clearAllUserData(user.uid);
    }
    clearSavedState();
    clearStoredGoogleAdsToken();
    setOauthToken(null);
    setState(getCleanInitialState());
    showToast('All account data cleared.');
  };

  const handleSaveCampaign = async (updatedCamp: Campaign) => {
    if (user) {
      await saveCampaignToFirestore(user.uid, updatedCamp);
    }
    setState((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) => (c.id === updatedCamp.id ? updatedCamp : c)),
    }));
    showToast(`Saved campaign: ${updatedCamp.name}`);
  };

  return (
    <AdOptimizeContext.Provider
      value={{
        state,
        setState,
        user,
        authLoading,
        isInitialLoading,
        isSigningIn,
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
        oauthToken,
        handleSignInWithGoogle,
        handleSignOut,
        handleSync,
        handleConnectAccount,
        handleApplyRecommendation,
        handleToggleRule,
        handleAddRule,
        handleDeleteRule,
        handleRevertLog,
        handleResetData,
        handleSaveCampaign,
      }}
    >
      {children}
    </AdOptimizeContext.Provider>
  );
}

export function useAdOptimize() {
  const context = useContext(AdOptimizeContext);
  if (!context) {
    throw new Error('useAdOptimize must be used within an AdOptimizeProvider');
  }
  return context;
}
