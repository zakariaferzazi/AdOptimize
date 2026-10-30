'use client';

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
  PerformanceMetric,
} from '@/types/adoptimize';

const STORAGE_KEY = 'adoptimize_state_v2';

export interface AdOptimizeState {
  account: GoogleAdsAccount;
  campaigns: Campaign[];
  keywords: Keyword[];
  searchTerms: SearchTerm[];
  ads: AdCreative[];
  anomalies: AnomalyAlert[];
  insights: AIInsight[];
  budgetRecommendations: BudgetRecommendation[];
  automationRules: AutomationRule[];
  auditLogs: AuditLog[];
  deviceBreakdown: BreakdownItem[];
  locationBreakdown: BreakdownItem[];
  isDemoMode: boolean;
  selectedPeriod: 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL_TIME' | 'PREVIOUS_PERIOD' | 'CUSTOM';
}

export function getCleanInitialState(accountName?: string, customerId?: string): AdOptimizeState {
  return {
    account: {
      id: customerId ? `acc-${String(customerId || '').replace(/\D/g, '')}` : 'acc-primary',
      clientCustomerId: customerId || 'Not Connected',
      accountName: accountName || 'Google Ads Account',
      currency: 'USD',
      timezone: 'America/New_York (UTC-5)',
      isConnected: Boolean(customerId && customerId !== 'Not Connected'),
      lastSyncAt: new Date().toISOString(),
      syncStatus: 'IDLE',
      isDemo: false,
      totalCampaignsCount: 0,
      monthlySpendCap: 25000,
    },
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
}

export function getInitialState(): AdOptimizeState {
  if (typeof window !== 'undefined') {
    try {
      // Clear legacy storage keys
      localStorage.removeItem('adoptimize_state_v1');

      // Check if a dedicated connected account was saved
      let dedicatedConnectedAccount: GoogleAdsAccount | null = null;
      const savedAccountStr = localStorage.getItem('adoptimize_connected_account');
      if (savedAccountStr) {
        try {
          const parsedAcc = JSON.parse(savedAccountStr);
          if (parsedAcc?.isConnected && parsedAcc?.clientCustomerId && parsedAcc.clientCustomerId !== 'Not Connected') {
            dedicatedConnectedAccount = parsedAcc;
          }
        } catch {}
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only remove ancient mock demo state if not a real user-connected account
        const isUserConnected =
          Boolean(dedicatedConnectedAccount) ||
          (parsed?.account?.isConnected &&
            parsed?.account?.clientCustomerId &&
            parsed?.account?.clientCustomerId !== 'Not Connected');

        const hasFakeData =
          !isUserConnected &&
          (parsed?.account?.accountName?.includes('CloudScale') ||
            parsed?.account?.clientCustomerId === '492-819-2041' ||
            parsed?.isDemoMode === true);

        if (hasFakeData) {
          localStorage.removeItem(STORAGE_KEY);
          return getCleanInitialState();
        }

        // If we have a dedicated connected account, ensure it's merged into the state
        if (dedicatedConnectedAccount) {
          return {
            ...parsed,
            account: {
              ...parsed.account,
              ...dedicatedConnectedAccount,
              isConnected: true,
            },
            isDemoMode: false,
          };
        }

        return parsed;
      }

      if (dedicatedConnectedAccount) {
        return {
          ...getCleanInitialState(dedicatedConnectedAccount.accountName, dedicatedConnectedAccount.clientCustomerId),
          account: dedicatedConnectedAccount,
          isDemoMode: false,
        };
      }
    } catch {
      // ignore
    }
  }

  return getCleanInitialState();
}

export function saveState(state: AdOptimizeState): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
}

export function clearSavedState(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('adoptimize_state_v1');
      localStorage.removeItem('adoptimize_connected_account');
      localStorage.removeItem('adoptimize_onboarding_completed');
    } catch {
      // ignore
    }
  }
}
