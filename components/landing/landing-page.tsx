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
  DollarSign
} from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/mock-data';

interface LandingPageProps {
  onOpenApp: () => void;
  onConnectGoogleAds: () => void;
}

export function LandingPage({ onOpenApp, onConnectGoogleAds }: LandingPageProps) {
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
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 selection:bg-[#00d67d]/20 selection:text-slate-900">
      {/* Navigation Top Bar (Following Top Bar Contract: Brand — 4-6 Links — Action) */}
      <header className="sticky top-0 z-40 bg-[#0d1117]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={onOpenApp}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d67d] to-[#059669] flex items-center justify-center text-slate-950 font-bold shadow-md shadow-[#00d67d]/20">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-xl font-bold tracking-tight text-white flex items-baseline">
              <span>.adopt</span>
              <span className="text-[#00d67d]">imize</span>
              <span className="text-[#00d67d] ml-0.5">✦</span>
            </div>
          </div>

          {/* Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#monitoring" className="hover:text-white transition-colors">Monitoring</a>
            <a href="#ai-analyst" className="hover:text-white transition-colors">AI Analysis</a>
            <a href="#optimizer" className="hover:text-white transition-colors">Budget Optimizer</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Primary Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenApp}
              className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-[#00d67d]/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Launch Live SaaS App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: HERO */}
      <section className="relative pt-20 pb-24 overflow-hidden bg-gradient-to-b from-[#0d1117] via-slate-950 to-[#0d1117] text-white">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-[#00d67d] border border-emerald-500/30 text-xs font-semibold animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Google Ads Intelligence & Capital Rebalancing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] text-balance">
            Your AI Marketing Manager for Google Ads
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Find wasted spend, understand what’s hurting your campaigns, and continuously optimize your advertising performance — automatically and safely.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={onConnectGoogleAds}
              className="px-6 py-3.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 text-sm font-bold rounded-2xl shadow-xl shadow-[#00d67d]/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
            >
              <span>Connect Google Ads</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenApp}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-2xl border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Explore Interactive Demo</span>
              <Sparkles className="w-4 h-4 text-[#00d67d]" />
            </button>
          </div>

          {/* Trust strip */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00d67d]" />
              <span>Official Google Ads API</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#00d67d]" />
              <span>Zero silent changes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#00d67d]" />
              <span>Continuous 15-min sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: CORE WORKFLOW (CONNECT -> ANALYZE -> DETECT -> EXPLAIN -> RECOMMEND -> OPTIMIZE) */}
      <section id="how-it-works" className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center space-y-2 mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            The Continuous Optimization Flywheel
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            How AdOptimize Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Not another vanity dashboard. A 6-stage closed-loop performance system that works 24/7.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
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
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-44 hover:border-emerald-300 transition-colors"
            >
              <div className="font-mono text-xs font-extrabold text-[#00d67d] bg-slate-950 w-7 h-7 rounded-xl flex items-center justify-center">
                {item.step}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {item.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3 & 4: AI MARKETING ANALYST & ROOT CAUSE */}
      <section id="ai-analyst" className="py-16 bg-white border-y border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Never Fabricated Numbers
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              AI That Explains <span className="underline decoration-[#00d67d]">Why</span> Performance Dropped
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              When your CPA spikes or conversions slow down, Google Ads leaves you guessing. AdOptimize cross-analyzes search term logs, keyword Quality Scores, and auction pressure to deliver an exact diagnostic card:
            </p>

            <ul className="space-y-2.5 text-xs text-slate-700 pt-2 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Problem</strong>: Pinpoints the specific campaign, ad group, or match type.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Evidence</strong>: Cites actual before/after metrics ($85 CPA → $210 CPA).</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Expected Impact</strong>: Calculated monthly savings and conversion gains.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Confidence Score</strong>: Rigorous statistical backing before any proposal.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Card Mockup */}
          <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-400 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                CRITICAL ISSUE DETECTED
              </span>
              <span className="font-mono text-[#00d67d] font-bold">96% Confidence</span>
            </div>

            <div>
              <div className="text-sm font-bold text-white">
                Retargeting CPA Spiked +145% to $210.00 (ROAS: 0.86)
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Display campaign consumed $1,890 over 7 days for only 9 conversions. Broad non-converting app placements are draining $50/day.
              </p>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-xs">
              <div className="text-[11px] font-bold text-[#00d67d] uppercase tracking-wider">
                Recommended Action:
              </div>
              <div className="text-slate-200 mt-0.5 font-medium">
                Cut daily budget from $75/day to $25/day and reallocate to Search High Intent.
              </div>
            </div>

            <button
              onClick={onOpenApp}
              className="w-full py-2.5 bg-[#00d67d] text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01]"
            >
              <span>View in Live Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 5: BUDGET OPTIMIZER */}
      <section id="optimizer" className="py-20 max-w-6xl mx-auto px-6">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Capital Rebalancing
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Put Your Budget Where It Converts
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Stop giving equal budgets to unequal campaigns. Automatically identify high-ROAS winners with unmet impression share.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">
              Before / After Reallocation Engine
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              If Campaign A generates 4.7x ROAS but hits its daily budget cap by 3 PM, and Campaign B generates 0.8x ROAS, AdOptimize simulates the exact financial outcome of transferring capital.
            </p>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900 font-medium">
              Average customer identifies <strong>$1,860/month</strong> in recoverable ad spend during the first 14 days.
            </div>
            <button
              onClick={onOpenApp}
              className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Try Budget Optimizer Simulator</span>
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#00d67d]" />
            </button>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <span className="font-sans font-semibold text-slate-700">Display Retargeting:</span>
              <span className="text-rose-600 font-bold">$75/d → $25/d (-$50/d)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
              <span className="font-sans font-semibold text-slate-700">Search Core SaaS:</span>
              <span className="text-emerald-700 font-bold">$160/d → $210/d (+$50/d)</span>
            </div>
            <div className="p-3 bg-slate-950 text-white rounded-xl flex items-center justify-between">
              <span className="font-sans text-xs text-slate-300">Projected Margin Delta:</span>
              <span className="text-[#00d67d] font-bold text-sm">+$4,230.00 / month</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: PRICING */}
      <section id="pricing" className="py-20 bg-white border-t border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Simple, Transparent Pricing
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Choose the Plan That Fits Your Scale
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              All plans include continuous Google Ads monitoring and grounded AI analysis.
            </p>

            {/* Interval Toggle */}
            <div className="inline-flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold mt-4">
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
                    <div className="text-sm font-bold">{plan.name}</div>
                    <div className={`text-xs mt-1 ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>
                      {plan.description}
                    </div>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono">${price}</span>
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

                    <ul className="mt-4 space-y-2 text-xs">
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
                    onClick={onConnectGoogleAds}
                    className={`mt-8 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      plan.popular
                        ? 'bg-[#00d67d] text-slate-950 hover:bg-[#00c06f]'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    Start with {plan.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 7: FAQ */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Common Inquiries
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-emerald-600' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 8: FINAL CTA */}
      <section className="py-20 bg-slate-950 text-white text-center border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Stop Guessing. Start Optimizing.
          </h2>
          <p className="text-slate-300 text-sm max-w-xl mx-auto">
            Connect your Google Ads account in 60 seconds and let AdOptimize audit your campaigns for immediate wasted spend and scaling opportunities.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={onConnectGoogleAds}
              className="px-6 py-3.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-sm rounded-2xl shadow-xl shadow-[#00d67d]/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Connect Google Ads Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenApp}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-2xl border border-white/15 transition-all"
            >
              <span>Open SaaS Dashboard</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0b0f12] text-slate-400 py-8 px-6 border-t border-slate-800/80 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="text-sm font-bold text-white">
              <span>.adopt</span>
              <span className="text-[#00d67d]">imize</span>
              <span className="text-[#00d67d] ml-0.5">✦</span>
            </div>
            <span>© 2026 AdOptimize Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
            <button onClick={onOpenApp} className="text-[#00d67d] font-bold hover:underline">
              Launch App
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
