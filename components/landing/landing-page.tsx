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
  Sparkles,
  Bot,
  AlertTriangle,
  RotateCcw,
  BarChart3,
  Sliders,
  Clock,
  Key,
  Shield,
  Check
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
  const [activeModule, setActiveModule] = useState<'negatives' | 'budget' | 'anomaly' | 'quality'>('budget');

  const faqs = [
    {
      q: 'How does AdOptimize connect to my Google Ads account?',
      a: 'AdOptimize connects securely via official Google OAuth 2.0 with the read/write advertising management scope. All tokens remain strictly server-side in encrypted environments with AES-256. We never access your Google password.',
    },
    {
      q: 'Will AdOptimize change bids or budgets without my permission?',
      a: 'Never. AdOptimize operates strictly with human-in-the-loop verification. Every suggested budget shift, negative keyword addition, or campaign pause requires your explicit 1-click confirmation before anything is dispatched to Google Ads.',
    },
    {
      q: 'How is AdOptimize different from traditional PPC agencies?',
      a: 'Traditional PPC agencies charge $3,000–$10,000/month for bi-weekly manual check-ins. AdOptimize monitors your campaigns continuously every 15 minutes, surfacing exact query leaks and mathematical capital reallocations at a transparent flat rate.',
    },
    {
      q: 'What Google Ads campaign types are supported?',
      a: 'AdOptimize fully supports Google Search campaigns, Performance Max (PMax), Display remarketing, and Google Shopping campaigns.',
    },
    {
      q: 'Can I revert any changes made through AdOptimize?',
      a: 'Yes. Every optimization action is logged with an immutable audit trail and includes an instant 1-click Rollback button to restore previous bids, budgets, or keywords immediately.',
    },
    {
      q: 'Is there a contract or cancellation penalty?',
      a: 'None. All plans are month-to-month and can be cancelled at any time from your settings with zero penalty. Every plan is backed by an unconditional 14-day money-back guarantee.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f14] text-slate-100 selection:bg-[#00d67d]/20 selection:text-white font-sans antialiased">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#0b0f14]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-4">
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
            <a href="#features" className="hover:text-white transition-colors">Platform</a>
            <a href="#engine" className="hover:text-white transition-colors">Architecture</a>
            <Link href="/tools" className="hover:text-white transition-colors">Tools</Link>
            <Link href="/solutions" className="hover:text-white transition-colors">Solutions</Link>
            <Link href="/compare" className="hover:text-white transition-colors">Comparisons</Link>
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
                  onClick={onSignInWithGoogle}
                  className="px-3.5 py-2 text-slate-200 hover:text-white font-semibold text-xs rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Log In</span>
                </button>

                <button
                  onClick={onSignInWithGoogle}
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

      {/* HERO SECTION: Minimal, High-Impact, High-Search-Volume Keywords */}
      <section className="relative pt-24 pb-20 overflow-hidden bg-radial from-[#121924] via-[#0b0f14] to-[#080b0e]">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-[#00d67d] border border-emerald-500/25 text-xs font-semibold backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-[#00d67d] animate-pulse" />
            <span>Continuous Google Ads Optimization & Budget Pacing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-[1.14]">
            Google Ads Optimization Software to Lower CPA & Scale ROAS
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Continuous budget optimization, automated negative keyword mining, and acute anomaly alerts for high-growth advertisers. Stop wasted ad spend with 1-click human verification.
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
              <span>Connect Google Ads Account</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            <button
              onClick={onOpenApp}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl border border-white/10 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Explore Live Workspace Demo</span>
            </button>
          </div>

          {/* Micro trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#00d67d]" />
              <span>Google Ads Reports API v17</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#00d67d]" />
              <span>Zero Silent Bid Changes</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#00d67d]" />
              <span>14-Day Money-Back Guarantee</span>
            </span>
          </div>
        </div>
      </section>

      {/* DEDICATED HIGH-IMPACT SECTION: Engineered for Precision & Capital Preservation */}
      <section id="engine" className="py-24 bg-[#0d1219] border-y border-slate-800/80 relative overflow-hidden">
        {/* Ambient atmospheric glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10 space-y-12">
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-[#00d67d] border border-emerald-500/25 text-xs font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              <span>Capital Safeguard Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Engineered for Precision & Capital Preservation
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every telemetry metric, budget reallocation proposal, and negative query audit is governed by cryptographic isolation and human-in-the-loop verification.
            </p>
          </div>

          {/* 4 Pillar Grid - Ultra-Premium Dark Glass UI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Pillar 1: 15 Min */}
            <div className="group relative rounded-3xl p-6 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-emerald-500/50 shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 flex items-center justify-center shadow-inner">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                  Continuous
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-mono font-extrabold text-white tracking-tight flex items-baseline gap-1">
                <span className="text-[#00d67d]">15</span>
                <span className="text-base font-sans font-bold text-slate-400">Min</span>
              </div>

              <div className="text-sm font-bold text-white mt-2">
                Continuous sync frequency
              </div>

              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Google Ads Reports API v17 stream detects spend bleeds, CTR shifts, and auction spikes in real-time — not twice a week.
              </p>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>24/7 Background Telemetry</span>
              </div>
            </div>

            {/* Pillar 2: 1-Click */}
            <div className="group relative rounded-3xl p-6 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-cyan-500/50 shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl group-hover:bg-cyan-500/25 transition-all" />

              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase">
                  Guarded
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-mono font-extrabold text-white tracking-tight flex items-baseline gap-1">
                <span className="text-cyan-400">1</span>
                <span className="text-base font-sans font-bold text-slate-400">-Click</span>
              </div>

              <div className="text-sm font-bold text-white mt-2">
                Human verification required
              </div>

              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Zero silent changes to bids or budgets. Every reallocation and negative keyword proposal requires your explicit click.
              </p>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-cyan-400 font-semibold">
                <Check className="w-3.5 h-3.5" />
                <span>100% User Authority</span>
              </div>
            </div>

            {/* Pillar 3: 100% */}
            <div className="group relative rounded-3xl p-6 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-purple-500/50 shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl group-hover:bg-purple-500/25 transition-all" />

              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-inner">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold uppercase">
                  Audit-Proof
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-mono font-extrabold text-white tracking-tight flex items-baseline gap-1">
                <span className="text-purple-400">100</span>
                <span className="text-base font-sans font-bold text-slate-400">%</span>
              </div>

              <div className="text-sm font-bold text-white mt-2">
                Audit trail with instant rollback
              </div>

              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Every optimization dispatched is permanently recorded in an immutable ledger with a 1-click Revert button to restore state.
              </p>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-purple-400 font-semibold">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Instant 1-Click Undo</span>
              </div>
            </div>

            {/* Pillar 4: AES-256 */}
            <div className="group relative rounded-3xl p-6 bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-amber-500/50 shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl group-hover:bg-amber-500/25 transition-all" />

              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
                  <Lock className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                  Encrypted
                </span>
              </div>

              <div className="text-3xl sm:text-4xl font-mono font-extrabold text-white tracking-tight flex items-baseline gap-1">
                <span className="text-amber-400">AES</span>
                <span className="text-base font-sans font-bold text-slate-400">-256</span>
              </div>

              <div className="text-sm font-bold text-white mt-2">
                Google OAuth token isolation
              </div>

              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Credentials remain locked in server environment variables. Zero browser token leakage; zero third-party LLM training.
              </p>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero Client Credential Leakage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE PLATFORM CAPABILITIES: High-Volume Search Keywords */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-[#00d67d] border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Google Ads Management Software</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Stop Wasted Ad Spend & Scale Google Ads ROAS
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Eliminate non-converting search queries, auto-balance budgets across Search and Performance Max, and receive real-time anomaly alerts when auction metrics shift.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-900/80 rounded-2xl max-w-3xl mx-auto border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveModule('budget')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeModule === 'budget'
                ? 'bg-[#00d67d] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Google Ads Budget Optimizer</span>
          </button>

          <button
            onClick={() => setActiveModule('negatives')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeModule === 'negatives'
                ? 'bg-[#00d67d] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Negative Keywords Tool</span>
          </button>

          <button
            onClick={() => setActiveModule('anomaly')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeModule === 'anomaly'
                ? 'bg-[#00d67d] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Lower CPA & Anomaly Alerts</span>
          </button>

          <button
            onClick={() => setActiveModule('quality')}
            className={`px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeModule === 'quality'
                ? 'bg-[#00d67d] text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Quality Score & PMax Audit</span>
          </button>
        </div>

        {/* Feature Display Canvas */}
        <div className="bg-[#0e141d] rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-2xl">
          {activeModule === 'budget' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-[#00d67d] border border-emerald-500/20 text-[11px] font-bold">
                  <span>TARGET HIGH-VOLUME KEYWORD: GOOGLE ADS BUDGET OPTIMIZER</span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  Reallocate Daily Budgets to High-ROAS Winning Campaigns
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Stop starving high-converting campaigns that reach daily caps early in the afternoon. AdOptimize models the financial outcome of reallocating capital from underperforming ad groups to your 4.7x ROAS winners, enforcing strict ±15% safety boundaries.
                </p>
                <div className="space-y-2 pt-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Recovers impression share lost to daily budget limits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Cross-campaign rebalancing across Search, PMax, and Shopping</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#090d12] rounded-2xl p-6 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Automated Budget Reallocation Proposal
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-slate-300 font-sans font-medium">Display Retargeting:</span>
                  <span className="text-rose-400 font-bold">$75/day → $25/day (-$50/d)</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-slate-300 font-sans font-medium">Search Core Conversions:</span>
                  <span className="text-emerald-400 font-bold">$160/day → $210/day (+$50/d)</span>
                </div>
                <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                  <span className="text-slate-200 font-sans font-semibold">Projected Net Monthly Margin:</span>
                  <span className="text-[#00d67d] font-bold text-sm">+$4,230.00 / month</span>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'negatives' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-[#00d67d] border border-emerald-500/20 text-[11px] font-bold">
                  <span>TARGET HIGH-VOLUME KEYWORD: NEGATIVE KEYWORDS TOOL</span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  Stop Non-Converting Queries from Burning Ad Spend
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Google’s broad match algorithm frequently matches your ads with irrelevant searches like &ldquo;free download&rdquo;, &ldquo;salary&rdquo;, or &ldquo;login&rdquo;. AdOptimize identifies zero-conversion queries and injects campaign-level negatives in 1 click.
                </p>
                <div className="space-y-2 pt-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Flags queries with 40+ clicks and zero conversion value</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Dispatches exact or phrase negative keywords directly to Google Ads</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#090d12] rounded-2xl p-6 border border-slate-800 space-y-2.5 font-mono text-xs">
                <div className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Detected Search Query Leaks
                </div>
                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10 text-rose-300">
                  <span>-[free download crack]</span>
                  <span className="text-slate-400 font-sans text-[11px]">$92.50 spent · 0 conversions</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10 text-rose-300">
                  <span>-[software developer salary]</span>
                  <span className="text-slate-400 font-sans text-[11px]">$148.00 spent · 0 conversions</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/10 text-rose-300">
                  <span>-[internship openings 2026]</span>
                  <span className="text-slate-400 font-sans text-[11px]">$78.20 spent · 0 conversions</span>
                </div>
                <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-emerald-400 font-sans text-xs flex items-center justify-between font-bold">
                  <span>Total Capital Saved per Month:</span>
                  <span>$1,270.00 / mo</span>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'anomaly' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold">
                  <span>TARGET HIGH-VOLUME KEYWORD: LOWER GOOGLE ADS CPA</span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  Lower Cost Per Acquisition & Prevent Acute CPA Spikes
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  AdOptimize continuously audits your Google Search and Performance Max campaigns for sudden cost per conversion inflation. Catch unexpected auction surges or broken conversion tags before your monthly budget is drained.
                </p>
                <div className="space-y-2 pt-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Real-time detection of CPA spikes across Search & PMax</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Cross-references auction insights and impression share loss</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#090d12] rounded-2xl p-6 border border-slate-800 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="bg-rose-500/20 text-rose-400 font-bold px-2.5 py-1 rounded-full border border-rose-500/30 text-[11px]">
                    ACUTE CPA SPIKE ALERT
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">Reports API v17</span>
                </div>
                <div>
                  <div className="text-base font-bold text-white">Retargeting CPA Spiked to $210.00</div>
                  <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Spent $1,890.00 for only 9 conversions over the past 7 days (ROAS dropped to 0.86).
                  </div>
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs">
                  <span className="font-bold text-[#00d67d]">Recommended Action: </span>
                  <span className="text-slate-300">Cap daily budget from $75/d to $25/d. Prevents $1,500/month in capital loss.</span>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'quality' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-bold">
                  <span>TARGET HIGH-VOLUME KEYWORD: GOOGLE ADS QUALITY SCORE</span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  Lower CPC Auction Costs with Quality Diagnostics
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Keywords with low Quality Scores suffer auction penalties of up to +67% higher Cost Per Click. AdOptimize pinpoints whether Expected CTR, Ad Relevance, or Landing Page Experience is dragging your score down.
                </p>
                <div className="space-y-2 pt-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Identifies sub-factors causing Quality Score penalties</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00d67d] shrink-0" />
                    <span>Unlocks up to 50% discount on average auction CPC</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#090d12] rounded-2xl p-6 border border-slate-800 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">Keyword Quality Score: 9/10</span>
                  <span className="text-[#00d67d] font-bold font-mono">-33% CPC Discount</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00d67d] rounded-full w-[90%]" />
                </div>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-slate-300 leading-relaxed">
                  Above-average Expected CTR and Landing Page Experience guarantees cheaper auction bids against competitors.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* WHY CHOOSE ADOPTIMIZE: Minimal Comparison */}
      <section className="py-20 bg-[#090d12] border-y border-slate-800/80">
        <div className="max-w-5xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00d67d]">
              Defensive Guardrails
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              Why Performance Marketers Choose AdOptimize
            </h2>
            <p className="text-sm text-slate-400">
              Complete transparency, mathematically grounded proposals, and zero silent modifications.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 bg-[#0f141d] rounded-3xl border border-slate-800 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-[#00d67d] flex items-center justify-center font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Zero Silent Changes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                AdOptimize never alters bids or budgets without your click. You maintain complete control over capital.
              </p>
            </div>

            <div className="p-6 bg-[#0f141d] rounded-3xl border border-slate-800 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-[#00d67d] flex items-center justify-center font-bold text-xs">
                <RotateCcw className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">1-Click Instant Rollback</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every action is saved in an audit log with an instant 1-click Revert button to restore previous values.
              </p>
            </div>

            <div className="p-6 bg-[#0f141d] rounded-3xl border border-slate-800 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-[#00d67d] flex items-center justify-center font-bold text-xs">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Bank-Grade Isolation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Google OAuth tokens are encrypted at rest with AES-256 on secure servers. Your data is never sold.
              </p>
            </div>

            <div className="p-6 bg-[#0f141d] rounded-3xl border border-slate-800 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-[#00d67d] flex items-center justify-center font-bold text-xs">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Continuous 15-Min Sync</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unlike agencies that check accounts twice a week, AdOptimize telemetry runs around the clock.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING SECTION: Clean & Transparent */}
      <section id="pricing" className="py-24 max-w-5xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#00d67d]">
            Predictable ROI
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Transparent Pricing Built for Growing Accounts
          </h2>
          <p className="text-sm text-slate-400">
            All plans include continuous monitoring, anomaly alerts, and a 14-day money-back guarantee.
          </p>

          <div className="inline-flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl text-xs font-bold mt-4 border border-slate-800">
            <button
              onClick={() => setBillingInterval('MONTHLY')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                billingInterval === 'MONTHLY' ? 'bg-[#00d67d] text-slate-950 shadow-xs' : 'text-slate-400'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('ANNUAL')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                billingInterval === 'ANNUAL' ? 'bg-[#00d67d] text-slate-950 shadow-xs' : 'text-slate-400'
              }`}
            >
              <span>Annual</span>
              <span className="text-[10px] text-emerald-950 font-extrabold bg-emerald-300 px-1.5 py-0.5 rounded">
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
                className={`rounded-3xl p-7 border transition-all flex flex-col justify-between relative ${
                  plan.popular
                    ? 'border-[#00d67d] bg-[#101722] text-white shadow-2xl scale-[1.02]'
                    : 'border-slate-800 bg-[#0c1017] text-slate-100'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 right-6 bg-[#00d67d] text-slate-950 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {plan.badge}
                  </span>
                )}

                <div>
                  <div className="text-base font-bold text-white">{plan.name}</div>
                  <div className="text-xs mt-1 text-slate-400">
                    {plan.description}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono text-white">${price}</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 text-xs font-semibold space-y-1">
                    <div className="text-slate-300">{plan.accountLimit}</div>
                    <div className="text-[#00d67d]">{plan.spendLimit}</div>
                  </div>

                  <ul className="mt-4 space-y-2.5 text-xs">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#00d67d]" />
                        <span className="text-slate-300">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={onSignInWithGoogle || onConnectGoogleAds}
                  className={`mt-8 w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    plan.popular
                      ? 'bg-[#00d67d] text-slate-950 hover:bg-[#00c06f]'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Get Started</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* MINIMAL FAQ SECTION */}
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
              className="bg-[#0f141d] rounded-2xl border border-slate-800 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-5 flex items-center justify-between text-sm font-bold text-white transition-colors hover:bg-slate-800/50 cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-[#00d67d]' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="py-24 bg-gradient-to-b from-[#0b0f14] to-[#070a0d] text-center border-t border-slate-800">
        <div className="max-w-2xl mx-auto px-6 space-y-5">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Take Control of Your Google Ads Performance
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Connect your Customer ID in seconds. Receive immediate anomaly alerts, filter negative keywords, and pace daily budgets with 1-click human verification.
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

      {/* COMPREHENSIVE SAAS FOOTER */}
      <footer className="bg-[#070a0d] text-slate-400 pt-16 pb-12 px-6 border-t border-slate-800/80 text-xs">
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
              Google Ads optimization and continuous budget monitoring platform. Eliminate wasted spend, lower CPA, and scale campaign ROAS.
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
