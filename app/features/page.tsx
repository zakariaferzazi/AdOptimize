import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Sparkles, SlidersHorizontal, ShieldCheck, Zap, Bot, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features - AdOptimize | AI Marketing Manager for Google Ads',
  description: 'Explore AdOptimize features: continuous anomaly detection, grounded AI Marketing Analyst, Budget Optimizer, and guarded automation.',
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900">
      <header className="bg-[#0d1117] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d67d] to-[#059669] flex items-center justify-center text-slate-950 font-bold">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-xl font-bold tracking-tight flex items-baseline">
              <span className="text-white">Ad</span>
              <span className="text-[#00d67d]">Optimize</span>
            </div>
          </Link>

          <Link
            href="/"
            className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Open Live SaaS App
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-3 text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Platform Capabilities
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Engineered for High-ROI Performance Marketers
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Everything you need to continuously monitor, diagnose, and optimize Google Ads accounts without hiring full-time agency overhead.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Grounded AI Marketing Analyst</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every diagnosis delivers a clear Problem, Why It Matters, concrete Data Evidence from your actual query logs, and Expected Financial Impact.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Budget Optimizer & Rebalancer</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dynamically identify high-ROAS winners with unmet impression share and low-performing bleeders. Reallocate capital with 1-click human verification.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Autonomous Anomaly Detection</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              24/7 background audit scans for sudden CPA spikes, ROAS drops, zero-conversion keyword drains, and competitor auction surge pressure.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">AI Marketing Copilot</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Ask questions in plain English (&ldquo;Why did my CPA increase?&rdquo;, &ldquo;Which keywords are wasting budget?&rdquo;) and receive data-grounded answers citing exact campaigns.
            </p>
          </div>
        </div>

        <div className="text-center pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-950 text-[#00d67d] font-bold text-xs rounded-2xl shadow-xl hover:bg-slate-900 transition-colors"
          >
            <span>Launch Live AdOptimize Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
