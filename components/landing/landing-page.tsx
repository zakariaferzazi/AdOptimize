'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  SlidersHorizontal,
  CheckCircle2,
  ChevronDown,
  Layers,
  Search,
  DollarSign,
  Lock,
  ChevronRight,
  Wrench,
  Sparkles
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
  const [monthlySpend, setMonthlySpend] = useState<number>(6000);
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

  // Realistic calculation of recoverable wasted spend (~22% industry average)
  const estimatedWaste = Math.round(monthlySpend * 0.22);
  const projectedExtraConversions = Math.round((estimatedWaste / 35));

  const faqs = [
    {
      q: 'How does AdOptimize connect to Google Ads?',
      a: 'AdOptimize connects securely in 60 seconds through official Google OAuth 2.0 with read/write access. All tokens are encrypted at rest with AES-256 and stored strictly on our secure server. We never see your password.',
    },
    {
      q: 'Will AdOptimize change my budgets or keywords without permission?',
      a: 'No. By default, AdOptimize operates in Recommendation Mode. Every budget shift or negative keyword addition requires your 1-click confirmation before anything is sent to Google Ads.',
    },
    {
      q: 'What campaign types are supported?',
      a: 'AdOptimize supports Google Search campaigns, Performance Max (PMax), Display remarketing, and Google Shopping campaigns.',
    },
    {
      q: 'How much wasted spend does AdOptimize typically find?',
      a: 'On average, accounts spending between $2,000 and $50,000/month have 18% to 26% of their budget going to non-converting search terms, poorly timed bids, or capped campaigns losing impression share.',
    },
    {
      q: 'Is there a contract or cancellation fee?',
      a: 'None. All plans are month-to-month and can be cancelled at any time in one click. We also offer a 14-day money-back guarantee.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 selection:bg-[#00d67d]/20 selection:text-slate-900 font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#0d1117]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenApp}>
            <Image
              src="/icon.svg"
              alt="AdOptimize Logo"
              width={34}
              height={34}
              className="w-8.5 h-8.5 rounded-xl shadow-md shadow-[#00d67d]/20 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="text-xl font-bold tracking-tight flex items-baseline">
              <span className="text-white">Ad</span>
              <span className="text-[#00d67d]">Optimize</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <Link href="/tools" className="hover:text-white transition-colors">Free Tools</Link>
            <Link href="/solutions" className="hover:text-white transition-colors">Solutions</Link>
            <Link href="/compare" className="hover:text-white transition-colors">Compare</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
          </nav>

          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onOpenApp}
                  className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onSignInWithGoogle}
                  className="px-3.5 py-2 text-slate-200 hover:text-white font-semibold text-xs rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Log In</span>
                </button>

                <button
                  onClick={onSignInWithGoogle}
                  className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Start Free</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION: Minimal, High Search-Volume Keywords */}
      <section className="relative pt-20 pb-24 overflow-hidden bg-gradient-to-b from-[#0d1117] via-slate-950 to-[#0d1117] text-white">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-[#00d67d] border border-emerald-500/20 text-xs font-semibold">
            <span>Official Google Ads API Integration</span>
            <span className="text-white/40">•</span>
            <span>Reports API v17</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-[1.12]">
            Stop Wasted Google Ads Spend. Increase ROAS.
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Run an instant Google Ads audit. Automatically find non-converting search terms, stop bleeding daily budgets, and shift capital to your highest-converting campaigns.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <button
              onClick={onSignInWithGoogle || onConnectGoogleAds}
              className="px-7 py-3.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 text-sm font-bold rounded-xl shadow-lg shadow-[#00d67d]/20 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                <GoogleIcon className="w-3.5 h-3.5" />
              </div>
              <span>Start Free 60-Sec Audit</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={onOpenApp}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Explore Live Demo</span>
            </button>
          </div>

          {/* Minimal Trust Strip */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00d67d]" />
              <span>Zero changes without 1-click approval</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#00d67d]" />
              <span>AES-256 encrypted OAuth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#00d67d]" />
              <span>14-day money-back guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE WASTED SPEND CALCULATOR */}
      <section className="max-w-4xl mx-auto px-6 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Live Waste Estimator
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                How Much Are You Bleeding on Google Ads?
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Based on 10,000+ audited accounts
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                <span>Monthly Google Ads Budget:</span>
                <span className="font-mono text-base text-emerald-700">${monthlySpend.toLocaleString()} / month</span>
              </div>
              <input
                type="range"
                min="1000"
                max="50000"
                step="500"
                value={monthlySpend}
                onChange={(e) => setMonthlySpend(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>$1,000 / mo</span>
                <span>$25,000 / mo</span>
                <span>$50,000 / mo</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4.5 bg-rose-50 rounded-2xl border border-rose-100">
                <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                  Estimated Monthly Wasted Spend
                </div>
                <div className="text-3xl font-extrabold font-mono text-rose-950 mt-1">
                  ${estimatedWaste.toLocaleString()}
                  <span className="text-xs font-normal text-rose-700"> / mo</span>
                </div>
                <div className="text-xs text-rose-800 mt-1">
                  Drained by negative queries and poor placements
                </div>
              </div>

              <div className="p-4.5 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Recoverable Extra Conversions
                </div>
                <div className="text-3xl font-extrabold font-mono text-emerald-950 mt-1">
                  +{projectedExtraConversions}
                  <span className="text-xs font-normal text-emerald-700"> sales or leads</span>
                </div>
                <div className="text-xs text-emerald-800 mt-1">
                  By shifting budget into high-ROAS winning campaigns
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 CORE PILLARS: Minimal & Direct */}
      <section className="py-20 max-w-5xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            How It Works
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Three Steps to Higher Google Ads ROI
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            No complicated setup. No agency retainers. Concrete data evidence on every finding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6.5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-xs">
              01
            </div>
            <h3 className="text-base font-bold text-slate-900">1. Catch Wasted Spend</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Find non-converting broad-match search terms, job-seeker clicks, and spam display placements draining your daily budget. Add negative keywords in 1 click.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6.5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-xs">
              02
            </div>
            <h3 className="text-base font-bold text-slate-900">2. Lower CPA & Boost ROAS</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Understand why your cost per acquisition spiked. Get plain-English diagnoses citing exact before/after metrics from your campaign query logs.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6.5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-xs">
              03
            </div>
            <h3 className="text-base font-bold text-slate-900">3. Rebalance Budget to Winners</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Stop starving high-converting campaigns. Identify keywords losing impression share to budget limits and safely transfer budget with 1-click verification.
            </p>
          </div>
        </div>
      </section>

      {/* REAL EVIDENCE PREVIEW: Real data, no hype */}
      <section className="py-16 bg-white border-y border-slate-200/60">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Audit-Proof Evidence
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Clear Problem. Exact Data. Calculated Impact.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Unlike generic dashboards that only display charts, AdOptimize provides an actionable diagnosis for every anomaly, citing exact metrics and calculating estimated monthly savings.
            </p>

            <div className="space-y-2 pt-2 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Problem:</strong> Identifies the exact campaign and match type causing cost inflation.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Evidence:</strong> Real comparison ($85 CPA baseline → $210 CPA acute spike).</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Action:</strong> Shift $50/day into Search High-Intent. Estimated impact: +$4,230/mo net profit.</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 text-white rounded-3xl p-6.5 sm:p-7 shadow-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-400 bg-rose-500/20 px-2.5 py-1 rounded-full border border-rose-500/30">
                CRITICAL CPA SPIKE
              </span>
              <span className="font-mono text-[#00d67d]">96% Confidence</span>
            </div>

            <div>
              <div className="text-base font-bold text-white">
                Display Retargeting CPA Spiked to $210.00 (ROAS: 0.86)
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Spent $1,890.00 for only 9 conversions. Non-converting app clicks draining $50/day.
              </p>
            </div>

            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 text-xs">
              <div className="font-bold text-[#00d67d] uppercase tracking-wider text-[11px]">
                Recommended Action:
              </div>
              <div className="text-slate-200 mt-0.5">
                Cut Display budget by $50/day and transfer to Search High Intent (which is hitting budget cap by 3:30 PM).
              </div>
            </div>

            <button
              onClick={onOpenApp}
              className="w-full py-3 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View in Live Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* QUICK HUB: Free Tools & Industry Solutions */}
      <section className="py-20 max-w-5xl mx-auto px-6 space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Free Optimization Directory
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Popular Free Google Ads Tools & Industry Guides
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 text-xs">
          <Link
            href="/tools/google-ads-audit"
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition-all font-bold text-slate-900 flex items-center justify-between"
          >
            <span>Google Ads Audit Tool</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/tools/negative-keywords-finder"
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition-all font-bold text-slate-900 flex items-center justify-between"
          >
            <span>Negative Keywords Finder</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/tools/cpa-calculator"
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition-all font-bold text-slate-900 flex items-center justify-between"
          >
            <span>Google Ads CPA Calculator</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/tools/roas-calculator"
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition-all font-bold text-slate-900 flex items-center justify-between"
          >
            <span>Target ROAS Calculator</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/solutions/saas"
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition-all font-bold text-slate-900 flex items-center justify-between"
          >
            <span>Google Ads for SaaS</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/solutions/ecommerce"
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition-all font-bold text-slate-900 flex items-center justify-between"
          >
            <span>Google Ads for eCommerce</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/solutions/b2b"
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition-all font-bold text-slate-900 flex items-center justify-between"
          >
            <span>B2B Google Ads Lead Gen</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/compare/google-ads-agency-vs-software"
            className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition-all font-bold text-slate-900 flex items-center justify-between"
          >
            <span>Agency vs. Software</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </section>

      {/* PRICING SECTION: Clean & Straightforward */}
      <section id="pricing" className="py-20 bg-white border-t border-slate-200/60">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Predictable ROI
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Fair, Transparent Pricing
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              14-day money-back guarantee. Cancel anytime with 1 click.
            </p>

            <div className="inline-flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs font-bold mt-4">
              <button
                onClick={() => setBillingInterval('MONTHLY')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  billingInterval === 'MONTHLY' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('ANNUAL')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  billingInterval === 'ANNUAL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const price = billingInterval === 'ANNUAL' ? plan.annualPriceMonthly : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-6 sm:p-7 border transition-all flex flex-col justify-between relative ${
                    plan.popular
                      ? 'border-slate-950 bg-slate-950 text-white shadow-xl scale-[1.02]'
                      : 'border-slate-200/80 bg-white text-slate-900'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 right-6 bg-[#00d67d] text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                      {plan.badge}
                    </span>
                  )}

                  <div>
                    <div className="text-base font-bold">{plan.name}</div>
                    <div className={`text-xs mt-1 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                      {plan.description}
                    </div>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold font-mono">${price}</span>
                      <span className={`text-xs ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                        / month
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-200/20 text-xs font-semibold space-y-1">
                      <div>{plan.accountLimit}</div>
                      <div className={plan.popular ? 'text-emerald-400' : 'text-emerald-700'}>
                        {plan.spendLimit}
                      </div>
                    </div>

                    <ul className="mt-4 space-y-2.5 text-xs">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2
                            className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
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
                    className={`mt-8 w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      plan.popular
                        ? 'bg-[#00d67d] text-slate-950 hover:bg-[#00c06f]'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Get Started</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 max-w-3xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Answers
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-5 flex items-center justify-between text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-emerald-600' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-20 bg-slate-950 text-white text-center border-t border-slate-800">
        <div className="max-w-2xl mx-auto px-6 space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Stop Guessing. Audit Your Google Ads Now.
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Link your account in 60 seconds. Identify your top negative keyword leaks and recover wasted budget today.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onSignInWithGoogle || onConnectGoogleAds}
              className="px-7 py-3.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                <GoogleIcon className="w-3.5 h-3.5" />
              </div>
              <span>Start Free 14-Day Audit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* COMPLETE SAAS FOOTER: Legal, Tools, Solutions, Company */}
      <footer className="bg-[#0b0f12] text-slate-400 pt-16 pb-12 px-6 border-t border-slate-800/80 text-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand info */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#00d67d] flex items-center justify-center text-slate-950 font-bold text-xs">
                <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="text-lg font-bold tracking-tight flex items-baseline">
                <span className="text-white">Ad</span>
                <span className="text-[#00d67d]">Optimize</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
              Google Ads audit tool and automated budget optimization platform. Eliminate wasted spend, lower CPA, and scale campaign ROAS.
            </p>
            <div className="text-[11px] text-slate-500 pt-2">
              Complies with Google API Services User Data Policy.
            </div>
          </div>

          {/* Column 1: Free Tools */}
          <div className="space-y-2.5">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Free Tools</div>
            <ul className="space-y-2">
              <li><Link href="/tools/google-ads-audit" className="hover:text-white transition-colors">Google Ads Audit</Link></li>
              <li><Link href="/tools/negative-keywords-finder" className="hover:text-white transition-colors">Negative Keywords Finder</Link></li>
              <li><Link href="/tools/cpa-calculator" className="hover:text-white transition-colors">CPA Calculator</Link></li>
              <li><Link href="/tools/roas-calculator" className="hover:text-white transition-colors">Target ROAS Calculator</Link></li>
              <li><Link href="/tools/wasted-spend-estimator" className="hover:text-white transition-colors">Wasted Spend Estimator</Link></li>
              <li><Link href="/tools/quality-score-checker" className="hover:text-white transition-colors">Quality Score Checker</Link></li>
            </ul>
          </div>

          {/* Column 2: Solutions */}
          <div className="space-y-2.5">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Solutions</div>
            <ul className="space-y-2">
              <li><Link href="/solutions/saas" className="hover:text-white transition-colors">SaaS & Software</Link></li>
              <li><Link href="/solutions/ecommerce" className="hover:text-white transition-colors">eCommerce & DTC</Link></li>
              <li><Link href="/solutions/b2b" className="hover:text-white transition-colors">B2B Lead Generation</Link></li>
              <li><Link href="/solutions/agencies" className="hover:text-white transition-colors">Agencies & Consultants</Link></li>
              <li><Link href="/compare/google-ads-agency-vs-software" className="hover:text-white transition-colors">Agency Alternative</Link></li>
            </ul>
          </div>

          {/* Column 3: Trust & Legal */}
          <div className="space-y-2.5">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Legal & Trust</div>
            <ul className="space-y-2">
              <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              <li><Link href="/security" className="hover:text-white transition-colors">Security & Compliance</Link></li>
              <li><Link href="/subprocessors" className="hover:text-white transition-colors">Subprocessors</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white transition-colors">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>© 2026 AdOptimize Inc. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
            <button onClick={onOpenApp} className="text-[#00d67d] font-bold hover:underline cursor-pointer">
              Launch App
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
