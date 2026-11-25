'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { AppLoader } from '@/components/ui/app-loader';
import { auth } from '@/lib/firebase';
import { GoogleAdsAccount } from '@/types/adoptimize';
import { SubscriptionManager } from '@/components/billing/subscription-manager';
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  KeyRound,
  Link2,
  Mail,
  Settings,
  ShieldCheck,
  Unplug,
} from 'lucide-react';

interface SettingsViewProps {
  account: GoogleAdsAccount;
  onOpenConnectModal: () => void;
  onClearData: () => void;
  onUpdateCurrency?: (currency: string) => void;
  userEmail?: string | null;
  onTestRefresh?: () => Promise<void>;
  isSyncing?: boolean;
}

export function SettingsView({
  account,
  onOpenConnectModal,
  onClearData,
  userEmail,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'connections' | 'billing' | 'security'>('connections');
  const [isClearing, setIsClearing] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const connected = account.isConnected && account.clientCustomerId !== 'Not Connected';
  const hasPasswordProvider = auth.currentUser?.providerData.some((provider) => provider.providerId === 'password') ?? false;

  const disconnect = async () => {
    setIsClearing(true);
    try {
      await onClearData();
    } finally {
      setIsClearing(false);
    }
  };

  const resetPassword = async () => {
    if (!userEmail || passwordBusy) return;
    setPasswordBusy(true);
    setPasswordError('');
    setPasswordMessage('');
    try {
      await sendPasswordResetEmail(auth, userEmail);
      setPasswordMessage('Password reset email sent. Check your inbox.');
    } catch {
      setPasswordError('The password reset email could not be sent. Please try again or contact support@adoptimize.app.');
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-[#2E1065] bg-[#2E1065] p-5 text-white shadow-sm sm:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#FBBF24] px-3 py-1 text-xs font-semibold text-[#2E1065]">
            <Settings className="h-3.5 w-3.5" />
            Workspace settings
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">Account controls</h2>
          <p className="mt-2 text-xs leading-relaxed text-[#DDD6FE] sm:text-sm">
            Manage your Google Ads connection, subscription, password, privacy links, and support contact.
          </p>
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto border-t border-white/15 pt-5">
          {[
            { id: 'connections' as const, label: 'Google Ads', icon: Link2 },
            { id: 'billing' as const, label: 'Subscription', icon: CreditCard },
            { id: 'security' as const, label: 'Security & Privacy', icon: ShieldCheck },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === id
                  ? 'bg-[#FBBF24] text-[#2E1065]'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'connections' && (
        <section className="rounded-xl border border-[#DDD6FE] bg-white p-5 shadow-sm sm:p-8">
          <div className="max-w-xl">
            <h3 className="text-base font-bold text-[#2E1065]">Google Ads connection</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Google sign-in and Google Ads authorization are separate. Connect the account you want AdOptimize to read and, after approval, manage.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${connected ? 'bg-[#FBBF24] text-[#2E1065]' : 'bg-white text-slate-500'} border border-[#DDD6FE]`}>
                {connected ? <CheckCircle2 className="h-5 w-5" /> : <Unplug className="h-5 w-5" />}
              </span>
              <div>
                <p className="text-sm font-bold text-[#2E1065]">{connected ? 'Google Ads is connected' : 'Google Ads is not connected'}</p>
                <p className="mt-0.5 text-xs text-slate-500">{connected ? 'Disconnecting removes the stored AdOptimize connection and cached account data.' : 'Authorize access through Google to connect an account.'}</p>
              </div>
            </div>

            {connected ? (
              <button
                type="button"
                onClick={() => void disconnect()}
                disabled={isClearing}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 sm:w-auto"
              >
                {isClearing ? <AppLoader className="h-4 w-4" /> : <Unplug className="h-4 w-4" />}
                {isClearing ? 'Disconnecting...' : 'Disconnect Google Ads'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenConnectModal}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6D28D9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] sm:w-auto"
              >
                <Link2 className="h-4 w-4" />
                Connect Google Ads
              </button>
            )}
          </div>
        </section>
      )}

      {activeTab === 'billing' && <SubscriptionManager />}

      {activeTab === 'security' && (
        <section className="space-y-5">
          <div className="rounded-xl border border-[#DDD6FE] bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#6D28D9]"><KeyRound className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[#2E1065]">Change password</h3>
                {hasPasswordProvider ? (
                  <>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">Send a secure Firebase password reset link to {userEmail || 'your account email'}.</p>
                    <button
                      type="button"
                      onClick={() => void resetPassword()}
                      disabled={!userEmail || passwordBusy}
                      className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#6D28D9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5B21B6] disabled:opacity-50 sm:w-auto"
                    >
                      {passwordBusy ? <AppLoader className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      {passwordBusy ? 'Sending...' : 'Send password reset email'}
                    </button>
                    {passwordMessage && <p role="status" className="mt-3 text-xs font-medium text-green-700">{passwordMessage}</p>}
                    {passwordError && <p role="alert" className="mt-3 text-xs text-red-700">{passwordError}</p>}
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">Your password is managed by Google because this account uses Google sign-in.</p>
                    <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#6D28D9] px-5 py-2.5 text-sm font-semibold text-[#6D28D9] hover:bg-[#F5F3FF] sm:w-auto">
                      Manage Google security <ExternalLink className="h-4 w-4" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-[#DDD6FE] bg-white p-5 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-[#6D28D9]" />
              <h3 className="mt-3 text-sm font-bold text-[#2E1065]">Privacy and data controls</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">Review Google Ads authorization, data use, AI providers, retention details, and available privacy requests.</p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link href="/privacy-policy" className="font-semibold text-[#6D28D9] underline">Privacy Policy</Link>
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#6D28D9] underline">Google permissions <ExternalLink className="h-3.5 w-3.5" /></a>
              </div>
            </div>

            <div className="rounded-xl border border-[#DDD6FE] bg-white p-5 shadow-sm">
              <Mail className="h-6 w-6 text-[#6D28D9]" />
              <h3 className="mt-3 text-sm font-bold text-[#2E1065]">Contact support</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">Get help with account access, billing, Google Ads connections, privacy requests, or product questions.</p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <a href="mailto:support@adoptimize.app" className="break-all font-semibold text-[#6D28D9] underline">support@adoptimize.app</a>
                <Link href="/contact" className="inline-flex items-center gap-1 font-semibold text-[#6D28D9] underline">Contact page <ExternalLink className="h-3.5 w-3.5" /></Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
