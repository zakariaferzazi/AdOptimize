'use client';

import React, { useState } from 'react';
import {
  Settings,
  CreditCard,
  Key,
  Bell,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Trash2,
  RotateCcw,
  Zap
} from 'lucide-react';
import { GoogleAdsAccount, SubscriptionPlan } from '@/types/adoptimize';
import { SUBSCRIPTION_PLANS } from '@/lib/mock-data';

interface SettingsViewProps {
  account: GoogleAdsAccount;
  onOpenConnectModal: () => void;
  onResetDemo: () => void;
}

export function SettingsView({
  account,
  onOpenConnectModal,
  onResetDemo,
}: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'connections' | 'billing' | 'ai_config' | 'notifications' | 'security'>('connections');
  const [currentPlan, setCurrentPlan] = useState<'FREE' | 'PRO' | 'BUSINESS'>('PRO');
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [minConfidence, setMinConfidence] = useState(90);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/T00/B00/XXXXX');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 text-xs font-semibold mb-3">
            <Settings className="w-3.5 h-3.5" />
            <span>Workspace Configuration</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Settings & Account Controls
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Manage your Google Ads OAuth credentials, AI confidence gates, automated safeguards, and subscription plan.
          </p>
        </div>

        {/* Tab Strip */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'connections' as const, label: 'Google Ads Connections' },
            { id: 'billing' as const, label: 'Subscription & Plans' },
            { id: 'ai_config' as const, label: 'AI Model & Gates' },
            { id: 'notifications' as const, label: 'Alerts & Webhooks' },
            { id: 'security' as const, label: 'Security & Privacy' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#00d67d] text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: GOOGLE ADS CONNECTIONS */}
      {activeTab === 'connections' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Connected Google Ads Accounts</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                OAuth 2.0 authorization with read/write advertising campaign scopes.
              </p>
            </div>
            <button
              onClick={onOpenConnectModal}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              + Connect New Account
            </button>
          </div>

          {/* Account Card */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-900 shadow-2xs">
                G
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{account.accountName}</span>
                  {account.isConnected && account.clientCustomerId !== 'Not Connected' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      {account.verifiedLive ? 'Live API Verified' : 'Workspace Active'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                      Not Connected
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1 font-mono">
                  Client Customer ID: {account.clientCustomerId} · {account.timezone}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {account.isConnected && account.clientCustomerId !== 'Not Connected'
                    ? `Last Synced: ${new Date(account.lastSyncAt).toLocaleTimeString()} · Status: Active monitoring`
                    : 'Status: No active account linked. Click below to connect Google Ads or initialize workspace.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenConnectModal}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Configure Customer ID
              </button>
              <button
                onClick={onResetDemo}
                title="Wipe account data and start completely fresh"
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 rounded-xl text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-500" />
                <span>Clear All Data & Fresh Start</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BILLING & PLANS */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Subscription Plans</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scale your monitoring frequency, accounts limit, and AI automation capabilities.
                </p>
              </div>

              {/* Monthly / Annual Toggle */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setBillingInterval('MONTHLY')}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    billingInterval === 'MONTHLY' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingInterval('ANNUAL')}
                  className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    billingInterval === 'ANNUAL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <span>Annual</span>
                  <span className="text-[10px] text-emerald-600 font-extrabold">Save 20%</span>
                </button>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = currentPlan === plan.id;
                const price = billingInterval === 'ANNUAL' ? plan.annualPriceMonthly : plan.monthlyPrice;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-3xl p-6 border transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-slate-900 bg-slate-950 text-white shadow-xl'
                        : 'border-slate-200/80 bg-white text-slate-900'
                    }`}
                  >
                    {plan.badge && (
                      <span className="absolute -top-3 right-6 bg-[#00d67d] text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        {plan.badge}
                      </span>
                    )}

                    <div>
                      <div className="text-sm font-bold">{plan.name}</div>
                      <div className={`text-xs mt-1 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                        {plan.description}
                      </div>

                      <div className="mt-4 flex items-baseline gap-1">
                        <span className="text-3xl font-bold font-mono">${price}</span>
                        <span className={`text-xs ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                          / month
                        </span>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-200/20 text-xs font-semibold space-y-1">
                        <div>{plan.accountLimit}</div>
                        <div className={isSelected ? 'text-emerald-400' : 'text-emerald-700'}>
                          {plan.spendLimit}
                        </div>
                      </div>

                      <ul className="mt-4 space-y-2 text-xs">
                        {plan.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2
                              className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                isSelected ? 'text-[#00d67d]' : 'text-emerald-600'
                              }`}
                            />
                            <span className={isSelected ? 'text-slate-300' : 'text-slate-600'}>
                              {feat}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => setCurrentPlan(plan.id)}
                      className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#00d67d] text-slate-950 hover:bg-[#00c06f]'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isSelected ? 'Active Plan' : 'Select Plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI CONFIGURATION */}
      {activeTab === 'ai_config' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">AI Intelligence & Confidence Gates</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control the reasoning parameters, model aliases, and minimum confidence required for recommendations.
            </p>
          </div>

          <div className="space-y-4 max-w-xl text-xs">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Underlying AI Model</label>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono font-bold text-slate-800">
                gemini-3.8-flash (via @google/genai server-side SDK)
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 font-bold text-slate-800">
                <span>Minimum Confidence Threshold for Auto-Recommendations</span>
                <span className="font-mono text-emerald-700">{minConfidence}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="99"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                className="w-full accent-[#00d67d]"
              />
              <div className="text-[11px] text-slate-500 mt-1">
                Recommendations with confidence lower than {minConfidence}% will require manual review before suggestion.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Incident Alerts & Webhooks</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Get notified immediately when severe CPA spikes, ROAS drops, or budget exhausts occur.
            </p>
          </div>

          <div className="space-y-4 max-w-xl text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div>
                <div className="font-bold text-slate-900">Critical Anomaly Email Notifications</div>
                <div className="text-[11px] text-slate-500">Send instant alert to zakariaferzazi24.04.2000@gmail.com</div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#00d67d]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Slack Incoming Webhook URL</label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY & PRIVACY */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">Security & Access Management</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure OAuth token encryption, zero-credential client policy, and access audits.
            </p>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-900">Zero Client-Side Token Exposure</div>
                <div className="text-emerald-800 mt-0.5">
                  All Google Ads OAuth refresh tokens and developer keys are stored exclusively in server environment variables. The browser never receives raw tokens.
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="font-bold text-slate-900">Audit Trail Retention</div>
              <div className="text-slate-600 mt-0.5">
                Every optimization execution, approval, and rejection is permanently stored in the change log for compliance and rollback capabilities.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
