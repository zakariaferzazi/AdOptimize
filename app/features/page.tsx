import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Sparkles, SlidersHorizontal, ShieldCheck, Zap, Bot, ArrowRight, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Features - Google Ads Audit & Budget Optimization | AdOptimize',
  description: 'Explore AdOptimize features: continuous Google Ads audit, negative keyword discovery, CPA spike detection, and 1-click budget rebalancing.',
};

export default function FeaturesPage() {
  const capabilities = [
    {
      icon: Sparkles,
      title: 'Continuous Google Ads Audit',
      desc: 'Scans your Search, Performance Max (PMax), and Display campaigns every 15 minutes. Uncovers non-converting queries, budget caps, and negative keyword leaks.',
    },
    {
      icon: SlidersHorizontal,
      title: 'Budget Rebalancer & Margin Scaling',
      desc: 'Identifies high-ROAS winning campaigns hitting daily spend ceilings. Reallocates capital away from dying ad groups with 1-click verification.',
    },
    {
      icon: ShieldCheck,
      title: 'CPA & ROAS Anomaly Detection',
      desc: 'Detects sudden cost per conversion spikes before they drain weekly budgets. Delivers exact data evidence citing query logs and competitor auction pressure.',
    },
    {
      icon: Bot,
      title: 'Negative Keyword Automation',
      desc: 'Automatically isolates career, student, crack, and login queries from your search traffic. Protects broad match campaigns from wasting click spend.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900 font-sans">
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
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Everything You Need to Cut CPA & Scale ROAS
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Eliminate wasted ad spend, stop bleeding budgets, and optimize Google Ads accounts with zero agency retainers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {capabilities.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <div key={i} className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">{cap.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{cap.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-950 text-[#00d67d] font-bold text-xs rounded-xl shadow-xl hover:bg-slate-900 transition-colors"
          >
            <span>Launch Live AdOptimize Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
