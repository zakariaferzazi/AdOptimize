'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  requestGoogleAdsAccessToken,
  getStoredGoogleAdsToken,
  clearStoredGoogleAdsToken,
} from '@/lib/google-identity';
import { GoogleAdsAccount, Campaign } from '@/types/adoptimize';
import { GoogleIcon } from '@/components/ui/google-icon';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: GoogleAdsAccount;
  onConnectAccount: (
    account: GoogleAdsAccount,
    syncedCampaigns?: Campaign[],
    token?: string | null,
    syncedKeywords?: any[],
    syncedSearchTerms?: any[]
  ) => void;
  onApiError?: (issue: {
    message: string;
    cid: string;
    timestamp: string;
    severity: 'error' | 'warning';
    statusCode?: number;
    details?: string;
    isAuthExpired?: boolean;
    accessibleCustomers?: string[];
  }) => void;
  userEmail?: string | null;
}

export function ConnectModal({
  isOpen,
  onClose,
  currentAccount,
  onConnectAccount,
  onApiError,
  userEmail,
}: ConnectModalProps) {
  const [customerId, setCustomerId] = useState(
    currentAccount.clientCustomerId &&
    currentAccount.clientCustomerId !== 'Not Connected'
      ? currentAccount.clientCustomerId
      : ''
  );
  const [accountName, setAccountName] = useState(
    currentAccount.accountName || ''
  );
  const [currency, setCurrency] = useState(currentAccount.currency || 'USD');
  const [loginCustomerId, setLoginCustomerId] = useState(() => {
    if (currentAccount.loginCustomerId) return currentAccount.loginCustomerId;
    if (typeof window !== 'undefined') return sessionStorage.getItem('google_ads_login_cid') || '';
    return '';
  });
  const [developerToken, setDeveloperToken] = useState(() => {
    if (currentAccount.developerToken) return currentAccount.developerToken;
    if (typeof window !== 'undefined') return sessionStorage.getItem('google_ads_dev_token') || '';
    return '';
  });
  const [showAdvanced, setShowAdvanced] = useState(() => {
    return Boolean(
      currentAccount.loginCustomerId ||
      currentAccount.developerToken ||
      (typeof window !== 'undefined' && (sessionStorage.getItem('google_ads_login_cid') || sessionStorage.getItem('google_ads_dev_token')))
    );
  });
  const [accessibleAccounts, setAccessibleAccounts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthExpired, setIsAuthExpired] = useState(false);
  const [oauthToken, setOauthToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('google_ads_oauth_token');
    }
    return null;
  });
  const [authenticatedEmail, setAuthenticatedEmail] = useState<string | null>(() => {
    if (userEmail) return userEmail;
    if (typeof window !== 'undefined' && auth.currentUser?.email) {
      return auth.currentUser.email;
    }
    return null;
  });

  if (!isOpen) return null;

  // Format CID nicely as xxx-xxx-xxxx while typing
  const handleCidChange = (val: string) => {
    setErrorMessage(null);
    setIsAuthExpired(false);
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    let formatted = digitsOnly;
    if (digitsOnly.length > 6) {
      formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else if (digitsOnly.length > 3) {
      formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    }
    setCustomerId(formatted);
  };

  // Google OAuth authorization handler using Google Identity Services (GIS) Token Model
  // This client-side flow uses response_type=token (no offline refresh token request)
  const acquireGoogleOAuthToken = async (): Promise<string | null> => {
    try {
      const token = await requestGoogleAdsAccessToken(authenticatedEmail || undefined);
      if (token) {
        setOauthToken(token);
        setIsAuthExpired(false);
        return token;
      }
    } catch (gisErr: any) {
      console.warn('GIS Token Client notice:', gisErr?.message || gisErr);
      if (gisErr?.message?.includes('closed') || gisErr?.message?.includes('popup') || gisErr?.message?.includes('cancelled')) {
        throw gisErr;
      }
    }

    // Graceful fallback to Firebase provider if GIS was blocked
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/adwords');
    const result = await signInWithPopup(auth, provider);
    setAuthenticatedEmail(result.user.email);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;
    if (token) {
      setOauthToken(token);
      setIsAuthExpired(false);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('google_ads_oauth_token', token);
        sessionStorage.setItem('google_ads_oauth_token_timestamp', String(Date.now()));
      }
    }
    return token;
  };

  const handleSwitchGoogleAccount = async () => {
    try {
      clearStoredGoogleAdsToken();
      setOauthToken(null);
      setIsAuthExpired(false);
      setErrorMessage(null);
      await acquireGoogleOAuthToken();
    } catch (err: any) {
      console.warn('Switch account cancelled:', err);
    }
  };

  const executeConnect = async (tokenToUse: string, formattedCid: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect_customer',
          customerId: formattedCid,
          accessToken: tokenToUse,
          userEmail: authenticatedEmail,
          accountName: accountName.trim() || `Google Ads (${formattedCid})`,
          currency,
          loginCustomerId: loginCustomerId.trim() || undefined,
          developerToken: developerToken.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || data.message || `Google Ads account ${formattedCid} could not be verified.`;
        setIsLoading(false);

        // Detect 401 or token expired error
        const isAuthIssue =
          res.status === 401 ||
          data.isAuthExpired ||
          /invalid authentication credentials|Expected OAuth 2 access token|UNAUTHENTICATED/i.test(errorMsg);

        if (isAuthIssue) {
          clearStoredGoogleAdsToken();
          setOauthToken(null);
          setIsAuthExpired(true);
          setErrorMessage(
            'Google Ads authorization session expired. Please re-authenticate your Google account to grant access.'
          );
        } else {
          setErrorMessage(errorMsg);
        }

        if (Array.isArray(data.accessibleCustomers) && data.accessibleCustomers.length > 0) {
          setAccessibleAccounts(data.accessibleCustomers);
        }

        if (onApiError) {
          onApiError({
            message: isAuthIssue
              ? 'Google Ads authorization session expired. Please re-authenticate your Google account.'
              : errorMsg,
            cid: formattedCid,
            timestamp: new Date().toLocaleTimeString(),
            severity: 'error',
            statusCode: data.statusCode || res.status,
            details: data.details,
            isAuthExpired: isAuthIssue,
            accessibleCustomers: data.accessibleCustomers,
          });
        }
        return;
      }

      // Success: Save advanced parameters and connect
      if (typeof window !== 'undefined') {
        if (loginCustomerId.trim()) {
          sessionStorage.setItem('google_ads_login_cid', loginCustomerId.trim());
        }
        if (developerToken.trim()) {
          sessionStorage.setItem('google_ads_dev_token', developerToken.trim());
        }
      }
      setIsLoading(false);
      onConnectAccount(
        data.account,
        data.campaigns || [],
        tokenToUse,
        data.keywords || [],
        data.searchTerms || []
      );
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      const errMsg = err.code === 'auth/popup-closed-by-user'
        ? 'Google sign-in popup was closed before completing authorization.'
        : err.message || 'Failed to connect Google Ads account.';
      setErrorMessage(errMsg);

      if (onApiError) {
        onApiError({
          message: errMsg,
          cid: formattedCid,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'error',
        });
      }
    }
  };

  const handleConnectAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsAuthExpired(false);

    const cleanCid = customerId.replace(/\D/g, '');
    if (cleanCid.length !== 10) {
      setErrorMessage(
        `Invalid Customer ID: Google Ads CIDs must contain exactly 10 digits (e.g. 123-456-7890). Found ${cleanCid.length} digits.`
      );
      return;
    }

    const formattedCid = `${cleanCid.slice(0, 3)}-${cleanCid.slice(3, 6)}-${cleanCid.slice(6)}`;

    // Ensure fresh OAuth token
    let tokenToUse = oauthToken;

    if (!tokenToUse) {
      const tokenStatus = getStoredGoogleAdsToken();
      tokenToUse = tokenStatus.token;

      if (!tokenToUse || tokenStatus.isExpired) {
        setIsLoading(true);
        try {
          tokenToUse = await acquireGoogleOAuthToken();
        } catch (authErr: any) {
          setIsLoading(false);
          setErrorMessage(
            authErr.code === 'auth/popup-closed-by-user'
              ? 'Google authorization window was closed.'
              : authErr.message || 'Google authorization was cancelled.'
          );
          return;
        }
      }
    }

    if (!tokenToUse) {
      setIsLoading(false);
      setErrorMessage('Google OAuth authorization was not completed. Please authenticate with your Google Ads account.');
      return;
    }

    await executeConnect(tokenToUse, formattedCid);
  };

  const handleReauthAndRetry = async () => {
    setErrorMessage(null);
    setIsAuthExpired(false);
    setIsLoading(true);

    const cleanCid = customerId.replace(/\D/g, '');
    const formattedCid = cleanCid.length === 10
      ? `${cleanCid.slice(0, 3)}-${cleanCid.slice(3, 6)}-${cleanCid.slice(6)}`
      : customerId;

    try {
      clearStoredGoogleAdsToken();
      setOauthToken(null);
      const freshToken = await acquireGoogleOAuthToken();
      if (freshToken) {
        await executeConnect(freshToken, formattedCid);
      } else {
        setIsLoading(false);
        setErrorMessage('Authentication was not completed.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(
        err.code === 'auth/popup-closed-by-user'
          ? 'Google authorization window was closed.'
          : err.message || 'Re-authentication failed.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs">
              <GoogleIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Connect Google Ads Account</h3>
              <p className="text-xs text-slate-500">Official Google Ads API Integration (OAuth 2.0)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification in modal */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2 font-bold text-rose-950">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>Google Ads Verification Error</span>
            </div>
            <p className="text-[11px] leading-relaxed pl-6 text-rose-800">
              {errorMessage}
            </p>
            {(isAuthExpired || errorMessage.toLowerCase().includes('authentication') || errorMessage.toLowerCase().includes('oauth')) && (
              <div className="mt-2 pt-2 border-t border-rose-200/80 text-[11px] text-rose-950 space-y-2 pl-6">
                <p className="font-semibold text-rose-900 leading-snug">
                  Your Google Ads authorization session requires renewal:
                </p>
                <button
                  type="button"
                  onClick={handleReauthAndRetry}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 bg-rose-900 hover:bg-rose-950 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#00d67d] ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Re-authenticate &amp; Retry</span>
                </button>
              </div>
            )}
            {errorMessage.toLowerCase().includes('permission') && (
              <div className="mt-2 pt-2 border-t border-rose-200/80 text-[11px] text-rose-950 space-y-2 pl-6">
                <p className="font-bold text-rose-950">How to resolve Google Ads permission issues:</p>
                <ul className="list-disc pl-4 space-y-1 text-[10px] text-rose-900 leading-relaxed">
                  <li>
                    <strong>Invite your email in Google Ads:</strong> In <code>ads.google.com</code>, go to{' '}
                    <a
                      href="https://ads.google.com/aw/access/users"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold text-rose-950 hover:text-black inline-flex items-center gap-0.5"
                    >
                      <span>Tools &amp; Settings → Access and Security</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>{' '}
                    and invite <code>{authenticatedEmail || 'your Google account'}</code> with Standard or Admin role.
                  </li>
                  <li>
                    <strong>Or switch account:</strong> If another Google account manages this CID, click{' '}
                    <button
                      type="button"
                      onClick={handleSwitchGoogleAccount}
                      className="underline font-bold text-rose-950 hover:text-black cursor-pointer"
                    >
                      Switch Google Account
                    </button>
                    .
                  </li>
                  <li>
                    <strong>Manager Account (MCC):</strong> If this CID is managed under an agency MCC, open <strong>Advanced Settings</strong> below and enter your Manager Account CID.
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Accessible Customer IDs detected */}
        {accessibleAccounts.length > 0 && (
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Accessible Google Ads accounts for {authenticatedEmail}:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {accessibleAccounts.map((accCid) => (
                <button
                  key={accCid}
                  type="button"
                  onClick={() => setCustomerId(accCid)}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-xl font-mono text-xs font-bold text-emerald-900 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>{accCid}</span>
                  <span className="text-[10px] text-emerald-600 font-sans">↵ Select</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleConnectAndSync} className="space-y-4 text-xs">
          {/* Customer ID Input */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Google Ads Customer ID (CID) *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 123-456-7890"
                value={customerId}
                onChange={(e) => handleCidChange(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d67d] focus:bg-white"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Enter the 10-digit customer ID displayed in ads.google.com</span>
              <a
                href="https://ads.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Find CID</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Account Label (Optional) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Account Label / Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Core Search & Performance Max"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
            />
          </div>

          {/* Currency selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Account Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
            </select>
          </div>

          {/* Google Auth status pill */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <div className="leading-tight">
                <span className="font-bold text-slate-900 block">
                  {authenticatedEmail ? `Signed in as ${authenticatedEmail}` : 'Google Authentication Required'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {authenticatedEmail ? 'Google Ads API Authorization' : 'Will open official Google consent screen'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {authenticatedEmail && (
                <button
                  type="button"
                  onClick={handleSwitchGoogleAccount}
                  className="text-[11px] font-bold text-slate-600 hover:text-slate-950 underline cursor-pointer"
                >
                  Switch Account
                </button>
              )}
              {authenticatedEmail && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready ✓
                </span>
              )}
            </div>
          </div>

          {/* Advanced Section: MCC & Developer Token */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{showAdvanced ? '▾ Hide' : '▸ Show'} Advanced Settings (MCC Manager &amp; Developer Token)</span>
            </button>
            {showAdvanced && (
              <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Manager Account CID (Login Customer ID)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 555-666-7777 (if CID is managed under an MCC)"
                    value={loginCustomerId}
                    onChange={(e) => setLoginCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Required by Google Ads if your Google login only has access through a Manager Account (MCC).
                  </span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Custom Developer Token (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Optional Google Ads developer token"
                    value={developerToken}
                    onChange={(e) => setDeveloperToken(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed space-y-1">
            <div>
              <strong className="text-slate-900">Live API Verification:</strong> AdOptimize calls Google Ads REST API v25 to verify that CID <strong className="text-slate-900">{customerId || 'xxx-xxx-xxxx'}</strong> exists and query active campaigns.
            </div>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-1">
              <span>Enterprise AES-256 data security. Disconnect &amp; revoke anytime.</span>
              <Link
                href="/privacy-policy"
                target="_blank"
                className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5"
              >
                <span>Privacy &amp; Data Security</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !customerId.trim()}
              className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00d67d] ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Connecting to Google Ads...' : 'Authorize & Connect Google Ads'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
