'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Layers,
  Search,
  DollarSign,
  Lock,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Sliders,
  Clock,
  Shield,
  Check,
  ExternalLink,
  Target,
  FileText,
  SlidersHorizontal,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { GoogleIcon } from '@/components/ui/google-icon';
import { ModelDemoSimulator } from './model-demo-simulator';
import { BrandLogo } from '@/components/ui/brand-logo';

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

  const pricingTiers = [
    {
      name: 'Free Forever',
      priceMonthly: 0,
      priceAnnualMonthly: 0,
      description: 'Essential monitoring and search query auditing for smaller ad spend.',
      popular: false,
      spendLimit: 'Up to $1,000 / mo ad spend',
      features: [
        '1 connected Google Ads account',
        'Daily search query waste scan',
        'Top 20 negative keyword recommendations',
        'Email anomaly alerts',
        'Standard 1-click Google OAuth connect',
      ],
      cta: 'Start Free Forever',
    },
    {
      name: 'Starter',
      priceMonthly: 29,
      priceAnnualMonthly: 23,
      description: 'Complete autonomous optimization for solo operators and media buyers.',
      popular: false,
      spendLimit: 'Up to $5,000 / mo ad spend',
      features: [
        '1 connected Google Ads account',
        'Continuous hourly background audit',
        '1-click negative keyword harvester',
        'Daily budget pacing & runaway alerts',
        'Audit log with instant 1-click rollback',
        'Search & Performance Max auditing',
      ],
      cta: 'Start Free Trial',
    },
    {
      name: 'Growth',
      priceMonthly: 69,
      priceAnnualMonthly: 55,
      description: 'Deep optimization and automated capital reallocation for high-ROAS accounts.',
      popular: true,
      spendLimit: 'Up to $25,000 / mo ad spend',
      features: [
        'Up to 3 Google Ads accounts',
        'Continuous 15-minute background sync',
        'Dynamic budget shift simulator',
        'Rapid CPA spike & tracking anomaly alerts',
        'PMax asset diagnostics & low-ROAS flags',
        'Instant 1-click rollback on all actions',
        'Priority email & webhook notifications',
      ],
      cta: 'Start Free Trial',
    },
    {
      name: 'Scale',
      priceMonthly: 129,
      priceAnnualMonthly: 99,
      description: 'Multi-account oversight and dedicated throughput for growing portfolios.',
      popular: false,
      spendLimit: 'Up to $100,000 / mo ad spend',
      features: [
        'Up to 10 Google Ads accounts',
        'Continuous real-time sync',
        'Cross-account capital rebalancing',
        'Slack & Discord webhook integration',
        'Dedicated onboarding & priority queue',
        'Custom safety limits & approval workflows',
      ],
      cta: 'Start Scale Trial',
    },
  ];

  const comparisons = [
    {
      slug: 'optmyzr-alternative',
      name: 'Optmyzr Alternative',
      tagline: 'Why pay $249+/mo plus spend penalty fees? Clean, accessible PPC optimization with zero scripts.',
      highlight: 'Flat pricing vs $249+/mo tier fees',
    },
    {
      slug: 'adspirer-alternative',
      name: 'Adspirer Alternative',
      tagline: 'Deep Google Ads search query intelligence, negative keyword mining, and guarded execution.',
      highlight: 'Specialized Google Ads vs general chat',
    },
    {
      slug: 'wordstream-alternative',
      name: 'WordStream Alternative',
      tagline: 'Modern Performance Max and Smart Bidding diagnostics built for today’s auction dynamics.',
      highlight: 'Built for PMax & Smart Bidding',
    },
    {
      slug: 'google-ads-agency-vs-software',
      name: 'Agency vs Software',
      tagline: 'Continuous 15-minute health monitoring without paying $3,000–$10,000/mo retainer fees.',
      highlight: '24/7 audit without retainer overhead',
    },
  ];

  const faqs = [
    {
      q: 'How does AdOptimize connect to my Google Ads account?',
      a: 'AdOptimize connects securely through Google OAuth with direct Google authorization. You simply click Connect and approve access in the official Google popup. We never ask for passwords, secret keys, or developer tokens.',
    },
    {
      q: 'Will AdOptimize make changes to my campaigns without my permission?',
      a: 'Never. AdOptimize operates strictly with human-in-the-loop verification. Every suggested negative keyword, budget shift, or campaign pause requires your explicit 1-click confirmation before being dispatched to Google Ads.',
    },
    {
      q: 'Can I revert any changes made through AdOptimize?',
      a: 'Yes. Every optimization action is recorded in an immutable audit trail with an instant 1-click Rollback button. Reverting restores previous budgets, bids, or negative keywords in Google Ads immediately.',
    },
    {
      q: 'How is AdOptimize different from expensive enterprise platforms like Optmyzr?',
      a: 'Optmyzr costs $249+/month and charges additional percentage fees as your ad spend grows, requiring complex multi-screen scripts. AdOptimize starts at $29/mo flat, connects in 30 seconds, and delivers instant, plain-English optimizations with zero setup scripts.',
    },
    {
      q: 'How is AdOptimize different from conversational tools like Adspirer?',
      a: 'While general conversational tools answer broad questions across multiple platforms, AdOptimize is deeply specialized for Google Ads: analyzing live search queries, diagnosing Performance Max asset groups, detecting CPA anomalies in real time, and optimizing ROAS.',
    },
    {
      q: 'Is there a contract or cancellation penalty?',
      a: 'None. All subscriptions are month-to-month and can be cancelled at any time with a single click. Every plan includes an unconditional 14-day money-back guarantee.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-emerald-100 selection:text-slate-900 font-sans antialiased">
      {/* 1. TOP NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="cursor-pointer" onClick={onOpenApp}>
            <BrandLogo theme="light" />
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#simulator" className="hover:text-slate-900 transition-colors">Audit Simulator</a>
            <Link href="/compare" className="hover:text-slate-900 transition-colors">
              Comparisons
            </Link>
            <a href="#features" className="hover:text-slate-900 transition-colors">Capabilities</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenApp}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenApp}
                  className="px-3.5 py-2 text-slate-700 hover:text-slate-900 font-medium text-xs transition-colors cursor-pointer"
                >
                  Log In
                </button>

                <button
                  onClick={onSignInWithGoogle || onConnectGoogleAds}
                  className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-20 pb-16 px-6 bg-gradient-to-b from-slate-50/70 to-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Google Ads Optimization Software
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.14]">
            Stop wasted Google Ads spend. Rebalance budget to what converts.
          </h1>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            AdOptimize scans your search queries in real time, mines negative keywords before money is wasted, and alerts you to budget bottlenecks. You approve every change in one click.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <button
              onClick={onSignInWithGoogle || onConnectGoogleAds}
              className="px-6 py-3.5 bg-slate-900 hover:bg-black text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center gap-2.5 cursor-pointer hover:translate-y-[-1px]"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span>Sign in with Google</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={onOpenApp}
              className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>View Dashboard</span>
            </button>
          </div>

          {/* Quiet Unboxed Proof Line */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-xs text-slate-500 font-normal">
            <span>Instant Google OAuth connect</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Connect Google Ads in next step</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>1-click rollback on all actions</span>
          </div>

          {/* Interactive Multi-Model Agent Simulation */}
          <div id="simulator" className="pt-8 sm:pt-12 scroll-mt-24">
            <ModelDemoSimulator
              onConnectGoogleAds={onSignInWithGoogle || onConnectGoogleAds}
              onOpenApp={onOpenApp}
            />
          </div>
        </div>
      </section>



      {/* 4. THREE SIMPLE STEPS (Human Editorial Layout) */}
      <section id="how-it-works" className="py-20 px-6 border-b border-slate-100">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Straightforward Workflow
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              How AdOptimize works
            </h2>
            <p className="text-sm text-slate-600">
              No developer required, no complex setup scripts. Start in under a minute.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="text-xs font-mono font-bold text-emerald-600">
                01.
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Connect your Google Ads account
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Authorize via official Google OAuth in one click. We never ask for Customer IDs, developer tokens, or passwords. Initial scan completes in 30 seconds.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono font-bold text-emerald-600">
                02.
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Automated continuous auditing
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                AdOptimize inspects search query streams, checks for runaway CPC spikes, and calculates whether daily budgets are constricting your best campaigns.
              </p>
            </div>

            <div className="space-y-3">
              <div className="text-xs font-mono font-bold text-emerald-600">
                03.
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Approve changes with 1 click
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Review plain-English recommendations with exact dollar impacts. Approve changes individually with 100% control, protected by instant 1-click rollback.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CAPABILITIES GRID */}
      <section id="features" className="py-20 px-6 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Core Capabilities
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Built to protect your return on ad spend
            </h2>
            <p className="text-sm text-slate-600">
              Everything needed to manage search queries, protect ad spend, and scale ROAS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Negative Keyword Harvester
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Detects search terms burning budget with zero conversions across both standard Search and Performance Max campaigns. Add negatives in one click to stop immediate bleed.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Guarded Budget Rebalancer
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Identifies high-ROAS campaigns capped by daily budget and simulates moving capital from underperforming campaigns, strictly within safe ±15% adjustment thresholds.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                15-Minute Anomaly Sentinel
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Alerts you immediately when CPC jumps dramatically, conversion pixels fail, or impressions suddenly flatline, catching issues before weekend spend is wasted.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Audit Trail &amp; 1-Click Rollback
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every action taken through AdOptimize is logged in a complete audit history showing exact before/after metrics, with an instant rollback button to restore original settings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. COMPARISONS SECTION (As requested by user) */}
      <section id="comparisons" className="py-20 px-6 border-b border-slate-100">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Platform Comparisons
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                See how AdOptimize compares
              </h2>
              <p className="text-sm text-slate-600">
                Transparent flat pricing, zero complex scripting, and built for modern Google Ads.
              </p>
            </div>

            <Link
              href="/compare"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
            >
              <span>View all comparison pages</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {comparisons.map((c) => (
              <Link
                key={c.slug}
                href={`/compare/${c.slug}`}
                className="group p-6 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all bg-white flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {c.name}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {c.tagline}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-500">
                  {c.highlight}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. TRANSPARENT PRICING */}
      <section id="pricing" className="py-20 px-6 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4 max-w-xl mx-auto">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Transparent Pricing
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Priced for the work, not the size of your budget
            </h2>
            <p className="text-sm text-slate-600">
              No spend penalties. No percentage fees. Switch or cancel anytime.
            </p>

            {/* Billing Switcher */}
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg text-xs font-medium">
              <button
                onClick={() => setBillingInterval('MONTHLY')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  billingInterval === 'MONTHLY'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly billing
              </button>
              <button
                onClick={() => setBillingInterval('ANNUAL')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  billingInterval === 'ANNUAL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annual billing (Save 20%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingTiers.map((tier) => {
              const price = billingInterval === 'ANNUAL' ? tier.priceAnnualMonthly : tier.priceMonthly;
              return (
                <div
                  key={tier.name}
                  className={`bg-white rounded-xl p-6 flex flex-col justify-between border transition-all ${
                    tier.popular
                      ? 'border-slate-900 shadow-md ring-1 ring-slate-900'
                      : 'border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{tier.name}</span>
                      {tier.popular && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          Popular
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                          ${price}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">/ month</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {tier.spendLimit}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {tier.description}
                    </p>

                    <ul className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      {tier.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={onSignInWithGoogle || onConnectGoogleAds}
                      className={`w-full py-2.5 px-4 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        tier.popular
                          ? 'bg-slate-900 hover:bg-black text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      {tier.cta}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. FAQ SECTION */}
      <section id="faq" className="py-20 px-6 border-b border-slate-100">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Common Questions
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Frequently asked questions
            </h2>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left text-sm font-semibold text-slate-900 gap-4 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-2 text-xs text-slate-600 leading-relaxed pr-8">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. BOTTOM ACTION BANNER */}
      <section className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Ready to find wasted spend in your Google Ads account?
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            Connect your account in 30 seconds via official Google OAuth. Run a full search query and budget audit with zero commitment.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onSignInWithGoogle || onConnectGoogleAds}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span>Sign in with Google</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
            <button
              onClick={onOpenApp}
              className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <span>Go to Workspace</span>
            </button>
          </div>

          <div className="pt-2 text-xs text-slate-500">
            Instant Google OAuth connection · 14-day money-back guarantee
          </div>
        </div>
      </section>

      {/* 10. CLEAN FOOTER */}
      <footer className="py-12 px-6 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="cursor-pointer" onClick={onOpenApp}>
              <BrandLogo iconSize={22} iconClassName="w-5 h-5 rounded-lg" textClassName="text-sm font-bold" theme="light" />
            </div>
            <p className="text-slate-500 text-[11px]">
              Continuous search query intelligence and guarded budget protection for Google Ads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-600 font-medium">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <Link href="/compare" className="hover:text-slate-900 transition-colors">Comparisons</Link>
            <Link href="/compare/optmyzr-alternative" className="hover:text-slate-900 transition-colors">vs Optmyzr</Link>
            <Link href="/compare/adspirer-alternative" className="hover:text-slate-900 transition-colors">vs Adspirer</Link>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </div>

          <div className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} AdOptimize. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
