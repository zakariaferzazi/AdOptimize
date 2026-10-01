import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, Cookie, ArrowRight, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cookie Policy - AdOptimize | Transparency & Tracking Disclosure',
  description: 'Learn how AdOptimize uses cookies and local storage for authentication, session stability, and application functionality.',
};

export default function CookiePolicyPage() {
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
            Launch App
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
            <Cookie className="w-4 h-4" />
            <span>Compliance & Privacy</span>
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Cookie Policy
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Last Updated: September 2026. This policy explains what cookies and local storage tokens we use, why we use them, and your options.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Essential Cookies & Session Tokens</h2>
            <p>
              AdOptimize uses essential cookies and browser local storage strictly required to deliver the service. This includes maintaining your authenticated login session via Firebase Authentication and preserving your account preferences (such as selected reporting date ranges and currency format).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Analytics & Performance</h2>
            <p>
              We do not utilize invasive third-party cross-site advertising cookies. Any aggregated operational metrics collected are used solely to monitor API response times, detect sync errors, and improve product uptime.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Google OAuth & Third-Party Cookies</h2>
            <p>
              When connecting your Google Ads account, authentication tokens are exchanged through Google’s secure OAuth 2.0 authentication endpoints. These security tokens are stored server-side and are never accessible to third-party ad networks.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">4. How to Control Cookies</h2>
            <p>
              You can control or delete cookies through your browser settings. However, disabling essential session tokens will prevent you from signing in to your AdOptimize dashboard or accessing synchronized campaign reports.
            </p>
          </section>
        </div>

        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-950 text-[#00d67d] font-bold text-xs rounded-xl shadow-lg hover:bg-slate-900 transition-colors"
          >
            <span>Back to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
