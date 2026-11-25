'use client';

import { useRef, useState } from 'react';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import { acquireGoogleAdsToken } from '@/lib/google-identity';
import type { Campaign, GoogleAdsAccount, Keyword, SearchTerm } from '@/types/adoptimize';

export interface GoogleAdsConnectionOptions {
  currentAccount: GoogleAdsAccount;
  userEmail?: string | null;
  onConnectAccount: (account: GoogleAdsAccount, campaigns?: Campaign[], token?: string | null, keywords?: Keyword[], searchTerms?: SearchTerm[]) => void;
  onApiError?: (issue: {
    message: string; cid: string; timestamp: string; severity: 'error' | 'warning';
    statusCode?: number; details?: string; isAuthExpired?: boolean; accessibleCustomers?: string[];
  }) => void;
}

interface ConnectionResponse {
  success?: boolean;
  requiresSelection?: boolean;
  customers?: string[];
  accessibleCustomers?: string[];
  account?: GoogleAdsAccount;
  campaigns?: Campaign[];
  keywords?: Keyword[];
  searchTerms?: SearchTerm[];
  loginCustomerIdUsed?: string;
  error?: string;
  message?: string;
  details?: string;
  statusCode?: number;
}

export function useGoogleAdsConnection({ currentAccount, userEmail, onConnectAccount, onApiError }: GoogleAdsConnectionOptions) {
  const [loadingState, setLoadingState] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [discoveredAccounts, setDiscoveredAccounts] = useState<string[]>([]);
  const pending = useRef(false);
  const authorizedToken = useRef<string | null>(null);

  const connect = async (selectedCid?: string) => {
    if (pending.current) return;
    pending.current = true;
    setErrorMessage(null);
    if (!selectedCid) {
      setDiscoveredAccounts([]);
      authorizedToken.current = null;
    }
    setLoadingState('Connecting to Google...');
    try {
      const token = selectedCid && authorizedToken.current
        ? authorizedToken.current
        : await acquireGoogleAdsToken({ emailHint: userEmail || undefined, forceFresh: true });
      authorizedToken.current = token;
      setLoadingState('Discovering your Google Ads accounts...');
      const response = await authenticatedFetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_connect', accessToken: token, customerId: selectedCid, userEmail: userEmail || undefined }),
      });
      const data: ConnectionResponse = await response.json();
      if (!response.ok || !data.success) {
        const message = data.error || data.message || 'Could not connect to Google Ads account.';
        if (data.accessibleCustomers?.length) setDiscoveredAccounts(data.accessibleCustomers);
        onApiError?.({
          message, cid: selectedCid || currentAccount.clientCustomerId, timestamp: new Date().toLocaleTimeString(),
          severity: 'error', statusCode: data.statusCode || response.status, details: data.details,
          accessibleCustomers: data.accessibleCustomers,
        });
        throw new Error(message);
      }
      if (data.requiresSelection && data.customers && data.customers.length > 1) {
        setDiscoveredAccounts(data.customers);
        return;
      }
      if (!data.account?.isConnected || !data.account.clientCustomerId || data.account.clientCustomerId === 'Not Connected') {
        throw new Error('Google Ads returned an incomplete account connection. Please try again.');
      }
      try {
        localStorage.setItem('adoptimize_onboarding_completed', 'true');
        localStorage.setItem('adoptimize_connected_account', JSON.stringify(data.account));
        if (data.loginCustomerIdUsed) {
          sessionStorage.setItem('google_ads_login_cid', data.loginCustomerIdUsed);
          localStorage.setItem('google_ads_login_cid', data.loginCustomerIdUsed);
        }
      } catch {
        console.warn('[Google Ads] Local connection cache could not be saved.');
      }
      setDiscoveredAccounts([]);
      authorizedToken.current = null;
      onConnectAccount(data.account, data.campaigns || [], token, data.keywords || [], data.searchTerms || []);
    } catch (failure) {
      setErrorMessage(failure instanceof Error ? failure.message : 'Failed to connect to Google Ads.');
    } finally {
      pending.current = false;
      setLoadingState(null);
    }
  };

  return { connect, loadingState, errorMessage, discoveredAccounts };
}
