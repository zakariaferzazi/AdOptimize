'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { GoogleAdsAccount, Campaign } from '@/types/adoptimize';
import { GoogleIcon } from '@/components/ui/google-icon';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: GoogleAdsAccount;
  onConnectAccount: (account: GoogleAdsAccount, syncedCampaigns?: Campaign[], token?: string | null) => void;
  onApiError?: (issue: {
    message: string;
    cid: string;
    timestamp: string;
    severity: 'error' | 'warning';
    statusCode?: number;
    details?: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    const digitsOnly = val.replace(/\D/g, '').slice(0, 10);
    let formatted = digitsOnly;
    if (digitsOnly.length > 6) {
      formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else if (digitsOnly.length > 3) {
      formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    }
    setCustomerId(formatted);
  };

  // Google OAuth authorization handler
  const acquireGoogleOAuthToken = async (): Promise<string | null> => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/adwords');
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    setAuthenticatedEmail(result.user.email);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;
    if (token) {
      setOauthToken(token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('google_ads_oauth_token', token);
      }
    }
    return token;
  };

  const handleConnectAndSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCid = customerId.replace(/\D/g, '');
    if (cleanCid.length !== 10) {
      setErrorMessage(
        `Invalid Customer ID: Google Ads CIDs must contain exactly 10 digits (e.g. 123-456-7890). Found ${cleanCid.length} digits.`
      );
      return;
    }

    const formattedCid = `${cleanCid.slice(0, 3)}-${cleanCid.slice(3, 6)}-${cleanCid.slice(6)}`;
    setIsLoading(true);

    try {
      // 1. Ensure real OAuth token
      let tokenToUse = oauthToken;
      if (!tokenToUse) {
        tokenToUse = await acquireGoogleOAuthToken();
      }

      if (!tokenToUse) {
        setIsLoading(false);
        setErrorMessage('Google OAuth authorization was not completed. Please authenticate with your Google Ads account.');
        return;
      }

      // 2. Call real Google Ads verify endpoint
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
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || data.message || `Google Ads account ${formattedCid} could not be verified.`;
        setIsLoading(false);
        setErrorMessage(errorMsg);

        // Report error to parent page so it renders in the prominent page banner!
        if (onApiError) {
          onApiError({
            message: errorMsg,
            cid: formattedCid,
            timestamp: new Date().toLocaleTimeString(),
            severity: 'error',
            statusCode: data.statusCode || res.status,
            details: data.details,
          });
        }
        return;
      }

      // 3. Success: Connect and close
      setIsLoading(false);
      onConnectAccount(data.account, data.campaigns || [], tokenToUse);
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
          cid: customerId,
          timestamp: new Date().toLocaleTimeString(),
          severity: 'error',
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs">
              <GoogleIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Connect Google Ads Account</h3>
              <p className="text-xs text-slate-500">Live Google Ads API (OAuth 2.0 with AdWords Scope)</p>
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
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1 animate-in fade-in">
            <div className="flex items-start gap-2 font-bold text-rose-950">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>Google Ads Verification Error</span>
            </div>
            <p className="text-[11px] leading-relaxed pl-6 text-rose-800">
              {errorMessage}
            </p>
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
              <span>Must be exactly 10 digits from ads.google.com</span>
              <a
                href="https://ads.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Find my CID</span>
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
              placeholder="e.g. Production Search & PMax"
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
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <GoogleIcon className="w-4 h-4" />
              <div className="leading-tight">
                <span className="font-bold text-slate-900 block">
                  {authenticatedEmail ? 'Google Authorized' : 'Google Authentication Required'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {authenticatedEmail || 'Will prompt for Google sign-in with AdWords scope'}
                </span>
              </div>
            </div>
            {authenticatedEmail && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active ✓
              </span>
            )}
          </div>

          <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-900">Strict Real Verification:</strong> AdOptimize calls the live Google Ads API to verify that CID <strong className="text-slate-900">{customerId || 'xxx-xxx-xxxx'}</strong> exists and is accessible. If there is an issue with access or permissions, it will be displayed on the page.
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
              <span>{isLoading ? 'Verifying with Google Ads...' : 'Verify CID & Sync Real Campaigns'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
