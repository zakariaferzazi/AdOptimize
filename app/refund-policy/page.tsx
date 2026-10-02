import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund Policy - AdOptimize | 14-Day Money-Back Guarantee',
  description: 'AdOptimize refund and cancellation policy. Risk-free 14-day money-back guarantee for all paid subscriptions.',
};

export default function RefundPolicyPage() {
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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Refund Policy</h1>
        <p className="text-xs text-slate-500 font-mono">Last Updated: September 2026</p>

        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-900">14-Day Money-Back Guarantee</div>
              <div className="text-emerald-800 mt-0.5">
                If AdOptimize does not identify actionable wasted spend or profitable optimization opportunities in your connected account within your first 14 days, contact support for a full, unconditional refund.
              </div>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-slate-900">How to Request a Refund</h2>
            <p>
              Email <span className="font-semibold text-slate-900">support@adoptimize.app</span> with your account Customer ID. Refunds are processed back to your original payment method within 3–5 business days.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
