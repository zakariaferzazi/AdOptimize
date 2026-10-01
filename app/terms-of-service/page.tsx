import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service - AdOptimize | User Agreement',
  description: 'AdOptimize terms of service, acceptable use policy, and Google Ads management agreement.',
};

export default function TermsOfServicePage() {
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

          <Link href="/" className="px-4 py-2 bg-[#00d67d] text-slate-950 font-bold text-xs rounded-xl shadow-xs">
            Back to App
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Terms of Service</h1>
        <p className="text-xs text-slate-500 font-mono">Last Updated: September 2026</p>

        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accessing or connecting a Google Ads account to AdOptimize, you agree to comply with these terms, Google Ads policies, and applicable international laws.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Campaign Modifications & Human Authorization</h2>
            <p>
              AdOptimize provides recommendations and optimization proposals. Unless you deliberately configure and enable autonomous execution rules with defined limits, modifications require explicit approval before dispatch to Google Ads.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Subscription & Billing</h2>
            <p>
              Subscriptions renew automatically on monthly or annual intervals. You may cancel at any time via your account settings dashboard without penalty.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
