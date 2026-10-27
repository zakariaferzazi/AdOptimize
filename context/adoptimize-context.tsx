'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  storeGoogleAdsToken,
} from '@/lib/google-identity';
import {
  syncUserProfile,
  fetchUserCampaigns,
  subscribeToUserCampaigns,
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
  handleMutateCampaignStatus: (campaignId: string, newStatus: 'ENABLED' | 'PAUSED') => Promise<boolean>;
  handleMutateCampaignBudget: (campaignId: string, newBudget: number) => Promise<boolean>;
  handleCreateCampaign: (campaignData: {
    name: string;
    budgetDaily: number;
    channelType?: string;
    status?: 'ENABLED' | 'PAUSED';
  }) => Promise<boolean>;
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
      return (
        sessionStorage.getItem('google_ads_oauth_token') ||
        localStorage.getItem('google_ads_oauth_token') ||
        null
      );
    }
    return null;
  });
  const [apiIssue, setApiIssue] = useState<ApiIssue | null>(null);

  // Firebase Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const isBackgroundSyncingRef = useRef<boolean>(false);
  const lastSyncTimestampRef = useRef<number>(0);
  const unsubscribeCampaignsRef = useRef<(() => void) | null>(null);

  const accountAccessToken = state.account?.accessToken;
  const getAccessTokenString = useCallback((): string | null => {
    if (oauthToken && typeof oauthToken === 'string' && oauthToken.trim()) {
      return oauthToken.trim();
    }
    const stored = getStoredGoogleAdsToken();
    if (stored?.token && typeof stored.token === 'string' && stored.token.trim()) {
      return stored.token.trim();
    }
    if (accountAccessToken && typeof accountAccessToken === 'string' && accountAccessToken.trim()) {
      return accountAccessToken.trim();
    }
    return null;
  }, [oauthToken, accountAccessToken]);

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

    // Fallback safety timer only for total network failure / timeout
    const safetyTimer = setTimeout(() => {
      if (isSubscribed) {
        setIsInitialLoading(false);
      }
    }, 8000);

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
          if (remoteAccount?.accessToken) {
            setOauthToken(remoteAccount.accessToken);
            storeGoogleAdsToken(remoteAccount.accessToken);
          }
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

          setState((prev) => {
            const nextState = {
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
            };
            saveState(nextState);
            return nextState;
          });

          // Subscribe to real-time Firestore updates for user's campaigns
          if (unsubscribeCampaignsRef.current) {
            unsubscribeCampaignsRef.current();
          }
          unsubscribeCampaignsRef.current = subscribeToUserCampaigns(currentUser.uid, (liveCampaigns) => {
            if (liveCampaigns && liveCampaigns.length > 0) {
              setState((prev) => {
                const nextState = {
                  ...prev,
                  campaigns: liveCampaigns,
                  isDemoMode: false,
                };
                saveState(nextState);
                return nextState;
              });
            }
          });
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
      if (unsubscribeCampaignsRef.current) {
        unsubscribeCampaignsRef.current();
        unsubscribeCampaignsRef.current = null;
      }
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
  const performBackgroundSync = useCallback(
    async (force = false) => {
      if (!isConnected || !clientCustomerId || clientCustomerId === 'Not Connected') {
        return;
      }
      // Only sync if browser tab is active/visible
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      // Rate-limit check: prevent duplicate requests within 4s unless explicitly forced
      const now = Date.now();
      if (!force && now - lastSyncTimestampRef.current < 4000) {
        return;
      }
      if (isBackgroundSyncingRef.current) {
        return;
      }

      const token = getAccessTokenString();
      if (!token) {
        return;
      }

      isBackgroundSyncingRef.current = true;

      try {
        const res = await fetch('/api/google-ads/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: clientCustomerId,
            accessToken: token,
            userEmail: user?.email || undefined,
            loginCustomerId:
              loginCustomerId ||
              (typeof window !== 'undefined'
                ? sessionStorage.getItem('google_ads_login_cid')
                : undefined),
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.campaigns)) {
          lastSyncTimestampRef.current = Date.now();
          const detectedCurrency = data.currency || accountCurrency || 'USD';
          setState((prev) => {
            const nextState = {
              ...prev,
              campaigns: data.campaigns,
              keywords: data.keywords && data.keywords.length > 0 ? data.keywords : prev.keywords,
              searchTerms:
                data.searchTerms && data.searchTerms.length > 0 ? data.searchTerms : prev.searchTerms,
              account: {
                ...prev.account,
                currency: detectedCurrency,
                lastSyncAt: new Date().toISOString(),
                syncStatus: 'SYNCED' as const,
                totalCampaignsCount: data.campaigns.length,
              },
            };
            saveState(nextState);
            return nextState;
          });

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
        } else if (!res.ok && (res.status === 401 || data?.isAuthExpired)) {
          console.warn('Background sync note: Google Ads live session requires refresh when ready.');
        }
      } catch {
        // Continuous non-disruptive background sync
      } finally {
        isBackgroundSyncingRef.current = false;
      }
    },
    [isConnected, clientCustomerId, loginCustomerId, accountCurrency, user, getAccessTokenString, state.account]
  );

  // Real-time automatic background synchronization:
  // 1. Immediately on mount/connection
  // 2. Continuous 8-second background polling
  // 3. Immediately whenever the user switches back from another tab (window focus)
  // 4. Immediately whenever document visibility changes to visible
  useEffect(() => {
    if (!isConnected || !clientCustomerId || clientCustomerId === 'Not Connected') {
      return;
    }

    // Immediate sync on load
    const initialSyncTimer = setTimeout(() => {
      performBackgroundSync(true);
    }, 50);

    // Continuous 8s real-time poll
    const intervalId = setInterval(() => {
      performBackgroundSync(false);
    }, 8000);

    const handleWindowFocus = () => {
      performBackgroundSync(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performBackgroundSync(true);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isConnected, clientCustomerId, performBackgroundSync]);

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
    const validToken = token || connectedAccount.accessToken || null;
    if (validToken) {
      setOauthToken(validToken);
      storeGoogleAdsToken(validToken);
    }

    const mergedAccount: GoogleAdsAccount = {
      ...connectedAccount,
      accessToken: validToken || undefined,
      isConnected: true,
    };

    setState((prev) => {
      const nextState = {
        ...prev,
        account: mergedAccount,
        campaigns: syncedCampaigns && syncedCampaigns.length > 0 ? syncedCampaigns : prev.campaigns,
        keywords: syncedKeywords && syncedKeywords.length > 0 ? syncedKeywords : prev.keywords,
        searchTerms: syncedSearchTerms && syncedSearchTerms.length > 0 ? syncedSearchTerms : prev.searchTerms,
        isDemoMode: false,
      };
      saveState(nextState);
      return nextState;
    });

    setApiIssue(null);
    showToast(`Connected: ${connectedAccount.clientCustomerId}`);

    if (user) {
      saveUserAccount(user.uid, mergedAccount);
      if (syncedCampaigns && syncedCampaigns.length > 0) {
        syncedCampaigns.forEach((c) => saveCampaignToFirestore(user.uid, c));
      }
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      setApiIssue(null);
      let token = getAccessTokenString();
      if (!token) {
        showToast('Please connect your Google Ads account to sync.');
        setShowConnectModal(true);
        setIsSyncing(false);
        return;
      }

      let res = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: state.account.clientCustomerId,
          accessToken: token,
          userEmail: user?.email || undefined,
          loginCustomerId: state.account.loginCustomerId || (typeof window !== 'undefined' ? (sessionStorage.getItem('google_ads_login_cid') || localStorage.getItem('google_ads_login_cid')) : undefined),
        }),
      });

      let data = await res.json();

      // If token expired / 401 unauthorized: notify gracefully without opening unsolicited popups
      if (!res.ok && (res.status === 401 || data.isAuthExpired)) {
        setApiIssue({
          message: 'Google Ads session requires re-authorization. Click Connect to refresh.',
          cid: state.account.clientCustomerId,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'warning',
          statusCode: res.status,
          isAuthExpired: true,
        });
        showToast('Google Ads session expired. Please reconnect in Account Settings when ready.');
        setIsSyncing(false);
        return;
      }

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

      if (Array.isArray(data.campaigns)) {
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
        showToast(data.campaigns.length > 0
          ? `Synced ${data.campaigns.length} campaigns from Google Ads (${detectedCurrency})`
          : 'Google Ads account synced. No campaigns found.');
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

  const handleMutateCampaignStatus = async (
    campaignId: string,
    newStatus: 'ENABLED' | 'PAUSED'
  ): Promise<boolean> => {
    const target = state.campaigns.find((c) => c.id === campaignId);
    if (!target) return false;

    const oldStatus = target.status;
    if (oldStatus === newStatus) return true;

    // 1. Optimistic update
    const updatedCamp: Campaign = { ...target, status: newStatus };
    setState((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) => (c.id === campaignId ? updatedCamp : c)),
    }));

    const token = getAccessTokenString();
    const isConnected =
      state.account.isConnected &&
      state.account.clientCustomerId &&
      state.account.clientCustomerId !== 'Not Connected';

    // 2. Call Google Ads API if connected and token is present
    if (isConnected && token) {
      try {
        const res = await fetch('/api/google-ads/mutate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'set_campaign_status',
            customerId: state.account.clientCustomerId,
            campaignId: target.id,
            status: newStatus,
            accessToken: token,
            loginCustomerId:
              state.account.loginCustomerId ||
              (typeof window !== 'undefined'
                ? sessionStorage.getItem('google_ads_login_cid') ||
                  localStorage.getItem('google_ads_login_cid')
                : undefined),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          if (res.status === 401 || data.isAuthExpired) {
            console.warn('Google Ads live session expired; campaign status preserved in workspace.');
          } else {
            console.warn('Google Ads API update note:', data.error);
          }
        }
      } catch (err) {
        console.warn('Network error syncing campaign status with Google Ads API:', err);
      }
    }

    // 3. Log audit event and update state
    const newAuditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId: target.id,
      campaignName: target.name,
      actionType: 'CAMPAIGN_STATUS_CHANGE',
      previousValue: oldStatus,
      newValue: newStatus,
      reason: `Changed campaign status to ${newStatus} from Adoptimize`,
      source: 'USER',
      userOrSystem: user?.displayName || 'Authorized User',
      status: 'EXECUTED',
      canRevert: true,
    };

    setState((prev) => ({
      ...prev,
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));

    showToast(`Campaign "${target.name}" is now ${newStatus} in Google Ads!`);

    if (user) {
      Promise.allSettled([
        saveCampaignToFirestore(user.uid, updatedCamp),
        addAuditLogToFirestore(user.uid, newAuditLog),
      ]).catch((err) => console.warn('Background Firestore sync warning:', err));
    }

    return true;
  };

  const handleMutateCampaignBudget = async (
    campaignId: string,
    newBudget: number
  ): Promise<boolean> => {
    const target = state.campaigns.find((c) => c.id === campaignId);
    if (!target) return false;

    const oldBudget = target.budgetDaily;
    const updatedCamp: Campaign = { ...target, budgetDaily: newBudget };

    // 1. Optimistic update
    setState((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) => (c.id === campaignId ? updatedCamp : c)),
    }));

    let token = getAccessTokenString();
    const isConnected =
      state.account.isConnected &&
      state.account.clientCustomerId &&
      state.account.clientCustomerId !== 'Not Connected';

    if (isConnected && token) {
      try {
        const res = await fetch('/api/google-ads/mutate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_campaign_budget',
            customerId: state.account.clientCustomerId,
            campaignId: target.id,
            budgetDaily: newBudget,
            accessToken: token,
            loginCustomerId:
              state.account.loginCustomerId ||
              (typeof window !== 'undefined'
                ? sessionStorage.getItem('google_ads_login_cid') ||
                  localStorage.getItem('google_ads_login_cid')
                : undefined),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          if (res.status === 401 || data.isAuthExpired) {
            console.warn('Google Ads live session expired; budget updated in workspace.');
          } else {
            console.warn('Google Ads API budget update note:', data.error);
          }
        }
      } catch (err) {
        console.warn('Network error updating budget in Google Ads API:', err);
      }
    }

    const newAuditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId: target.id,
      campaignName: target.name,
      actionType: 'BUDGET_CHANGE',
      previousValue: `$${oldBudget.toFixed(2)}/day`,
      newValue: `$${newBudget.toFixed(2)}/day`,
      reason: `Updated daily budget to $${newBudget.toFixed(2)}/day`,
      source: 'USER',
      userOrSystem: user?.displayName || 'Authorized User',
      status: 'EXECUTED',
      canRevert: true,
    };

    setState((prev) => ({
      ...prev,
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));

    showToast(`Updated budget for "${target.name}" to $${newBudget.toFixed(2)}/day`);

    if (user) {
      Promise.allSettled([
        saveCampaignToFirestore(user.uid, updatedCamp),
        addAuditLogToFirestore(user.uid, newAuditLog),
      ]).catch((err) => console.warn('Background Firestore sync warning:', err));
    }

    return true;
  };

  const handleCreateCampaign = async (campaignData: {
    name: string;
    budgetDaily: number;
    channelType?: string;
    status?: 'ENABLED' | 'PAUSED';
  }): Promise<boolean> => {
    const token = getAccessTokenString();

    const isConnected =
      state.account.isConnected &&
      state.account.clientCustomerId &&
      state.account.clientCustomerId !== 'Not Connected';

    let createdId = `camp-live-${Date.now()}`;

    if (isConnected && token) {
      try {
        const res = await fetch('/api/google-ads/mutate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_campaign',
            customerId: state.account.clientCustomerId,
            campaignData,
            accessToken: token,
            loginCustomerId:
              state.account.loginCustomerId ||
              (typeof window !== 'undefined'
                ? sessionStorage.getItem('google_ads_login_cid') ||
                  localStorage.getItem('google_ads_login_cid')
                : undefined),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          console.warn('Google Ads API create campaign note:', data?.error);
        } else if (data.campaignId) {
          createdId = `camp-live-${data.campaignId}`;
        }
      } catch (err) {
        console.warn('Network error creating campaign in Google Ads:', err);
      }
    }

    const newCamp: Campaign = {
      id: createdId,
      accountId: state.account.clientCustomerId || 'default-account',
      name: campaignData.name,
      status: campaignData.status || 'ENABLED',
      type: (campaignData.channelType || 'SEARCH') as any,
      budgetDaily: campaignData.budgetDaily,
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
      cpa: 0,
      roas: 0,
      ctr: 0,
      cpc: 0,
      conversionRate: 0,
      healthScore: 95,
      healthStatus: 'HEALTHY',
      trendPoints: [0, 0, 0, 0, 0, 0, 0],
      keywordsCount: 5,
      activeAdsCount: 1,
      historicalPoints: [],
      previousPeriod: {
        spend: 0,
        conversions: 0,
        cpa: 0,
        roas: 0,
      },
    };

    const newAuditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      campaignId: newCamp.id,
      campaignName: newCamp.name,
      actionType: 'SETTINGS_UPDATE',
      previousValue: 'None (New Campaign)',
      newValue: `Created ${newCamp.type} campaign ($${newCamp.budgetDaily.toFixed(2)}/day, ${newCamp.status})`,
      reason: 'New campaign launched via Adoptimize',
      source: 'USER',
      userOrSystem: user?.displayName || 'Authorized User',
      status: 'EXECUTED',
      canRevert: false,
    };

    if (user) {
      await saveCampaignToFirestore(user.uid, newCamp);
      await addAuditLogToFirestore(user.uid, newAuditLog);
    }

    setState((prev) => ({
      ...prev,
      campaigns: [newCamp, ...prev.campaigns],
      account: {
        ...prev.account,
        totalCampaignsCount: prev.campaigns.length + 1,
      },
      auditLogs: [newAuditLog, ...prev.auditLogs],
    }));

    showToast(`Successfully created campaign "${newCamp.name}" in Google Ads!`);
    return true;
  };

  const handleSaveCampaign = async (updatedCamp: Campaign) => {
    const existing = state.campaigns.find((c) => c.id === updatedCamp.id);
    if (existing) {
      if (existing.status !== updatedCamp.status) {
        await handleMutateCampaignStatus(updatedCamp.id, updatedCamp.status as any);
      }
      if (existing.budgetDaily !== updatedCamp.budgetDaily) {
        await handleMutateCampaignBudget(updatedCamp.id, updatedCamp.budgetDaily);
      }
    } else {
      if (user) {
        await saveCampaignToFirestore(user.uid, updatedCamp);
      }
      setState((prev) => ({
        ...prev,
        campaigns: prev.campaigns.map((c) => (c.id === updatedCamp.id ? updatedCamp : c)),
      }));
      showToast(`Saved campaign: ${updatedCamp.name}`);
    }
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
        handleMutateCampaignStatus,
        handleMutateCampaignBudget,
        handleCreateCampaign,
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
