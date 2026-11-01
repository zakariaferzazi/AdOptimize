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
  trySilentGoogleAdsTokenRefresh,
  isGoogleAdsTokenExpired,
  getStoredGoogleAdsToken,
  clearStoredGoogleAdsToken,
  storeGoogleAdsToken,
  storeGoogleAdsRefreshToken,
  getStoredGoogleAdsRefreshToken,
} from '@/lib/google-identity';
import {
  syncUserProfile,
  fetchUserCampaigns,
  subscribeToUserCampaigns,
  fetchUserKeywords,
  subscribeToUserKeywords,
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
  subscribeToUserAccount,
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
  syncCooldownRemaining: number;
  lastSyncTimestamp: number | null;
  isTokenExpired: boolean;
  oauthToken: string | null;
  refreshToken: string | null;
  quotaResetAt: number | null;
  handleSignInWithGoogle: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  handleSync: (force?: boolean) => Promise<void>;
  handleRefreshToken: (isSilent?: boolean) => Promise<string | null>;
  handleSaveRefreshToken: (refreshToken: string, clientSecret?: string) => Promise<boolean>;
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
  const [refreshToken, setRefreshToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return getStoredGoogleAdsRefreshToken();
    }
    return null;
  });
  const [isTokenExpired, setIsTokenExpired] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return isGoogleAdsTokenExpired();
    }
    return false;
  });
  const [quotaResetAt, setQuotaResetAt] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('google_ads_quota_reset_at');
      if (stored) {
        const val = Number(stored);
        if (!isNaN(val) && val > Date.now()) return val;
      }
    }
    return null;
  });
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('adoptimize_last_sync_timestamp');
      if (stored) {
        const val = Number(stored);
        if (!isNaN(val) && val > 0) return val;
      }
    }
    return null;
  });
  const [syncCooldownRemaining, setSyncCooldownRemaining] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('adoptimize_last_sync_timestamp');
      if (stored) {
        const val = Number(stored);
        const elapsed = Date.now() - val;
        if (elapsed < 10 * 60 * 1000) {
          return Math.max(0, Math.ceil((10 * 60 * 1000 - elapsed) / 1000));
        }
      }
    }
    return 0;
  });

  // Cooldown countdown timer (1-second tick)
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastSyncTimestamp) {
        const elapsed = Date.now() - lastSyncTimestamp;
        const remaining = Math.max(0, Math.ceil((10 * 60 * 1000 - elapsed) / 1000));
        setSyncCooldownRemaining(remaining);
      } else {
        setSyncCooldownRemaining(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSyncTimestamp]);

  const [apiIssue, setApiIssue] = useState<ApiIssue | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // Proactive Google Ads OAuth Token Auto-Rotation
  // Checks token health gently every 15 minutes without aggressive loops or window focus listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isRenewing = false;

    const autoRenewOrCheck = async () => {
      if (isRenewing) return;

      const activeRefreshTok =
        refreshToken ||
        state.account?.refreshToken ||
        getStoredGoogleAdsRefreshToken() ||
        undefined;

      // With a valid refresh token or active connected account, session is uninterrupted
      if (activeRefreshTok) {
        setIsTokenExpired(false);
      }

      // Check elapsed time since access token timestamp
      const tsStr =
        sessionStorage.getItem('google_ads_oauth_token_timestamp') ||
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('google_ads_oauth_token_timestamp')
          : null);
      const ts = tsStr ? Number(tsStr) : 0;
      const elapsedMs = ts > 0 ? Date.now() - ts : 0;
      // Proactively rotate token at 50 minutes without user prompts
      const nearingExpiry = elapsedMs > 50 * 60 * 1000;

      if (nearingExpiry && activeRefreshTok) {
        isRenewing = true;
        try {
          const res = await fetch('/api/google-ads/token/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refreshToken: activeRefreshTok,
              customerId: state.account.clientCustomerId,
              userEmail: user?.email || undefined,
              userId: user?.uid || undefined,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.accessToken) {
            storeGoogleAdsToken(data.accessToken);
            setOauthToken(data.accessToken);
            setIsTokenExpired(false);
            if (data.refreshToken) {
              storeGoogleAdsRefreshToken(data.refreshToken);
              setRefreshToken(data.refreshToken);
            }
            if (user) {
              saveUserAccount(user.uid, {
                ...state.account,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken || activeRefreshTok,
                isTokenExpired: false,
                lastSyncAt: new Date().toISOString(),
              });
            }
          }
        } catch {
          // If network error during auto-renew, maintain state
        } finally {
          isRenewing = false;
        }
      }
    };

    autoRenewOrCheck();
    // Gentle 15-minute interval (never 30-second polling)
    const timer = setInterval(autoRenewOrCheck, 15 * 60 * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [state.account, user, refreshToken]);

  const isBackgroundSyncingRef = useRef<boolean>(false);
  const lastSyncTimestampRef = useRef<number>(0);
  const unsubscribeCampaignsRef = useRef<(() => void) | null>(null);
  const unsubscribeKeywordsRef = useRef<(() => void) | null>(null);
  const unsubscribeAccountRef = useRef<(() => void) | null>(null);

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

          // Check if local storage has a valid connected account from this or prior sessions
          let localConnectedAccount: GoogleAdsAccount | null = null;
          if (typeof window !== 'undefined') {
            try {
              const savedAccStr = localStorage.getItem('adoptimize_connected_account');
              if (savedAccStr) {
                const parsed = JSON.parse(savedAccStr);
                if (parsed?.isConnected && parsed?.clientCustomerId && parsed.clientCustomerId !== 'Not Connected') {
                  localConnectedAccount = parsed;
                }
              }
            } catch {}
          }

          if (remoteAccount && remoteAccount.isConnected && remoteAccount.clientCustomerId && remoteAccount.clientCustomerId !== 'Not Connected') {
            // Firestore has the connected account: ensure local storage is synced
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('adoptimize_connected_account', JSON.stringify(remoteAccount));
                localStorage.setItem('adoptimize_onboarding_completed', 'true');
              } catch {}
            }
          } else if (localConnectedAccount) {
            // Local storage has connected account, restore into remoteAccount and Firestore
            remoteAccount = localConnectedAccount;
            await saveUserAccount(currentUser.uid, localConnectedAccount);
          } else if (!remoteAccount) {
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

          if (remoteAccount?.accessToken) {
            setOauthToken(remoteAccount.accessToken);
            storeGoogleAdsToken(remoteAccount.accessToken);
          }
          if (remoteAccount?.refreshToken) {
            storeGoogleAdsRefreshToken(remoteAccount.refreshToken);
            setRefreshToken(remoteAccount.refreshToken);
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

          // 1. Subscribe to real-time Firestore updates for user's campaigns
          if (unsubscribeCampaignsRef.current) {
            unsubscribeCampaignsRef.current();
          }
          unsubscribeCampaignsRef.current = subscribeToUserCampaigns(currentUser.uid, (liveCampaigns) => {
            setState((prev) => {
              // If account is disconnected, keep campaigns empty
              if (!prev.account.isConnected || prev.account.clientCustomerId === 'Not Connected') {
                return prev;
              }
              if (Array.isArray(liveCampaigns) && liveCampaigns.length > 0) {
                const nextState = {
                  ...prev,
                  campaigns: liveCampaigns,
                  isDemoMode: false,
                };
                saveState(nextState);
                return nextState;
              }
              return prev;
            });
          });

          // 2. Subscribe to real-time Firestore updates for user's keywords
          if (unsubscribeKeywordsRef.current) {
            unsubscribeKeywordsRef.current();
          }
          unsubscribeKeywordsRef.current = subscribeToUserKeywords(currentUser.uid, (liveKeywords) => {
            setState((prev) => {
              if (!prev.account.isConnected || prev.account.clientCustomerId === 'Not Connected') {
                return prev;
              }
              if (Array.isArray(liveKeywords) && liveKeywords.length > 0) {
                const nextState = {
                  ...prev,
                  keywords: liveKeywords,
                };
                saveState(nextState);
                return nextState;
              }
              return prev;
            });
          });

          // 3. Subscribe to real-time Firestore updates for connected account metadata
          if (unsubscribeAccountRef.current) {
            unsubscribeAccountRef.current();
          }
          unsubscribeAccountRef.current = subscribeToUserAccount(currentUser.uid, (remoteAccount) => {
            if (remoteAccount && remoteAccount.isConnected && remoteAccount.clientCustomerId && remoteAccount.clientCustomerId !== 'Not Connected') {
              setState((prev) => {
                const nextState = {
                  ...prev,
                  account: {
                    ...prev.account,
                    ...remoteAccount,
                  },
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
      if (unsubscribeKeywordsRef.current) {
        unsubscribeKeywordsRef.current();
        unsubscribeKeywordsRef.current = null;
      }
      if (unsubscribeAccountRef.current) {
        unsubscribeAccountRef.current();
        unsubscribeAccountRef.current = null;
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
    async (force = false, tokenOverride?: string) => {
      if (!isConnected || !clientCustomerId || clientCustomerId === 'Not Connected') {
        return;
      }
      // Only sync if browser tab is active/visible
      if (!force && typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      // Rate-limit check: prevent duplicate requests within 10s unless explicitly forced
      const now = Date.now();
      if (!force && now - lastSyncTimestampRef.current < 10000) {
        return;
      }
      if (isBackgroundSyncingRef.current) {
        return;
      }

      const storedToken = getStoredGoogleAdsToken();
      let token = tokenOverride || getAccessTokenString();
      if (!token && user?.email) {
        token = await trySilentGoogleAdsTokenRefresh(user.email);
        if (token) {
          setOauthToken(token);
          storeGoogleAdsToken(token);
        }
      }

      if (!token) {
        return;
      }

      isBackgroundSyncingRef.current = true;

      try {
        const activeRefreshTok =
          refreshToken ||
          state.account?.refreshToken ||
          getStoredGoogleAdsRefreshToken() ||
          undefined;

        const res = await fetch('/api/google-ads/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: clientCustomerId,
            accessToken: token,
            refreshToken: activeRefreshTok,
            expiresAt: storedToken.expiresAt,
            userEmail: user?.email || undefined,
            userId: user?.uid || undefined,
            loginCustomerId:
              loginCustomerId ||
              (typeof window !== 'undefined'
                ? sessionStorage.getItem('google_ads_login_cid') || localStorage.getItem('google_ads_login_cid')
                : undefined),
          }),
        });

        const data = await res.json();
        if (data.newAccessToken) {
          storeGoogleAdsToken(data.newAccessToken, 3600, data.newExpiresAt);
          setOauthToken(data.newAccessToken);
          setIsTokenExpired(false);
        }
        if (data.newRefreshToken) {
          storeGoogleAdsRefreshToken(data.newRefreshToken);
          setRefreshToken(data.newRefreshToken);
        }

        if (res.ok && data.success && Array.isArray(data.campaigns)) {
          lastSyncTimestampRef.current = Date.now();
          const detectedCurrency = data.currency || accountCurrency || 'USD';
          setIsTokenExpired(false);
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
              ...(data.newAccessToken ? { accessToken: data.newAccessToken } : {}),
              ...(data.newRefreshToken ? { refreshToken: data.newRefreshToken } : {}),
            });
          }
        }
      } catch {
        // Continuous non-disruptive background sync
      } finally {
        isBackgroundSyncingRef.current = false;
      }
    },
    [isConnected, clientCustomerId, loginCustomerId, accountCurrency, user, getAccessTokenString, state.account, refreshToken]
  );

  // Optmyzr Architecture: Automated Silent Background Structural Polling Worker
  // Runs every 15-20 minutes completely silently using stored refresh_token via /api/google-ads/sync-worker
  // Automatically detects any direct Google Ads changes (status toggles, budget changes, new campaigns)
  // Writes detected changes into Firestore, triggering immediate real-time UI hydration via onSnapshot!
  useEffect(() => {
    if (!isConnected || !clientCustomerId || clientCustomerId === 'Not Connected' || !user?.uid) {
      return;
    }

    let isSilentWorkerActive = false;

    const runSilentStructuralSync = async () => {
      if (isSilentWorkerActive) return;

      // Rate Limit & Quota Protection: If 429 cooldown active, gracefully pause
      const now = Date.now();
      if (quotaResetAt && now < quotaResetAt) {
        return;
      }

      isSilentWorkerActive = true;
      try {
        await fetch('/api/google-ads/sync-worker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            mode: 'structural',
            force: false,
          }),
        });
        // Silent execution: zero user-facing popups or spinners.
        // Detected diffs written by the worker directly hydrate the UI via Firestore snapshot listeners.
      } catch (err) {
        console.warn('[SilentBackgroundWorker] Structural sync attempt notice:', err);
      } finally {
        isSilentWorkerActive = false;
      }
    };

    // Initial lightweight check 12 seconds after mount
    const initialDelay = setTimeout(() => {
      runSilentStructuralSync();
    }, 12000);

    // Automated periodic silent background sync every 15 minutes
    const structuralInterval = setInterval(runSilentStructuralSync, 15 * 60 * 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(structuralInterval);
    };
  }, [isConnected, clientCustomerId, user?.uid, quotaResetAt]);

  // Deep Historical Metrics Refresh (every 6 to 12 hours to preserve Explorer developer quota)
  useEffect(() => {
    if (!isConnected || !clientCustomerId || clientCustomerId === 'Not Connected' || !user?.uid) {
      return;
    }

    const deepMetricsInterval = setInterval(() => {
      const now = Date.now();
      const lastSync = lastSyncTimestampRef.current || (lastSyncTimestamp ? Number(lastSyncTimestamp) : 0);
      const isQuotaActive = quotaResetAt && now < quotaResetAt;
      if (!isQuotaActive && now - lastSync > 6 * 60 * 60 * 1000) {
        fetch('/api/google-ads/sync-worker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            mode: 'full',
            force: false,
          }),
        }).catch(() => {});
      }
    }, 60 * 60 * 1000);

    return () => {
      clearInterval(deepMetricsInterval);
    };
  }, [isConnected, clientCustomerId, user?.uid, quotaResetAt, lastSyncTimestamp]);

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
      clearSavedState();
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
      setIsTokenExpired(false);
    }

    const mergedAccount: GoogleAdsAccount = {
      ...connectedAccount,
      accessToken: validToken || undefined,
      isConnected: true,
      isTokenExpired: false,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('adoptimize_connected_account', JSON.stringify(mergedAccount));
        localStorage.setItem('adoptimize_onboarding_completed', 'true');
      } catch {}
    }

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
    setIsTokenExpired(false);
    showToast(`Connected: ${connectedAccount.clientCustomerId}`);

    if (user) {
      saveUserAccount(user.uid, mergedAccount);
      if (syncedCampaigns && syncedCampaigns.length > 0) {
        syncedCampaigns.forEach((c) => saveCampaignToFirestore(user.uid, c));
      }
    }
  };

  /**
   * Refreshes the Google Ads session:
   * 1. Attempts server-side token rotation via refresh token
   * 2. Attempts silent promptless GIS token acquisition
   * 3. Fallback: Prompts user in clean 1-click modal
   */
  /**
   * Refreshes the Google Ads session:
   * 1. Automatically uses stored refresh token to generate new access token via Google OAuth endpoint
   * 2. Attempts silent promptless GIS token acquisition
   * 3. Fallback: Prompts user in clean 1-click modal (only if not silent)
   */
  const handleRefreshToken = async (isSilent = true): Promise<string | null> => {
    if (!isSilent) {
      setIsSyncing(true);
      showToast('Refreshing Google Ads authorization in background...');
    }
    try {
      const activeRefreshTok =
        refreshToken ||
        state.account?.refreshToken ||
        getStoredGoogleAdsRefreshToken() ||
        undefined;

      if (!activeRefreshTok) {
        console.warn('[Session] No refresh token available. Session active on cached credentials.');
        return null;
      }

      // 1. First attempt: automated server-side token rotation via /api/google-ads/token/refresh
      const refreshRes = await fetch('/api/google-ads/token/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: activeRefreshTok,
          customerId: state.account.clientCustomerId,
          userEmail: user?.email || undefined,
          userId: user?.uid || undefined,
        }),
      }).catch(() => null);

      if (refreshRes && refreshRes.ok) {
        const refreshData = await refreshRes.json();
        if (refreshData.success && refreshData.accessToken) {
          setOauthToken(refreshData.accessToken);
          storeGoogleAdsToken(refreshData.accessToken);
          setIsTokenExpired(false);
          if (refreshData.refreshToken) {
            storeGoogleAdsRefreshToken(refreshData.refreshToken);
            setRefreshToken(refreshData.refreshToken);
          }
          if (user) {
            saveUserAccount(user.uid, {
              ...state.account,
              accessToken: refreshData.accessToken,
              refreshToken: refreshData.refreshToken || activeRefreshTok,
              isTokenExpired: false,
              lastSyncAt: new Date().toISOString(),
            });
          }
          if (!isSilent) {
            showToast('Google Ads session refreshed automatically.');
          }
          return refreshData.accessToken;
        }
      }

      // 2. Second attempt: Silent GIS token renewal without user-facing popup
      const silentToken = await trySilentGoogleAdsTokenRefresh(user?.email || undefined);
      if (silentToken) {
        setOauthToken(silentToken);
        storeGoogleAdsToken(silentToken);
        setIsTokenExpired(false);
        if (user) {
          saveUserAccount(user.uid, {
            ...state.account,
            accessToken: silentToken,
            isTokenExpired: false,
            lastSyncAt: new Date().toISOString(),
          });
        }
        if (!isSilent) {
          showToast('Google Ads session renewed silently.');
        }
        return silentToken;
      }

      return null;
    } catch (err: any) {
      console.warn('[Session] Background refresh exception:', err);
      return null;
    } finally {
      if (!isSilent) {
        setIsSyncing(false);
      }
    }
  };

  const handleSaveRefreshToken = async (newRefreshToken: string, clientSecret?: string): Promise<boolean> => {
    if (!newRefreshToken || !newRefreshToken.trim()) return false;
    const clean = newRefreshToken.trim();
    storeGoogleAdsRefreshToken(clean);
    setRefreshToken(clean);

    const updatedAccount: GoogleAdsAccount = {
      ...state.account,
      refreshToken: clean,
    };

    setState((prev) => ({
      ...prev,
      account: updatedAccount,
    }));

    if (user) {
      await saveUserAccount(user.uid, updatedAccount);
    }

    showToast('Saved Google Ads refresh token. Testing auto-renewal...');
    const refreshed = await handleRefreshToken(false);
    return Boolean(refreshed);
  };

  const handleSync = async (force = false) => {
    if (!state.account.isConnected || !state.account.clientCustomerId || state.account.clientCustomerId === 'Not Connected') {
      showToast('Please connect your Google Ads account first.');
      return;
    }

    const now = Date.now();

    // 1. Check if Developer Token explorer quota is cooling down
    if (!force && quotaResetAt && now < quotaResetAt) {
      const remainingSec = Math.round((quotaResetAt - now) / 1000);
      const durationLabel =
        remainingSec >= 3600
          ? `~${(remainingSec / 3600).toFixed(1)}h`
          : `${Math.ceil(remainingSec / 60)}m`;
      showToast(`Google Ads Explorer quota resting (${durationLabel} remaining). Campaigns are active and serving from database.`);
      return;
    }

    // 2. Optmyzr 10-minute button cooldown to protect Google Ads developer quota
    if (!force && syncCooldownRemaining > 0) {
      const remainingMin = Math.ceil(syncCooldownRemaining / 60);
      showToast(`Data was synced recently (${remainingMin}m cooldown remaining to protect developer quota). Showing verified database data.`);
      return;
    }

    setIsSyncing(true);
    try {
      setApiIssue(null);
      let token = getAccessTokenString();
      const storedToken = getStoredGoogleAdsToken();
      const activeRefreshTok =
        refreshToken ||
        state.account?.refreshToken ||
        getStoredGoogleAdsRefreshToken() ||
        undefined;

      // If token is missing, attempt seamless refresh with stored refresh token
      if (!token && activeRefreshTok) {
        const renewedToken = await handleRefreshToken(true);
        if (renewedToken) {
          token = renewedToken;
        }
      }

      let res = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: state.account.clientCustomerId,
          accessToken: token,
          refreshToken: activeRefreshTok,
          expiresAt: storedToken.expiresAt,
          userEmail: user?.email || undefined,
          userId: user?.uid || undefined,
          forceRefresh: force,
          cachedCampaigns: state.campaigns,
          cachedKeywords: state.keywords,
          cachedSearchTerms: state.searchTerms,
          loginCustomerId:
            state.account.loginCustomerId ||
            (typeof window !== 'undefined'
              ? sessionStorage.getItem('google_ads_login_cid') || localStorage.getItem('google_ads_login_cid')
              : undefined),
        }),
      });

      let data = await res.json();

      // If token expired / 401: auto-refresh using stored refresh token and retry silently once
      if (!res.ok && (res.status === 401 || data.isAuthExpired)) {
        const renewedToken = await handleRefreshToken(true);
        if (renewedToken) {
          token = renewedToken;
          res = await fetch('/api/google-ads/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId: state.account.clientCustomerId,
              accessToken: renewedToken,
              refreshToken: activeRefreshTok,
              userEmail: user?.email || undefined,
              userId: user?.uid || undefined,
              cachedCampaigns: state.campaigns,
              cachedKeywords: state.keywords,
              cachedSearchTerms: state.searchTerms,
              loginCustomerId:
                state.account.loginCustomerId ||
                (typeof window !== 'undefined'
                  ? sessionStorage.getItem('google_ads_login_cid') || localStorage.getItem('google_ads_login_cid')
                  : undefined),
            }),
          });
          data = await res.json();
        }
      }

      if (data.newAccessToken) {
        storeGoogleAdsToken(data.newAccessToken, 3600, data.newExpiresAt);
        setOauthToken(data.newAccessToken);
        setIsTokenExpired(false);
      }
      if (data.newRefreshToken) {
        storeGoogleAdsRefreshToken(data.newRefreshToken);
        setRefreshToken(data.newRefreshToken);
      }

      // Handle Quota Cooldown / Rate limit (HTTP 429 or RESOURCE_EXHAUSTED) gracefully
      if (data.syncStatus === 'QUOTA_PAUSED' || data.isQuotaExhausted || res.status === 429) {
        const resetTime = data.quotaResetTime || Date.now() + (data.retryDelaySeconds || 48430) * 1000;
        setQuotaResetAt(resetTime);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('google_ads_quota_reset_at', String(resetTime));
          } catch {}
        }

        const nowSyncTime = Date.now();
        setLastSyncTimestamp(nowSyncTime);
        setSyncCooldownRemaining(10 * 60);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('adoptimize_last_sync_timestamp', String(nowSyncTime));
          } catch {}
        }

        setState((prev) => ({
          ...prev,
          account: {
            ...prev.account,
            syncStatus: 'QUOTA_PAUSED',
            lastSyncAt: new Date().toISOString(),
          },
        }));

        const remainingHours = ((resetTime - Date.now()) / 3600000).toFixed(1);
        showToast(`Google Ads daily rate limit paused (~${remainingHours}h). Campaigns and metrics remain active from database cache.`);
        return;
      }

      if (!res.ok || !data.success) {
        const errorMsg = data.error || data.message || 'Sync failed. Check permissions.';
        if (res.status !== 429 && !errorMsg.toLowerCase().includes('quota') && !errorMsg.toLowerCase().includes('rate limit')) {
          setApiIssue({
            message: errorMsg,
            cid: state.account.clientCustomerId,
            timestamp: new Date().toLocaleTimeString(),
            severity: 'error',
            statusCode: data.statusCode || res.status,
            details: data.details,
            accessibleCustomers: data.accessibleCustomers,
            isAuthExpired: false,
          });
        }
        showToast(errorMsg);
        return;
      }

      // Successful live sync
      const nowSyncTime = Date.now();
      setLastSyncTimestamp(nowSyncTime);
      setSyncCooldownRemaining(10 * 60); // 10 minutes cooldown (Optmyzr pattern)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('adoptimize_last_sync_timestamp', String(nowSyncTime));
        } catch {}
      }

      if (Array.isArray(data.campaigns)) {
        const detectedCurrency = data.currency || state.account.currency || 'USD';
        const enabledCount = data.campaigns.filter((c: any) => c.status === 'ENABLED').length;
        const pausedCount = data.campaigns.filter((c: any) => c.status === 'PAUSED').length;

        setIsTokenExpired(false);
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
            ...(data.newAccessToken ? { accessToken: data.newAccessToken } : {}),
            ...(data.newRefreshToken ? { refreshToken: data.newRefreshToken } : {}),
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
            ...(data.newAccessToken ? { accessToken: data.newAccessToken } : {}),
            ...(data.newRefreshToken ? { refreshToken: data.newRefreshToken } : {}),
          });
        }
        showToast(
          data.campaigns.length > 0
            ? `Synced ${data.campaigns.length} campaigns from Google Ads (${enabledCount} Enabled, ${pausedCount} Paused)`
            : 'Google Ads account synced (no campaigns found in this account).'
        );
      } else {
        showToast(data.message || 'Google Ads query completed.');
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
    // 1. Immediately clean up local storage and state for instant UI responsiveness
    const cleanAccount: GoogleAdsAccount = {
      id: user ? `acc-${user.uid.slice(0, 8)}` : 'acc-primary',
      clientCustomerId: 'Not Connected',
      accountName: 'Google Ads Account',
      currency: 'USD',
      timezone: 'America/New_York (UTC-5)',
      isConnected: false,
      lastSyncAt: new Date().toISOString(),
      syncStatus: 'IDLE',
      isDemo: false,
      totalCampaignsCount: 0,
      monthlySpendCap: 25000,
    };

    const cleanState: AdOptimizeState = {
      account: cleanAccount,
      campaigns: [],
      keywords: [],
      searchTerms: [],
      ads: [],
      anomalies: [],
      insights: [],
      budgetRecommendations: [],
      automationRules: [],
      auditLogs: [],
      deviceBreakdown: [],
      locationBreakdown: [],
      isDemoMode: false,
      selectedPeriod: 'LAST_7_DAYS',
    };

    // Unsubscribe Firestore live campaigns listener to avoid re-populating state
    if (unsubscribeCampaignsRef.current) {
      unsubscribeCampaignsRef.current();
      unsubscribeCampaignsRef.current = null;
    }

    // Reset React state immediately so UI updates instantly
    setState(cleanState);
    setOauthToken(null);
    setRefreshToken(null);
    setSelectedCampaign(null);
    setApiIssue(null);

    // Clear all storage keys & save clean state
    clearSavedState();
    clearStoredGoogleAdsToken();
    saveState(cleanState);

    showToast('Disconnecting & clearing cached account data...');

    try {
      // Purge server-side query and token caches
      fetch('/api/google-ads/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: state.account.clientCustomerId,
          userId: user?.uid,
          userEmail: user?.email,
        }),
      }).catch(() => null);

      // Purge Firestore data if user is logged in
      if (user) {
        await clearAllUserData(user.uid);
      }

      showToast('Disconnected from Google Ads & all cache cleared.');
    } catch (err) {
      console.warn('Notice clearing remote data:', err);
      showToast('Account disconnected & local cache cleared.');
    }
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
          signal: AbortSignal.timeout(8000),
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
        console.warn('Notice syncing campaign status with Google Ads API:', err);
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
        syncCooldownRemaining,
        lastSyncTimestamp,
        isTokenExpired,
        oauthToken,
        refreshToken,
        quotaResetAt,
        handleSignInWithGoogle,
        handleSignOut,
        handleSync,
        handleRefreshToken,
        handleSaveRefreshToken,
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
