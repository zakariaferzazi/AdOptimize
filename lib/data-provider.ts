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
  selectedPeriod: 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'PREVIOUS_PERIOD' | 'CUSTOM';
}

export function getCleanInitialState(accountName?: string, customerId?: string): AdOptimizeState {
  return {
    account: {
      id: customerId ? `acc-${customerId.replace(/\D/g, '')}` : 'acc-primary',
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
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasFakeData =
          parsed?.account?.accountName?.includes('CloudScale') ||
          parsed?.account?.clientCustomerId === '492-819-2041' ||
          parsed?.isDemoMode === true ||
          (Array.isArray(parsed?.campaigns) &&
            parsed.campaigns.some(
              (c: any) =>
                c.id === 'camp-01' ||
                c.id === 'camp-02' ||
                c.id === 'camp-03' ||
                c.id === 'camp-04' ||
                c.id === 'camp-05' ||
                c.id === 'camp-google-8921' ||
                c.name?.includes('High Intent Core') ||
                c.name?.includes('Competitor Conquesting')
            ));

        if (hasFakeData) {
          localStorage.removeItem(STORAGE_KEY);
          return getCleanInitialState();
        }
        return parsed;
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
    } catch {
      // ignore
    }
  }
}

export function resetDemoState(): AdOptimizeState {
  const clean = getCleanInitialState();
  saveState(clean);
  return clean;
}
