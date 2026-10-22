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

interface LandingPageProps {
  onOpenApp: () => void;
  onConnectGoogleAds: () => void;
  onSignInWithGoogle?: () => void;
  onExploreDemo?: () => void;
  user?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  onSignOut?: () => void;
}

export function LandingPage({
  onOpenApp,
  onConnectGoogleAds,
  onSignInWithGoogle,
  onExploreDemo,
  user,
  onSignOut,
}: LandingPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [activeTab, setActiveTab] = useState<'queries' | 'budget' | 'anomaly'>('queries');
  const [blockedQueries, setBlockedQueries] = useState<Record<string, boolean>>({});
  const [appliedBudgetShift, setAppliedBudgetShift] = useState<boolean>(false);
  const [appliedAnomalyAction, setAppliedAnomalyAction] = useState<boolean>(false);

  const sampleQueries = [
    { id: 'q1', query: 'free quickbooks crack download', spend: 84.5, clicks: 32, conversions: 0, roas: 0 },
    { id: 'q2', query: 'customer support phone number 1800', spend: 62.1, clicks: 19, conversions: 0, roas: 0 },
    { id: 'q3', query: 'internship jobs for college students', spend: 47.8, clicks: 28, conversions: 0, roas: 0 },
    { id: 'q4', query: 'login portal reset password error', spend: 39.2, clicks: 14, conversions: 0, roas: 0 },
  ];

  const handleBlockQuery = (id: string) => {
    setBlockedQueries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
        'Daily budget pacing & cap alerts',
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
      tagline: 'Deep Google Ads SearchStream API intelligence, negative keyword mining, and guarded execution.',
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
      a: 'AdOptimize connects securely through Google OAuth 2.0 with official Google Ads API verification. You simply click Connect and approve access in the official Google popup. We never ask for passwords, credit cards, or developer tokens.',
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
      a: 'While general conversational tools answer broad questions across multiple platforms, AdOptimize is deeply specialized for Google Ads: analyzing SearchStream API v25 query logs, diagnosing Performance Max asset groups, detecting CPA anomalies in real-time, and calculating marginal ROAS.',
    },
    {
      q: 'Is there a contract or cancellation penalty?',
      a: 'None. All subscriptions are month-to-month and can be cancelled at any time with a single click. Every plan includes an unconditional 14-day money-back guarantee.',
    },
  ];

  const blockedCount = Object.values(blockedQueries).filter(Boolean).length;
  const blockedSavings = Object.entries(blockedQueries)
    .filter(([_, blocked]) => blocked)
    .reduce((sum, [id]) => {
      const q = sampleQueries.find((item) => item.id === id);
      return sum + (q ? q.spend : 0);
    }, 0);

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-emerald-100 selection:text-slate-900 font-sans antialiased">
      {/* 1. TOP NAVIGATION */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenApp}>
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs shadow-xs">
              AD
            </div>
            <div className="text-xl font-bold tracking-tight text-slate-900 flex items-baseline">
              <span>Ad</span>
              <span className="text-emerald-600">Optimize</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#simulator" className="hover:text-slate-900 transition-colors">AI Simulation</a>
            <a href="#demo" className="hover:text-slate-900 transition-colors">Live Audit</a>
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
                  <span>Connect Google Ads</span>
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
              <span>Connect Google Ads</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={onExploreDemo || onOpenApp}
              className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Explore Live Demo</span>
            </button>
          </div>

          {/* Quiet Unboxed Proof Line */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-xs text-slate-500 font-normal">
            <span>No credit card required</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Read-only audit mode</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Connect in 30 seconds</span>
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

      {/* 3. INTERACTIVE PRODUCT PREVIEW (Inspired by clean SaaS desktop UI) */}
      <section id="demo" className="py-16 px-6 bg-slate-50/50">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
                Interactive Preview
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                See exactly how AdOptimize audits your account
              </h2>
            </div>
            <div className="text-xs text-slate-500">
              Interactive simulator · Click actions below to test
            </div>
          </div>

          {/* Preview Window Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 overflow-hidden">
            {/* Window Topbar */}
            <div className="bg-slate-100/70 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                <span className="ml-2 text-xs font-medium text-slate-600">
                  Google Ads Audit · Primary Account
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Last checked 4 minutes ago
              </div>
            </div>

            {/* Quick Metrics Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100 bg-white p-4 gap-4 text-left">
              <div>
                <div className="text-xs text-slate-500 font-medium">Audited Queries</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">482</div>
                <div className="text-[11px] text-slate-400">Search &amp; PMax streams</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Waste Flagged</div>
                <div className="text-xl font-bold text-rose-600 mt-0.5 tabular-nums">
                  ${(233.6 - blockedSavings).toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400">{sampleQueries.length - blockedCount} bleed queries remaining</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Blocked Savings</div>
                <div className="text-xl font-bold text-emerald-600 mt-0.5 tabular-nums">
                  +${blockedSavings.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400">{blockedCount} negative keywords staged</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Protection Status</div>
                <div className="text-xl font-bold text-slate-900 mt-0.5">Active</div>
                <div className="text-[11px] text-slate-400">100% human verification</div>
              </div>
            </div>

            {/* Segmented Controls (Tab Switcher) */}
            <div className="border-b border-slate-200 px-4 pt-3 flex items-center gap-2 bg-slate-50/60 overflow-x-auto">
              <button
                onClick={() => setActiveTab('queries')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'queries'
                    ? 'border-emerald-600 text-slate-900 bg-white rounded-t-md'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Negative Keyword Harvester
              </button>
              <button
                onClick={() => setActiveTab('budget')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'budget'
                    ? 'border-emerald-600 text-slate-900 bg-white rounded-t-md'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Guarded Budget Shift
              </button>
              <button
                onClick={() => setActiveTab('anomaly')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'anomaly'
                    ? 'border-emerald-600 text-slate-900 bg-white rounded-t-md'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                15-Minute Anomaly Sentinel
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5">
              {activeTab === 'queries' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                    <span>
                      Queries triggering ads with high spend and 0 conversions. Click to block as negative keywords:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {blockedCount} of {sampleQueries.length} blocked
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Search Query</th>
                          <th className="py-2.5 px-3 text-right">Clicks</th>
                          <th className="py-2.5 px-3 text-right">Spend</th>
                          <th className="py-2.5 px-3 text-right">Conv.</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sampleQueries.map((item) => {
                          const isBlocked = blockedQueries[item.id];
                          return (
                            <tr key={item.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-3 font-medium text-slate-900 flex items-center gap-2">
                                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{item.query}</span>
                              </td>
                              <td className="py-3 px-3 text-right tabular-nums text-slate-600">
                                {item.clicks}
                              </td>
                              <td className="py-3 px-3 text-right tabular-nums font-semibold text-slate-900">
                                ${item.spend.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-right tabular-nums text-slate-400">
                                {item.conversions}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <button
                                  onClick={() => handleBlockQuery(item.id)}
                                  className={`px-3 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                                    isBlocked
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-900 hover:bg-black text-white'
                                  }`}
                                >
                                  {isBlocked ? '✓ Staged Negative' : 'Block Query'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {blockedCount > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          {blockedCount} negative keywords ready to sync. Estimated monthly saving: <strong>${(blockedSavings * 4).toFixed(0)} / mo</strong>.
                        </span>
                      </div>
                      <span className="font-semibold text-emerald-800">1-click sync ready</span>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'budget' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-600">
                    Mathematical budget rebalancing simulator. Detects campaigns constrained by daily budgets versus campaigns wasting budget:
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-rose-200 bg-rose-50/30 rounded-lg space-y-2">
                      <div className="text-xs font-semibold text-rose-800">
                        Underperforming Source Campaign
                      </div>
                      <div className="font-semibold text-slate-900 text-sm">
                        Display - Run of Network (Broad)
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                        <span>Current Budget: $50.00 / day</span>
                        <span className="text-rose-700 font-semibold">ROAS: 0.9x (CPA $58)</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Recommendation: Trim -$25.00/day to prevent budget waste.
                      </div>
                    </div>

                    <div className="p-4 border border-emerald-200 bg-emerald-50/30 rounded-lg space-y-2">
                      <div className="text-xs font-semibold text-emerald-800">
                        High-Converting Target Campaign
                      </div>
                      <div className="font-semibold text-slate-900 text-sm">
                        Search - High Intent Core Buyers
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                        <span>Current Budget: $40.00 / day</span>
                        <span className="text-emerald-700 font-semibold">ROAS: 4.8x (CPA $14)</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Recommendation: Add +$25.00/day (currently losing 28% impression share to budget).
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-900">
                        Proposed Action: Shift $25.00/day from Display to High Intent Core
                      </div>
                      <div className="text-xs text-slate-500">
                        Projected monthly impact: +$1,120 revenue with zero change in total monthly ad budget.
                      </div>
                    </div>

                    <button
                      onClick={() => setAppliedBudgetShift(!appliedBudgetShift)}
                      className={`px-4 py-2 rounded text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                        appliedBudgetShift
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 hover:bg-black text-white'
                      }`}
                    >
                      {appliedBudgetShift ? '✓ Shift Approved & Logged' : 'Approve Budget Shift'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'anomaly' && (
                <div className="space-y-4">
                  <div className="text-xs text-slate-600">
                    Real-time monitoring checks your campaigns every 15 minutes for auction spikes, broken tracking, and sudden cost surges:
                  </div>

                  <div className="p-4 border border-amber-200 bg-amber-50/40 rounded-lg space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-bold text-amber-900">
                          Acute CPA Surge Detected (Past 4 Hours)
                        </span>
                      </div>
                      <span className="text-[11px] text-amber-800 font-medium">15-min check</span>
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed">
                      Campaign <strong>Search - Competitor Comparison</strong> recorded a +64% increase in Cost Per Acquisition ($62.40 vs 14-day baseline of $38.00). Google Smart Bidding entered a high-CPC auction loop on 2 generic keywords.
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/60">
                      <div className="text-[11px] text-slate-500">
                        Suggested safeguard: Apply temporary ±15% bid ceiling to stabilize auction.
                      </div>
                      <button
                        onClick={() => setAppliedAnomalyAction(!appliedAnomalyAction)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                          appliedAnomalyAction
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 hover:bg-black text-white'
                        }`}
                      >
                        {appliedAnomalyAction ? '✓ Safeguard Cap Applied' : 'Apply Guarded Ceiling'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
              <span>Connect Google Ads</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
            <button
              onClick={onExploreDemo || onOpenApp}
              className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Explore Live Demo
            </button>
          </div>

          <div className="pt-2 text-xs text-slate-500">
            Read-only audit mode by default · No credit card required · 14-day guarantee
          </div>
        </div>
      </section>

      {/* 10. CLEAN FOOTER */}
      <footer className="py-12 px-6 bg-white border-t border-slate-200 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <div className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px]">
                AD
              </div>
              <span>AdOptimize</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Continuous search query intelligence and guarded budget protection for Google Ads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-slate-600 font-medium">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#demo" className="hover:text-slate-900 transition-colors">Preview</a>
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
