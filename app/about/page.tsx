import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Us - AdOptimize | Mission & Background',
  description: 'Learn about the team and philosophy behind AdOptimize, the AI Marketing Manager built to eliminate wasted ad spend.',
};

export default function AboutPage() {
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
            Launch App
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Our Mission
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Democratizing Enterprise-Grade Google Ads Optimization
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every year, billions of dollars are wasted on Google Ads through irrelevant search queries, neglected display placements, and misallocated campaign budgets.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-base font-bold text-slate-900">Why We Built AdOptimize</h2>
          <p>
            Most small businesses, SaaS founders, and growing ecommerce brands cannot afford dedicated $10,000/month performance marketing agencies. Meanwhile, generic dashboards simply present raw numbers without actionable guidance.
          </p>
          <p>
            AdOptimize bridges this gap: continuously monitoring your campaigns, surfacing exact root causes with concrete data evidence, and proposing mathematically grounded capital reallocations that save real budget every single week.
          </p>
        </div>

        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-950 text-[#00d67d] font-bold text-xs rounded-xl shadow-lg hover:bg-slate-900 transition-colors"
          >
            <span>Experience AdOptimize Live</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
