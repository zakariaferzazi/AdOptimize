'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Building,
  Key,
  ArrowRight,
  Info,
  AlertCircle,
  Layers,
  HelpCircle,
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
  userEmail?: string | null;
}

export function ConnectModal({
  isOpen,
  onClose,
  currentAccount,
  onConnectAccount,
  userEmail,
}: ConnectModalProps) {
  const [connectionMode, setConnectionMode] = useState<'OAUTH_API' | 'DIRECT_WORKSPACE'>('DIRECT_WORKSPACE');
  const [step, setStep] = useState<'CHOICE' | 'OAUTH_VERIFY' | 'DIRECT_FORM' | 'SYNCING'>('CHOICE');
  const [customerId, setCustomerId] = useState(
    currentAccount.clientCustomerId &&
    currentAccount.clientCustomerId !== 'Not Connected' &&
    currentAccount.clientCustomerId !== '492-819-2041'
      ? currentAccount.clientCustomerId
      : ''
  );
  const [accountName, setAccountName] = useState(
    currentAccount.accountName && !currentAccount.accountName.includes('CloudScale')
      ? currentAccount.accountName
      : ''
  );
  const [currency, setCurrency] = useState(currentAccount.currency || 'USD');
  const [spendCap, setSpendCap] = useState(
    currentAccount.monthlySpendCap ? String(currentAccount.monthlySpendCap) : '25000'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [discoveredCustomers, setDiscoveredCustomers] = useState<string[]>([]);
  const [oauthToken, setOauthToken] = useState<string | null>(null);
  const [authenticatedEmail, setAuthenticatedEmail] = useState<string | null>(userEmail || null);
  const [showVerificationExplanation, setShowVerificationExplanation] = useState(false);

  if (!isOpen) return null;

  // Real Google OAuth 2.0 with AdWords scope
  const handleOAuthConnect = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/adwords');
      provider.addScope('email');
      provider.addScope('profile');
      provider.setCustomParameters({ prompt: 'select_account' });

      // Live Google Auth Popup
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      setAuthenticatedEmail(user.email);

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;

      if (token) {
        setOauthToken(token);
      }

      // Check linked accounts with the Google Ads API
      if (token) {
        try {
          const verifyRes = await fetch('/api/google-ads/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'verify_oauth_token',
              accessToken: token,
              userEmail: user.email,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyJson.customers && verifyJson.customers.length > 0) {
            setDiscoveredCustomers(verifyJson.customers);
            setCustomerId(verifyJson.customers[0]);
            setInfoMessage(`Verified access: Discovered ${verifyJson.customers.length} Google Ads account(s) for ${user.email}.`);
          } else if (verifyJson.message) {
            setInfoMessage(
              verifyJson.message.includes(user.email || '')
                ? verifyJson.message
                : `Authenticated as ${user.email}. ${verifyJson.message}`
            );
          } else {
            setInfoMessage(`Authenticated as ${user.email}. Enter your 10-digit Customer ID below to connect.`);
          }
        } catch {
          setInfoMessage(`Authenticated as ${user.email}. Enter your 10-digit Google Ads Customer ID (CID) below.`);
        }
      } else {
        setInfoMessage(`Authenticated as ${user.email}. Please select or enter your accessible Google Ads Customer ID.`);
      }

      setIsLoading(false);
      setConnectionMode('OAUTH_API');
      setStep('OAUTH_VERIFY');
    } catch (err: any) {
      setIsLoading(false);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Google authorization popup was closed before completion.');
      } else {
        setErrorMessage(err.message || 'Error authenticating with Google Ads.');
      }
    }
  };

  const handleConfirmOAuthCustomer = async () => {
    const raw = customerId.trim();
    if (!raw) {
      setErrorMessage('Please select or enter your 10-digit Google Ads Customer ID (CID)');
      return;
    }

    const cleanId = raw.replace(/\D/g, '');
    if (cleanId.length !== 10) {
      setErrorMessage(`Invalid Customer ID: Google Ads CIDs must contain exactly 10 digits (e.g. 123-456-7890). Found ${cleanId.length} digits.`);
      return;
    }

    const targetId = `${cleanId.slice(0, 3)}-${cleanId.slice(3, 6)}-${cleanId.slice(6)}`;

    setIsLoading(true);
    setErrorMessage(null);
    setStep('SYNCING');

    try {
      const res = await fetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect_customer',
          mode: 'oauth_api',
          customerId: targetId,
          accessToken: oauthToken,
          userEmail: authenticatedEmail,
          accountName: accountName.trim() || `Google Ads (${targetId})`,
          currency,
          monthlySpendCap: Number(spendCap) || 25000,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsLoading(false);
        setStep('OAUTH_VERIFY');
        setErrorMessage(data.error || 'Failed to verify Google Ads account access.');
        return;
      }

      // Sync campaigns for this verified CID
      let syncedCampaigns: Campaign[] = [];
      try {
        const syncRes = await fetch('/api/google-ads/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: data.account?.id || `acc-${cleanId}`,
            customerId: targetId,
            accountName: data.account?.accountName,
            accessToken: oauthToken,
          }),
        });
        const syncJson = await syncRes.json();
        if (syncJson.campaigns) {
          syncedCampaigns = syncJson.campaigns;
        }
      } catch (syncErr) {
        console.warn('Sync note:', syncErr);
      }

      if (oauthToken && typeof window !== 'undefined') {
        sessionStorage.setItem('google_ads_oauth_token', oauthToken);
      }
      setIsLoading(false);
      onConnectAccount(
        data.account,
        syncedCampaigns.length > 0 ? syncedCampaigns : (data.campaigns || []),
        oauthToken
      );
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setStep('OAUTH_VERIFY');
      setErrorMessage(err.message || 'Verification failed.');
    }
  };

  const handleConfirmDirectWorkspace = async () => {
    const raw = customerId.trim();
    if (!raw) {
      setErrorMessage('Please enter your 10-digit Google Ads Customer ID (CID)');
      return;
    }

    const cleanId = raw.replace(/\D/g, '');
    if (cleanId.length !== 10) {
      setErrorMessage(`Invalid Customer ID: Google Ads CIDs must contain exactly 10 digits (e.g. 123-456-7890). Found ${cleanId.length} digits.`);
      return;
    }

    const targetId = `${cleanId.slice(0, 3)}-${cleanId.slice(3, 6)}-${cleanId.slice(6)}`;

    setIsLoading(true);
    setErrorMessage(null);
    setStep('SYNCING');

    try {
      const res = await fetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect_customer',
          mode: 'direct_workspace',
          customerId: targetId,
          accountName: accountName.trim() || `Workspace (${targetId})`,
          currency,
          monthlySpendCap: Number(spendCap) || 25000,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setIsLoading(false);
        setStep('DIRECT_FORM');
        setErrorMessage(data.error || 'Failed to initialize workspace.');
        return;
      }

      setIsLoading(false);
      onConnectAccount(data.account, []);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setStep('DIRECT_FORM');
      setErrorMessage(err.message || 'Failed to initialize workspace.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs">
              <GoogleIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Google Ads Workspace Setup</h3>
              <p className="text-xs text-slate-500">Direct Customer ID or Google OAuth 2.0</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: CHOICE OF CONNECTION MODE */}
        {step === 'CHOICE' && (
          <div className="space-y-4 text-xs text-slate-700">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Why Google says unverified banner */}
            <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Seeing &ldquo;Google hasn&rsquo;t verified this app&rdquo;?</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerificationExplanation(!showVerificationExplanation)}
                  className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
                >
                  {showVerificationExplanation ? 'Hide info' : 'Why does this happen?'}
                </button>
              </div>

              <p className="text-[11px] text-amber-800 leading-relaxed">
                Because <code>https://www.googleapis.com/auth/adwords</code> grants full access to Google Ads spend, Google flags apps until multi-month enterprise security verification completes.
              </p>

              {showVerificationExplanation && (
                <div className="pt-2 border-t border-amber-200/80 text-[11px] text-amber-900 space-y-2 animate-in fade-in">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 space-y-1.5">
                    <p className="font-semibold text-slate-900">How to bypass the Google warning if using OAuth:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
                      <li>Click <strong>&ldquo;Advanced&rdquo;</strong> (bottom-left link on Google&rsquo;s screen).</li>
                      <li>Click <strong>&ldquo;Go to AdOptimize (unsafe)&rdquo;</strong> to grant AdWords scope.</li>
                    </ol>
                  </div>
                  <p className="text-amber-800 italic">
                    💡 Or use <strong>Direct Customer ID Workspace</strong> below: 100% instant, no OAuth popups or security warnings.
                  </p>
                </div>
              )}
            </div>

            <p className="leading-relaxed text-slate-600 font-medium">
              Choose your preferred connection method:
            </p>

            {/* Option 1: Direct Workspace (RECOMMENDED, Instant & No Warnings) */}
            <div
              onClick={() => {
                setConnectionMode('DIRECT_WORKSPACE');
                setStep('DIRECT_FORM');
              }}
              className="p-4 bg-emerald-50/60 hover:bg-emerald-50 border-2 border-emerald-500/80 rounded-2xl cursor-pointer transition-all space-y-2 group relative shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span>Direct Customer ID Workspace</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                  Recommended · Instant
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Connect your real 10-digit Google Ads Customer ID (CID) immediately with zero OAuth warnings or developer token delays. Pulls telemetry and runs continuous Gemini AI audits.
              </p>
            </div>

            {/* Option 2: Live OAuth (Direct API) */}
            <div
              onClick={handleOAuthConnect}
              className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl cursor-pointer transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                    <GoogleIcon className="w-3.5 h-3.5" />
                  </div>
                  <span>Google Ads Live API (OAuth 2.0)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  Requires Advanced Approval
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Connects through Google Account OAuth. Note: Google will show <em>&ldquo;Google hasn&rsquo;t verified this app&rdquo;</em> until clicked through via <strong>Advanced &rarr; Proceed</strong>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px] text-slate-700">
              <div className="font-bold flex items-center gap-1.5 text-slate-900">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero Fake Data Policy</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                AdOptimize requires valid 10-digit Google Ads Customer IDs from ads.google.com and rejects fake or placeholder numbers.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2A: OAUTH VERIFY & SELECT */}
        {step === 'OAUTH_VERIFY' && (
          <div className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
            {infoMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{infoMessage}</span>
              </div>
            )}

            {discoveredCustomers.length > 0 ? (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">
                  Select Accessible Google Ads Customer ID:
                </label>
                <div className="space-y-1.5">
                  {discoveredCustomers.map((cid, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCustomerId(cid)}
                      className={`w-full p-2.5 rounded-xl border text-left text-xs font-mono font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        customerId === cid
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <span>CID: {cid}</span>
                      {customerId === cid && <span className="text-[10px] text-emerald-600 font-sans">Selected ✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                <div className="font-bold">No Discovered Accounts Found via API</div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Enter your Customer ID below to verify against your authorized Google Ads manager.
                </p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Google Ads Customer ID (CID)
              </label>
              <input
                type="text"
                placeholder="e.g. 583-920-1492"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Account Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Acme Ads Production"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('CHOICE')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmOAuthCustomer}
                className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Verify & Link Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2B: DIRECT WORKSPACE FORM */}
        {step === 'DIRECT_FORM' && (
          <div className="space-y-4 text-xs">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-emerald-950 text-[11px] leading-relaxed">
              <strong>Direct Workspace Activation:</strong> Enter your 10-digit Google Ads Customer ID. This immediately links your account to AdOptimize without OAuth verification screens or approval delays.
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Google Ads Customer ID (CID) *
              </label>
              <input
                type="text"
                placeholder="e.g. 583-920-1492"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Found in the top-right corner of your Google Ads manager (e.g. 123-456-7890).
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Workspace / Account Name
              </label>
              <input
                type="text"
                placeholder="e.g. Main Google Ads Account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Monthly Budget Cap ($)
                </label>
                <input
                  type="number"
                  placeholder="25000"
                  value={spendCap}
                  onChange={(e) => setSpendCap(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('CHOICE')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmDirectWorkspace}
                className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Initialize Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Syncing State */}
        {step === 'SYNCING' && (
          <div className="py-10 text-center space-y-3">
            <RefreshCw className="w-10 h-10 text-[#00d67d] animate-spin mx-auto" />
            <h4 className="text-base font-bold text-slate-900">
              Verifying Customer ID & Workspace...
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Setting up monitoring for Customer ID {customerId}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
