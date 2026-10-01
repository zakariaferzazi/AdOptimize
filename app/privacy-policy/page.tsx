import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - AdOptimize | Data Protection & Google Ads API Usage',
  description: 'AdOptimize privacy policy, Google Ads OAuth scope usage, data encryption standards, and zero third-party disclosure guarantee.',
};

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Privacy Policy</h1>
        <p className="text-xs text-slate-500 font-mono">Last Updated: September 2026</p>

        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">1. Google Ads API Data Usage</h2>
            <p>
              AdOptimize accesses your Google Ads account solely to retrieve campaign performance metrics, ad group statistics, keyword performance, Quality Scores, and search term query logs for optimization analysis.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">2. Security & Credentials Isolation</h2>
            <p>
              We adhere strictly to Google API Services User Data Policy. All OAuth tokens and refresh credentials are encrypted at rest with AES-256 and stored exclusively in secure server environments. Tokens are never exposed to browser client sessions.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">3. Non-Disclosure & AI Training Policy</h2>
            <p>
              Your advertising campaign metrics and search queries are strictly confidential. We never sell, transfer, or use your advertising data to train public foundation models or share insights with external third parties or competitors.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
