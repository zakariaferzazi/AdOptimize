'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  SlidersHorizontal,
  Bot,
  FileText,
  CheckCircle2,
  ChevronDown,
  Layers,
  Search,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  DollarSign,
  LogIn
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/mock-data';

// Official multi-colored Google icon
function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

interface LandingPageProps {
  onOpenApp: () => void;
  onConnectGoogleAds: () => void;
  onSignInWithGoogle?: () => void;
  user?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  onSignOut?: () => void;
}

export function LandingPage({
  onOpenApp,
  onConnectGoogleAds,
  onSignInWithGoogle,
  user,
  onSignOut,
}: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  const faqs = [
    {
      q: 'How does AdOptimize connect to my Google Ads account?',
      a: 'AdOptimize connects securely via official Google OAuth 2.0 with the read/write advertising management scope. All tokens and developer credentials remain strictly server-side in encrypted environments. We never expose API keys to the browser.',
    },
    {
      q: 'Does AdOptimize change my bids or budgets without permission?',
      a: 'No. By default, AdOptimize operates in "Recommend" mode. Every suggested budget shift, negative keyword addition, or campaign pause requires your explicit click approval. If you choose to enable "Auto-Optimize" rules, hard caps (e.g. max ±15% daily shift) and audit logging strictly protect your budget.',
    },
    {
      q: 'How is AdOptimize different from generic AI chatbots?',
      a: 'Generic chatbots hallucinate marketing advice and don’t have access to your account’s search query logs or auction signals. AdOptimize is a deterministic audit and optimization engine powered by Gemini. Every finding cites exact numbers, CPAs, ROAS, and dollar spend from your actual campaign data.',
    },
    {
      q: 'Can I try AdOptimize without connecting my real Google Ads account right now?',
      a: 'Yes! You can connect your Google Ads account via secure OAuth 2.0 or input your Customer ID directly to run an instant real-time diagnostic audit of your campaigns, budgets, and Quality Scores.',
    },
    {
      q: 'What Google Ads campaign types are supported?',
      a: 'AdOptimize fully supports Google Search campaigns, Performance Max (PMax), Display campaigns, and Google Shopping campaigns.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 selection:bg-[#00d67d]/20 selection:text-slate-900 font-sans">
      {/* Navigation Top Bar */}
      <header className="sticky top-0 z-40 bg-[#0d1117]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-4.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand Logo: Ad in white, Optimize in green, no dot */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenApp}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00d67d] to-[#059669] flex items-center justify-center text-slate-950 font-bold shadow-md shadow-[#00d67d]/20">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="text-2xl font-bold tracking-tight flex items-baseline">
              <span className="text-white">Ad</span>
              <span className="text-[#00d67d]">Optimize</span>
            </div>
          </div>

          {/* Links with prominent legible typography */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#monitoring" className="hover:text-white transition-colors">Monitoring</a>
            <a href="#ai-analyst" className="hover:text-white transition-colors">AI Analysis</a>
            <a href="#optimizer" className="hover:text-white transition-colors">Budget Optimizer</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Header Action Buttons with Google Icons */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenApp}
                  className="px-5 py-2.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-sm rounded-xl shadow-md shadow-[#00d67d]/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="hidden sm:inline-flex px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Log In Button with Google Icon */}
                <button
                  onClick={onSignInWithGoogle}
                  className="px-4 py-2.5 text-slate-200 hover:text-white font-semibold text-sm rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                  <span>Log In</span>
                </button>

                {/* Sign Up Button with Google Icon */}
                <button
                  onClick={onSignInWithGoogle}
                  className="px-4.5 py-2.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-sm rounded-xl shadow-md shadow-[#00d67d]/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-102"
                >
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                  <span>Sign Up Free</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO */}
      <section className="relative pt-24 pb-28 overflow-hidden bg-gradient-to-b from-[#0d1117] via-slate-950 to-[#0d1117] text-white">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-7">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-500/15 text-[#00d67d] border border-emerald-500/30 text-sm font-semibold animate-pulse">
            <Sparkles className="w-4 h-4" />
            <span>Autonomous Google Ads Intelligence & Capital Rebalancing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15] text-balance">
            Your AI Marketing Manager for Google Ads
          </h1>

          <p className="text-slate-200 text-lg sm:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed font-normal">
            Find wasted spend, understand what’s hurting your campaigns, and continuously optimize your advertising performance — automatically and safely.
          </p>

          {/* Hero CTAs with clear Google Auth identification */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {user ? (
              <>
                <button
                  onClick={onOpenApp}
                  className="px-8 py-4 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 text-base font-bold rounded-2xl shadow-xl shadow-[#00d67d]/25 transition-all flex items-center gap-2.5 cursor-pointer hover:scale-105"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={onConnectGoogleAds}
                  className="px-7 py-4 bg-white/10 hover:bg-white/20 text-white text-base font-semibold rounded-2xl border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Sync Google Ads Account</span>
                </button>
              </>
            ) : (
              <>
                {/* Primary: Sign Up with Google */}
                <button
                  onClick={onSignInWithGoogle || onConnectGoogleAds}
                  className="px-7 sm:px-8 py-4 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 text-base font-bold rounded-2xl shadow-xl shadow-[#00d67d]/25 transition-all flex items-center gap-3 cursor-pointer hover:scale-105"
                >
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-xs shrink-0">
                    <GoogleIcon className="w-4 h-4" />
                  </div>
                  <span>Sign Up with Google Free</span>
                  <ArrowRight className="w-5 h-5 ml-0.5" />
                </button>

                {/* Secondary: Log In with Google */}
                <button
                  onClick={onSignInWithGoogle}
                  className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white text-base font-semibold rounded-2xl border border-white/15 transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>Log In with Google</span>
                </button>

                {/* Tertiary: Interactive Demo */}
                <button
                  onClick={onOpenApp}
                  className="px-5 py-4 bg-transparent hover:bg-white/5 text-slate-300 hover:text-white text-base font-medium rounded-2xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-[#00d67d]" />
                  <span>Explore Demo</span>
                </button>
              </>
            )}
          </div>

          {/* Trust strip */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00d67d]" />
              <span>Official Google Ads API</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#00d67d]" />
              <span>Zero silent changes</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#00d67d]" />
              <span>Continuous 15-min sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: CORE WORKFLOW */}
      <section id="how-it-works" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center space-y-3 mb-16">
          <span className="text-sm font-bold uppercase tracking-wider text-emerald-600">
            The Continuous Optimization Flywheel
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            How AdOptimize Works
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            Not another vanity dashboard. A 6-stage closed-loop performance system that works 24/7.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { step: '01', title: 'CONNECT', desc: 'Secure Google Ads OAuth in 60s' },
            { step: '02', title: 'ANALYZE', desc: 'Continuous auction & query sync' },
            { step: '03', title: 'DETECT', desc: 'Spot CPA spikes & budget bleeds' },
            { step: '04', title: 'EXPLAIN', desc: 'Root cause grounded in real data' },
            { step: '05', title: 'RECOMMEND', desc: 'Concrete budget shifts & negatives' },
            { step: '06', title: 'OPTIMIZE', desc: '1-click approval or auto-rule' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-5.5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-48 hover:border-emerald-400 hover:shadow-md transition-all"
            >
              <div className="font-mono text-sm font-extrabold text-[#00d67d] bg-slate-950 w-8 h-8 rounded-xl flex items-center justify-center shadow-xs">
                {item.step}
              </div>
              <div>
                <div className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  {item.title}
                </div>
                <div className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-snug">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3 & 4: AI MARKETING ANALYST & ROOT CAUSE */}
      <section id="ai-analyst" className="py-20 bg-white border-y border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-600">
              Never Fabricated Numbers
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              AI That Explains <span className="underline decoration-[#00d67d]">Why</span> Performance Dropped
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              When your CPA spikes or conversions slow down, Google Ads leaves you guessing. AdOptimize cross-analyzes search term logs, keyword Quality Scores, and auction pressure to deliver an exact diagnostic card:
            </p>

            <ul className="space-y-3.5 text-sm sm:text-base text-slate-700 pt-2 font-medium">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Problem</strong>: Pinpoints the specific campaign, ad group, or match type.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Evidence</strong>: Cites actual before/after metrics ($85 CPA → $210 CPA).</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Expected Impact</strong>: Calculated monthly savings and conversion gains.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Confidence Score</strong>: Rigorous statistical backing before any proposal.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Card Mockup */}
          <div className="bg-slate-950 text-white rounded-3xl p-7 sm:p-8 shadow-2xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-rose-400 bg-rose-500/20 px-3 py-1 rounded-full border border-rose-500/30 text-xs">
                CRITICAL ISSUE DETECTED
              </span>
              <span className="font-mono text-[#00d67d] font-bold text-sm">96% Confidence</span>
            </div>

            <div>
              <div className="text-base sm:text-lg font-bold text-white">
                Retargeting CPA Spiked +145% to $210.00 (ROAS: 0.86)
              </div>
              <p className="text-sm sm:text-base text-slate-300 mt-2 leading-relaxed">
                Display campaign consumed $1,890 over 7 days for only 9 conversions. Broad non-converting app placements are draining $50/day.
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-sm">
              <div className="text-xs font-bold text-[#00d67d] uppercase tracking-wider">
                Recommended Action:
              </div>
              <div className="text-slate-200 mt-1 font-medium">
                Cut daily budget from $75/day to $25/day and reallocate to Search High Intent.
              </div>
            </div>

            <button
              onClick={onOpenApp}
              className="w-full py-3.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-sm sm:text-base rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] cursor-pointer"
            >
              <span>View in Live Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 5: BUDGET OPTIMIZER */}
      <section id="optimizer" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center space-y-3 mb-14">
          <span className="text-sm font-bold uppercase tracking-wider text-emerald-600">
            Capital Rebalancing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Put Your Budget Where It Converts
          </h2>
          <p className="text-base sm:text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            Stop giving equal budgets to unequal campaigns. Automatically identify high-ROAS winners with unmet impression share.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-7 sm:p-10 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-slate-900">
              Before / After Reallocation Engine
            </h3>
            <p className="text-base text-slate-600 leading-relaxed">
              If Campaign A generates 4.7x ROAS but hits its daily budget cap by 3 PM, and Campaign B generates 0.8x ROAS, AdOptimize simulates the exact financial outcome of transferring capital.
            </p>
            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm sm:text-base text-emerald-950 font-medium">
              Average customer identifies <strong>$1,860/month</strong> in recoverable ad spend during the first 14 days.
            </div>
            <button
              onClick={onOpenApp}
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Try Budget Optimizer Simulator</span>
              <SlidersHorizontal className="w-4 h-4 text-[#00d67d]" />
            </button>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-3.5 font-mono text-sm">
            <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200">
              <span className="font-sans font-semibold text-slate-700">Display Retargeting:</span>
              <span className="text-rose-600 font-bold">$75/d → $25/d (-$50/d)</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200">
              <span className="font-sans font-semibold text-slate-700">Search Core SaaS:</span>
              <span className="text-emerald-700 font-bold">$160/d → $210/d (+$50/d)</span>
            </div>
            <div className="p-4 bg-slate-950 text-white rounded-xl flex items-center justify-between shadow-xs">
              <span className="font-sans text-sm text-slate-300">Projected Margin Delta:</span>
              <span className="text-[#00d67d] font-bold text-base sm:text-lg">+$4,230.00 / month</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: PRICING */}
      <section id="pricing" className="py-24 bg-white border-t border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 space-y-14">
          <div className="text-center space-y-3">
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-600">
              Simple, Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Choose the Plan That Fits Your Scale
            </h2>
            <p className="text-base sm:text-lg text-slate-600">
              All plans include continuous Google Ads monitoring and grounded AI analysis.
            </p>

            {/* Interval Toggle */}
            <div className="inline-flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-sm font-bold mt-4">
              <button
                onClick={() => setBillingInterval('MONTHLY')}
                className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  billingInterval === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('ANNUAL')}
                className={`px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  billingInterval === 'ANNUAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                <span>Annual</span>
                <span className="text-xs text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const price = billingInterval === 'ANNUAL' ? plan.annualPriceMonthly : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-7 sm:p-8 border transition-all flex flex-col justify-between relative ${
                    plan.popular
                      ? 'border-slate-950 bg-slate-950 text-white shadow-xl scale-[1.02]'
                      : 'border-slate-200/80 bg-white text-slate-900'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3.5 right-6 bg-[#00d67d] text-slate-950 text-xs font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                      {plan.badge}
                    </span>
                  )}

                  <div>
                    <div className="text-lg font-bold">{plan.name}</div>
                    <div className={`text-sm mt-1.5 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                      {plan.description}
                    </div>

                    <div className="mt-5 flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold font-mono">${price}</span>
                      <span className={`text-sm ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                        / month
                      </span>
                    </div>

                    <div className="mt-5 pt-5 border-t border-slate-200/20 text-sm font-semibold space-y-1.5">
                      <div>{plan.accountLimit}</div>
                      <div className={plan.popular ? 'text-emerald-400' : 'text-emerald-700'}>
                        {plan.spendLimit}
                      </div>
                    </div>

                    <ul className="mt-5 space-y-3 text-sm">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              plan.popular ? 'text-[#00d67d]' : 'text-emerald-600'
                            }`}
                          />
                          <span className={plan.popular ? 'text-slate-300' : 'text-slate-600'}>
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={onSignInWithGoogle || onConnectGoogleAds}
                    className={`mt-9 w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      plan.popular
                        ? 'bg-[#00d67d] text-slate-950 hover:bg-[#00c06f] shadow-md shadow-[#00d67d]/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <span>Get Started with Google</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 7: FAQ */}
      <section id="faq" className="py-24 max-w-4xl mx-auto px-6 space-y-10">
        <div className="text-center space-y-3">
          <span className="text-sm font-bold uppercase tracking-wider text-emerald-600">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Common Inquiries
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-5 sm:p-6 flex items-center justify-between text-base sm:text-lg font-bold text-slate-900 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-emerald-600' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-6 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 8: FINAL CTA */}
      <section className="py-24 bg-slate-950 text-white text-center border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-6 space-y-7">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Stop Guessing. Start Optimizing.
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Connect your Google Ads account in 60 seconds and let AdOptimize audit your campaigns for immediate wasted spend and scaling opportunities.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <button
              onClick={onSignInWithGoogle || onConnectGoogleAds}
              className="px-8 py-4 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-base rounded-2xl shadow-xl shadow-[#00d67d]/20 transition-all flex items-center gap-3 cursor-pointer hover:scale-105"
            >
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-xs shrink-0">
                <GoogleIcon className="w-4 h-4" />
              </div>
              <span>Sign Up with Google Free</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onSignInWithGoogle}
              className="px-7 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-base rounded-2xl border border-white/15 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <GoogleIcon className="w-5 h-5 shrink-0" />
              <span>Log In with Google</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0b0f12] text-slate-400 py-10 px-6 border-t border-slate-800/80 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="text-base font-bold flex items-baseline">
              <span className="text-white">Ad</span>
              <span className="text-[#00d67d]">Optimize</span>
            </div>
            <span>© 2026 AdOptimize Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <button onClick={onOpenApp} className="text-[#00d67d] font-bold hover:underline cursor-pointer">
              Launch App
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
