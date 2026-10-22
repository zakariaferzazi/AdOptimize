'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
  Sparkles,
  Bot,
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
  SlidersHorizontal
} from 'lucide-react';
import { GoogleIcon } from '@/components/ui/google-icon';

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
  const [activeTab, setActiveTab] = useState<'queries' | 'budget' | 'anomaly' | 'rollback'>('queries');
  const [appliedDemoAction, setAppliedDemoAction] = useState<boolean>(false);

  const pricingTiers = [
    {
      name: 'Free Forever',
      priceMonthly: 0,
      priceAnnualMonthly: 0,
      description: 'Essential monitoring and anomaly checks for smaller ad budgets.',
      badge: null,
      popular: false,
      spendLimit: 'Up to $1,000 / mo ad spend',
      features: [
        '1 connected Google Ads account',
        'Daily anomaly health scan',
        'Search query leak alerts (top 20)',
        'Standard email notifications',
        'Community support',
      ],
      cta: 'Start Free Forever',
    },
    {
      name: 'Starter',
      priceMonthly: 29,
      priceAnnualMonthly: 23,
      description: 'Complete autonomous optimization for solo operators and media buyers.',
      badge: 'Best Value',
      popular: false,
      spendLimit: 'Up to $5,000 / mo ad spend',
      features: [
        '1 connected Google Ads account',
        'Continuous 1-hour background sync',
        '1-click negative keyword harvester',
        'Daily budget pacing & cap alerts',
        'Immutable audit log with 1-click rollback',
        'Search & Performance Max auditing',
      ],
      cta: 'Start Free Trial',
    },
    {
      name: 'Growth',
      priceMonthly: 69,
      priceAnnualMonthly: 55,
      description: 'Deep optimization and automated capital reallocation for high-ROAS accounts.',
      badge: 'Most Popular',
      popular: true,
      spendLimit: 'Up to $25,000 / mo ad spend',
      features: [
        'Up to 3 Google Ads accounts',
        'Continuous 15-minute sync & telemetry',
        'Dynamic budget shift simulator',
        'Acute CPA surge anomaly sentinel',
        'PMax asset group & zombie SKU diagnostics',
        'Instant 1-click rollback on all actions',
        'Priority email & webhook alerts',
      ],
      cta: 'Get Started Now',
    },
    {
      name: 'Scale',
      priceMonthly: 129,
      priceAnnualMonthly: 99,
      description: 'Maximum agility, multi-account oversight, and priority API throughput.',
      badge: null,
      popular: false,
      spendLimit: 'Up to $100,000 / mo ad spend',
      features: [
        'Up to 10 Google Ads accounts',
        'Real-time continuous sync',
        'Cross-account capital rebalancing',
        'Custom Slack & Discord webhook alerts',
        'Dedicated onboarding engineer',
        'Priority Google Ads API dispatch queue',
      ],
      cta: 'Start Scale Trial',
    },
  ];

  const faqs = [
    {
      q: 'How does AdOptimize connect to my Google Ads account?',
      a: 'AdOptimize connects securely via official Google OAuth 2.0. You simply sign in with your Google account in 1 click. We never ask for your password, developer tokens, or manual account IDs.',
    },
    {
      q: 'Will AdOptimize change bids or budgets without my permission?',
      a: 'Never. AdOptimize operates strictly with human-in-the-loop verification. Every suggested budget reallocation, negative keyword addition, or campaign pause requires your explicit 1-click approval before being dispatched to Google Ads.',
    },
    {
      q: 'How is AdOptimize different from expensive enterprise tools like Optmyzr?',
      a: 'Optmyzr costs $249+/month, charges spend penalty fees, and requires configuring complex multi-screen scripts. AdOptimize starts at $29/mo flat, connects in 30 seconds, and delivers instant, plain-English optimizations with zero setup scripts.',
    },
    {
      q: 'How is AdOptimize different from chat tools like Adspirer?',
      a: 'While Adspirer provides a general conversational interface across several platforms, AdOptimize goes deeper specifically into Google Ads: analyzing SearchStream API v25 query logs, diagnosing Performance Max asset groups, detecting CPA anomalies in real-time, and calculating marginal ROAS.',
    },
    {
      q: 'Can I revert any changes made through AdOptimize?',
      a: 'Yes. Every optimization action is recorded in an immutable audit trail with an instant 1-click Rollback button. Reverting restores previous budgets, bids, or keywords immediately in Google Ads.',
    },
    {
      q: 'Is there a contract or cancellation penalty?',
      a: 'None. All plans are month-to-month and can be cancelled at any time from your settings with zero penalty. Every plan comes with an unconditional 14-day money-back guarantee.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 selection:bg-[#00d67d]/20 selection:text-white font-sans antialiased">
      {/* 1. TOP NAVIGATION */}
      <header className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenApp}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d67d] to-emerald-600 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm shadow-[#00d67d]/20">
              AD
            </div>
            <div className="text-xl font-bold tracking-tight flex items-baseline">
              <span className="text-white">Ad</span>
              <span className="text-[#00d67d]">Optimize</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#demo" className="hover:text-white transition-colors">Live Preview</a>
            <Link href="/compare" className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-bold">
              <span>Comparisons</span>
              <span className="text-[10px] bg-emerald-500/20 text-[#00d67d] px-1.5 py-0.2 rounded border border-emerald-500/30">vs Optmyzr &amp; Adspirer</span>
            </Link>
            <a href="#features" className="hover:text-white transition-colors">Capabilities</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onOpenApp}
                  className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Dashboard</span>
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
                  onClick={onOpenApp}
                  className="px-3.5 py-2 text-slate-200 hover:text-white font-semibold text-xs rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Log In</span>
                </button>

                <button
                  onClick={onSignInWithGoogle || onConnectGoogleAds}
                  className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102"
                >
                  <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Get Started Free</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-24 pb-20 overflow-hidden bg-radial from-[#121927] via-[#090d16] to-[#070910]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-[#00d67d] border border-emerald-500/25 text-xs font-semibold backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-[#00d67d] animate-pulse" />
            <span>24/7 Autonomous Google Ads Copilot &amp; Guardian</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-[1.12]">
            Worry-Free Google Ads Management in the Era of AI &amp; Automation
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Continuous query leak harvesting, 24/7 anomaly defense, and automated capital rebalancing. Stop wasted ad spend and scale ROAS with 1-click human verification.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <button
              onClick={onSignInWithGoogle || onConnectGoogleAds}
              className="px-7 py-3.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 text-sm font-bold rounded-xl shadow-lg shadow-[#00d67d]/20 transition-all flex items-center gap-2.5 cursor-pointer hover:scale-102"
            >
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                <GoogleIcon className="w-3.5 h-3.5" />
              </div>
              <span>Connect Google Ads Free</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={onExploreDemo || onOpenApp}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Explore Live Workspace Demo</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#00d67d]" />
              <span>Google Ads API v17 Certified</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#00d67d]" />
              <span>0% Commission on Ad Spend</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#00d67d]" />
              <span>Zero Silent Bid Changes</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#00d67d]" />
              <span>1-Click Instant Rollback</span>
            </span>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE PRODUCT SHOWCASE (Inspired by Adspirer Agent Cards + Optmyzr Investigator) */}
      <section id="demo" className="py-20 bg-[#0d121c] border-y border-slate-800/80 relative">
        <div className="max-w-5xl mx-auto px-6 space-y-8">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00d67d]">
              Live Engine Simulation
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Patterns &amp; Waste Hiding in Plain Sight
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              See how AdOptimize spots bleeding search queries and surfaces mathematical budget shifts before money is lost.
            </p>
          </div>

          {/* Interactive Navigation Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-[#080b12] rounded-2xl border border-slate-800 max-w-2xl mx-auto">
            <button
              onClick={() => { setActiveTab('queries'); setAppliedDemoAction(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'queries'
                  ? 'bg-[#00d67d] text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Search Query Bleed Stopper
            </button>
            <button
              onClick={() => { setActiveTab('budget'); setAppliedDemoAction(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'budget'
                  ? 'bg-[#00d67d] text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Smart Capital Rebalancer
            </button>
            <button
              onClick={() => { setActiveTab('anomaly'); setAppliedDemoAction(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'anomaly'
                  ? 'bg-[#00d67d] text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              3. CPA Anomaly Sentinel
            </button>
            <button
              onClick={() => { setActiveTab('rollback'); setAppliedDemoAction(false); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'rollback'
                  ? 'bg-[#00d67d] text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              4. 1-Click Rollback Audit
            </button>
          </div>

          {/* Tab 1: Search Query Bleed Stopper */}
          {activeTab === 'queries' && (
            <div className="bg-[#111726] border border-slate-700/80 rounded-3xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-xl">
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold">
                  <span>UNCOVERED: 3 ZERO-CONVERSION QUERIES</span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  Stop Broad Match Algorithms from Burning Your Capital
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Google’s broad match algorithm frequently pairs your high-intent keywords with non-buying search phrases like &ldquo;free download&rdquo;, &ldquo;salary&rdquo;, or &ldquo;login&rdquo;. AdOptimize identifies zero-conversion queries and injects campaign-level negatives in 1 click.
                </p>
                <div className="space-y-2 pt-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Flags queries with 40+ clicks and $0 conversion revenue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Dispatches exact or phrase negative keywords directly to Google Ads</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#080b12] rounded-2xl p-5 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                  <span>Detected Leaks in Last 7 Days</span>
                  <span className="text-rose-400 font-mono">$318.70 Wasted</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 text-rose-300">
                    <span>-[free download crack]</span>
                    <span className="text-slate-400 font-sans text-[11px]">$92.50 spent · 0 conv</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 text-rose-300">
                    <span>-[software developer salary]</span>
                    <span className="text-slate-400 font-sans text-[11px]">$148.00 spent · 0 conv</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5 text-rose-300">
                    <span>-[internship openings 2026]</span>
                    <span className="text-slate-400 font-sans text-[11px]">$78.20 spent · 0 conv</span>
                  </div>
                </div>

                <div className="pt-2">
                  {appliedDemoAction ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-sans text-xs flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        <span>3 Negatives Injected into Google Ads</span>
                      </span>
                      <span className="text-slate-400">Saves ~$1,270 / mo</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAppliedDemoAction(true)}
                      className="w-full py-2.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold font-sans rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Simulate 1-Click Negative Keyword Harvest</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Smart Capital Rebalancer */}
          {activeTab === 'budget' && (
            <div className="bg-[#111726] border border-slate-700/80 rounded-3xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-xl">
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-[#00d67d] border border-emerald-500/20 text-[11px] font-bold">
                  <span>CAPITAL EFFICIENCY: MARGINAL ROAS MODELING</span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  Divert Budget to High-Converting Campaigns
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Avoid letting mediocre campaigns choke out your top performers. AdOptimize models marginal return on ad spend and recommends shifts of ±15% to high-intent campaigns without triggering algorithmic re-learning shocks.
                </p>
                <div className="space-y-2 pt-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Calculates marginal CPA curve across Search &amp; PMax</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Safe budget reallocation caps (maximum ±15% shift per 24h)</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#080b12] rounded-2xl p-5 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                  <span>Rebalancing Recommendation</span>
                  <span className="text-emerald-400 font-mono">+38% Projected ROAS</span>
                </div>

                <div className="space-y-2 font-sans text-xs">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Omnichannel Sales (4.8x ROAS)</div>
                      <div className="text-[11px] text-slate-400">Currently limited by daily budget</div>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold">+$40 / day</span>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Generic Search - Tier 3 (1.1x ROAS)</div>
                      <div className="text-[11px] text-slate-400">High CPA with diminishing returns</div>
                    </div>
                    <span className="text-rose-400 font-mono font-bold">-$40 / day</span>
                  </div>
                </div>

                <div className="pt-2">
                  {appliedDemoAction ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-sans text-xs flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        <span>Daily Budget Reallocated in Google Ads</span>
                      </span>
                      <span className="text-slate-400">+$2,450 / mo Est. Revenue</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAppliedDemoAction(true)}
                      className="w-full py-2.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold font-sans rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Simulate 1-Click Budget Rebalance</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: CPA Anomaly Sentinel */}
          {activeTab === 'anomaly' && (
            <div className="bg-[#111726] border border-slate-700/80 rounded-3xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-xl">
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold">
                  <span>REAL-TIME WATCHDOG: 15-MINUTE TELEMETRY</span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  Catch Sudden CPA Spikes Before Budgets Drain
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Auction surges, broken checkout tags, or runaway bidding algorithms can destroy a week of profit in hours. AdOptimize monitors conversion rates and Cost Per Acquisition continuously, sounding the alarm when metrics deviate.
                </p>
                <div className="space-y-2 pt-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Real-time detection of CPA spikes across Search &amp; PMax</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Cross-references auction insights &amp; impression share loss</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#080b12] rounded-2xl p-5 border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="bg-rose-500/20 text-rose-400 font-bold px-2.5 py-1 rounded-full border border-rose-500/30 text-[11px]">
                    ACUTE CPA SPIKE ALERT
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">Detected 14m ago</span>
                </div>

                <div>
                  <div className="text-base font-bold text-white">Retargeting CPA Spiked to $185.00</div>
                  <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Spent $1,480.00 for only 8 conversions over the past 48 hours (Historical average: $42.00).
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs">
                  <span className="font-bold text-[#00d67d]">Recommended Action: </span>
                  <span className="text-slate-300">Cap daily budget from $150/d to $40/d to halt immediate loss while checkout tracking is checked.</span>
                </div>

                <div className="pt-1">
                  {appliedDemoAction ? (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        <span>Daily Budget Safely Capped</span>
                      </span>
                      <span className="text-slate-400">Preserved $1,210 ad spend</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAppliedDemoAction(true)}
                      className="w-full py-2.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Approve Budget Cap &amp; Protect Spend</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: 1-Click Rollback Audit */}
          {activeTab === 'rollback' && (
            <div className="bg-[#111726] border border-slate-700/80 rounded-3xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center shadow-xl">
              <div className="lg:col-span-6 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold">
                  <span>COMPLETE AUDIT INTEGRITY: 1-CLICK ROLLBACK</span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  Zero Fear of Broken Campaigns or Lost Bids
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Unlike traditional tools where changes are difficult to trace or undo, every single action in AdOptimize has an immutable audit log. Tap &ldquo;Revert&rdquo; at any time to instantly restore previous bids, budgets, and status.
                </p>
                <div className="space-y-2 pt-1 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Tracks timestamp, user action, and previous Google Ads values</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Instant 1-click Google API rollback mechanism</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#080b12] rounded-2xl p-5 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider">
                  <span>Immutable Audit Trail</span>
                  <span className="text-[#00d67d]">Revert Ready</span>
                </div>

                <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2 font-sans">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Campaign Budget Shift</span>
                    <span className="text-[10px] text-slate-400">Today at 10:42 AM</span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono">
                    Omnichannel Sales: $120.00/d → $150.00/d
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[11px] text-slate-400">Previous: $120.00/d</span>
                    <button
                      onClick={() => setAppliedDemoAction(true)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-[#00d67d]" />
                      <span>{appliedDemoAction ? 'Restored to $120.00' : '1-Click Revert'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 font-sans text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>All historic account states are encrypted and stored with rollback hashes.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. HOW IT WORKS IN 3 STEPS (Inspired by Adspirer simplicity) */}
      <section id="how-it-works" className="py-24 max-w-5xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#00d67d]">
            Setup In Minutes
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Three Steps to Full Campaign Protection
          </h2>
          <p className="text-sm text-slate-400">
            No complex scripts to configure. No manual spreadsheet audits every morning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0f1422] rounded-3xl p-7 border border-slate-800 space-y-4 relative">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[#00d67d] font-extrabold text-sm shadow-xs">
              01
            </div>
            <h3 className="text-lg font-bold text-white">1-Click Google OAuth</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect via Google’s official OAuth in under 30 seconds. No manual Customer IDs to memorize, no developer tokens, and zero technical setup required.
            </p>
          </div>

          <div className="bg-[#0f1422] rounded-3xl p-7 border border-slate-800 space-y-4 relative">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[#00d67d] font-extrabold text-sm shadow-xs">
              02
            </div>
            <h3 className="text-lg font-bold text-white">24/7 Background Sentinel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our automated engine monitors your campaigns every 15 minutes. It harvests non-converting query leaks, spots acute CPA spikes, and calculates budget shifts.
            </p>
          </div>

          <div className="bg-[#0f1422] rounded-3xl p-7 border border-slate-800 space-y-4 relative">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[#00d67d] font-extrabold text-sm shadow-xs">
              03
            </div>
            <h3 className="text-lg font-bold text-white">1-Click Human Control</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Review plain-English recommendations with exact query evidence. Approve any optimization with a single click, or undo it immediately with 1-click rollback.
            </p>
          </div>
        </div>
      </section>

      {/* 5. DEDICATED COMPARISON SECTION (PROMINENTLY FEATURED) */}
      <section id="comparisons" className="py-24 bg-[#0d121c] border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-[#00d67d] border border-emerald-500/25 text-xs font-bold uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Head-to-Head Comparisons</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              How AdOptimize Compares
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Why performance marketers choose AdOptimize over expensive agency retainers, complex enterprise scripts, or high-level chatbots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Comparison 1: vs Optmyzr */}
            <div className="bg-[#111726] rounded-3xl p-7 border border-slate-700/80 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-6 group shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#00d67d] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25 uppercase tracking-wider">
                    Alternative to Optmyzr
                  </span>
                  <span className="text-xs text-slate-400 font-mono">From $29/mo vs $249+/mo</span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  AdOptimize vs. Optmyzr
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Optmyzr is an enterprise tool with 50+ dense tables, custom scripting requirements, and expensive tier penalties based on your ad spend. AdOptimize provides instant, automated AI diagnostics with 1-click execution at an accessible flat fee.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Setup Time:</span>
                    <span className="font-semibold text-emerald-400">30 seconds (OAuth) vs Multi-week scripts</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Pricing Model:</span>
                    <span className="font-semibold text-emerald-400">Flat rate vs Ad-spend percentage surcharges</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Interface:</span>
                    <span className="font-semibold text-emerald-400">Distraction-free focus vs 50+ legacy menus</span>
                  </div>
                </div>
              </div>

              <Link
                href="/compare/optmyzr-alternative"
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 border border-white/10 rounded-xl text-xs font-bold text-white group-hover:text-emerald-300 transition-all flex items-center justify-center gap-2"
              >
                <span>Read Full Optmyzr Comparison</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Comparison 2: vs Adspirer */}
            <div className="bg-[#111726] rounded-3xl p-7 border border-slate-700/80 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-6 group shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#00d67d] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25 uppercase tracking-wider">
                    Alternative to Adspirer
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Deep Google Ads Focus</span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  AdOptimize vs. Adspirer
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  While Adspirer offers a broad conversational chat interface across many ad networks, AdOptimize specializes deeply in Google Ads. We pull live SearchStream API v25 query telemetry, audit Performance Max asset groups, and protect your margins.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Google Ads Telemetry:</span>
                    <span className="font-semibold text-emerald-400">Deep SearchStream v25 vs High-level chat</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Negative Keywords:</span>
                    <span className="font-semibold text-emerald-400">Automated query harvesting vs Manual prompts</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Audit Safeguards:</span>
                    <span className="font-semibold text-emerald-400">Immutable 1-click rollback vs Text confirms</span>
                  </div>
                </div>
              </div>

              <Link
                href="/compare/adspirer-alternative"
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 border border-white/10 rounded-xl text-xs font-bold text-white group-hover:text-emerald-300 transition-all flex items-center justify-center gap-2"
              >
                <span>Read Full Adspirer Comparison</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Comparison 3: vs PPC Agencies */}
            <div className="bg-[#111726] rounded-3xl p-7 border border-slate-700/80 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-6 group shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#00d67d] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25 uppercase tracking-wider">
                    Agency Replacement
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Save $3k–$10k / mo</span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  AdOptimize vs. Traditional PPC Agency
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Traditional PPC agencies charge hefty monthly retainers plus a cut of your spend for bi-weekly manual check-ins. AdOptimize monitors your campaigns continuously every 15 minutes, uncovering query bleeds and budget shifts for a tiny fraction of the cost.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Monitoring Frequency:</span>
                    <span className="font-semibold text-emerald-400">Continuous 15-min sync vs Weekly check</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Monthly Retainer:</span>
                    <span className="font-semibold text-emerald-400">Transparent flat rate vs $3,000–$10,000/mo</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Contract Lock-in:</span>
                    <span className="font-semibold text-emerald-400">Cancel anytime vs 6–12 month commitments</span>
                  </div>
                </div>
              </div>

              <Link
                href="/compare/google-ads-agency-vs-software"
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 border border-white/10 rounded-xl text-xs font-bold text-white group-hover:text-emerald-300 transition-all flex items-center justify-center gap-2"
              >
                <span>Read Agency vs Software Breakdown</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Comparison 4: vs WordStream */}
            <div className="bg-[#111726] rounded-3xl p-7 border border-slate-700/80 hover:border-emerald-500/50 transition-all flex flex-col justify-between space-y-6 group shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#00d67d] bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25 uppercase tracking-wider">
                    Modern Alternative
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Built for Smart Bidding</span>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  AdOptimize vs. WordStream
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  WordStream’s 20-minute manual checklists were created before Smart Bidding and Performance Max took over Google Ads. AdOptimize is built specifically for modern algorithmic auctions with acute CPA spike detection and real-time query stream mining.
                </p>

                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Performance Max Support:</span>
                    <span className="font-semibold text-emerald-400">Native PMax auditing vs Limited legacy views</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Anomaly Detection:</span>
                    <span className="font-semibold text-emerald-400">15-minute background watchdog vs Manual checklist</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Budget Optimization:</span>
                    <span className="font-semibold text-emerald-400">Dynamic marginal ROAS vs Basic budget warnings</span>
                  </div>
                </div>
              </div>

              <Link
                href="/compare/wordstream-alternative"
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 border border-white/10 rounded-xl text-xs font-bold text-white group-hover:text-emerald-300 transition-all flex items-center justify-center gap-2"
              >
                <span>Read Full WordStream Comparison</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Directory Link */}
          <div className="text-center pt-4">
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-5 py-2.5 rounded-full border border-emerald-500/30 transition-all cursor-pointer"
            >
              <span>Explore All Comparisons &amp; In-Depth Data Tables</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. TRANSPARENT FLAT PRICING (No spend percentage) */}
      <section id="pricing" className="py-24 max-w-6xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#00d67d]">
            Predictable ROI
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Simple, Flat Pricing. Zero Spend Penalties.
          </h2>
          <p className="text-sm text-slate-400">
            We never take a percentage of your ad spend. Pay a predictable flat monthly rate.
          </p>

          <div className="inline-flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl text-xs font-bold mt-4 border border-slate-800">
            <button
              onClick={() => setBillingInterval('MONTHLY')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                billingInterval === 'MONTHLY' ? 'bg-[#00d67d] text-slate-950 shadow-xs' : 'text-slate-400'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('ANNUAL')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                billingInterval === 'ANNUAL' ? 'bg-[#00d67d] text-slate-950 shadow-xs' : 'text-slate-400'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] text-emerald-950 font-extrabold bg-emerald-300 px-1.5 py-0.5 rounded">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingTiers.map((plan) => {
            const price = billingInterval === 'ANNUAL' ? plan.priceAnnualMonthly : plan.priceMonthly;

            return (
              <div
                key={plan.name}
                className={`rounded-3xl p-6 border transition-all flex flex-col justify-between relative ${
                  plan.popular
                    ? 'border-[#00d67d] bg-[#111726] text-white shadow-2xl scale-[1.02]'
                    : 'border-slate-800 bg-[#0d121c] text-slate-100 hover:border-slate-700'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 right-6 bg-[#00d67d] text-slate-950 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <div className="text-base font-bold text-white">{plan.name}</div>
                  <div className="text-xs mt-1 text-slate-400 leading-relaxed">
                    {plan.description}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono text-white">${price}</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 text-xs font-semibold">
                    <div className="text-[#00d67d]">{plan.spendLimit}</div>
                  </div>

                  <ul className="mt-4 space-y-2.5 text-xs">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#00d67d]" />
                        <span className="text-slate-300 leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={onSignInWithGoogle || onConnectGoogleAds}
                  className={`mt-6 w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    plan.popular
                      ? 'bg-[#00d67d] text-slate-950 hover:bg-[#00c06f]'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{plan.cta}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-20 max-w-3xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#00d67d]">
            Direct Answers
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-[#0f1422] rounded-2xl border border-slate-800 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-5 flex items-center justify-between text-sm font-bold text-white transition-colors hover:bg-slate-800/40 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-[#00d67d]' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 8. FINAL CALL TO ACTION */}
      <section className="py-24 bg-gradient-to-b from-[#0d121c] to-[#070910] text-center border-t border-slate-800">
        <div className="max-w-2xl mx-auto px-6 space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Take Control of Your Google Ads Today
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Link your Google account in 30 seconds via official Google OAuth. Receive immediate anomaly alerts, filter negative keywords, and pace daily budgets with 1-click human verification.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onSignInWithGoogle || onConnectGoogleAds}
              className="px-7 py-3.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-[#00d67d]/20 transition-all flex items-center gap-2.5 cursor-pointer hover:scale-102"
            >
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                <GoogleIcon className="w-3.5 h-3.5" />
              </div>
              <span>Connect Google Ads Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 9. COMPREHENSIVE SAAS FOOTER WITH COMPARISON LINKS */}
      <footer className="bg-[#070910] text-slate-400 pt-16 pb-12 px-6 border-t border-slate-800/80 text-xs">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand info */}
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#00d67d] flex items-center justify-center text-slate-950 font-bold text-xs">
                AD
              </div>
              <div className="text-lg font-bold tracking-tight flex items-baseline">
                <span className="text-white">Ad</span>
                <span className="text-[#00d67d]">Optimize</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
              Google Ads optimization and continuous budget monitoring platform. Eliminate wasted spend, lower CPA, and scale campaign ROAS with human-in-the-loop safeguards.
            </p>
            <div className="text-[11px] text-slate-500 pt-1">
              Complies with Google API Services User Data Policy.
            </div>
          </div>

          {/* Column 1: Comparisons */}
          <div className="space-y-2.5">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Comparisons</div>
            <ul className="space-y-2">
              <li><Link href="/compare" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">Comparison Hub</Link></li>
              <li><Link href="/compare/optmyzr-alternative" className="hover:text-white transition-colors">vs Optmyzr</Link></li>
              <li><Link href="/compare/adspirer-alternative" className="hover:text-white transition-colors">vs Adspirer</Link></li>
              <li><Link href="/compare/google-ads-agency-vs-software" className="hover:text-white transition-colors">vs PPC Agencies</Link></li>
              <li><Link href="/compare/wordstream-alternative" className="hover:text-white transition-colors">vs WordStream</Link></li>
            </ul>
          </div>

          {/* Column 2: Free Tools */}
          <div className="space-y-2.5">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Free Tools</div>
            <ul className="space-y-2">
              <li><Link href="/tools/google-ads-audit" className="hover:text-white transition-colors">Google Ads Audit</Link></li>
              <li><Link href="/tools/negative-keywords-finder" className="hover:text-white transition-colors">Negative Keywords Finder</Link></li>
              <li><Link href="/tools/cpa-calculator" className="hover:text-white transition-colors">CPA Calculator</Link></li>
              <li><Link href="/tools/roas-calculator" className="hover:text-white transition-colors">Target ROAS Calculator</Link></li>
              <li><Link href="/tools/wasted-spend-estimator" className="hover:text-white transition-colors">Wasted Spend Estimator</Link></li>
            </ul>
          </div>

          {/* Column 3: Trust & Legal */}
          <div className="space-y-2.5">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Legal &amp; Trust</div>
            <ul className="space-y-2">
              <li><Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/security" className="hover:text-white transition-colors">Security &amp; Encryption</Link></li>
              <li><Link href="/refund-policy" className="hover:text-white transition-colors">Refund Guarantee</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>© 2026 AdOptimize Inc. All rights reserved.</div>
          <div className="flex items-center gap-5">
            <Link href="/compare" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Comparisons
            </Link>
            <button onClick={onOpenApp} className="text-[#00d67d] font-bold hover:underline cursor-pointer">
              Launch App
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
