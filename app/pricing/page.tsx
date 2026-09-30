import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Pricing - AdOptimize | Transparent Google Ads AI Optimization Plans',
  description: 'Select your AdOptimize plan. Free starter monitoring, Performance Pro for scaling accounts, and Agency Scale for multi-account management.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fa] text-slate-900">
      <header className="bg-[#0d1117] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00d67d] to-[#059669] flex items-center justify-center text-slate-950 font-bold">
              <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-xl font-bold tracking-tight text-white flex items-baseline">
              <span>.adopt</span>
              <span className="text-[#00d67d]">imize</span>
              <span className="text-[#00d67d] ml-0.5">✦</span>
            </div>
          </Link>

          <Link
            href="/"
            className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Launch Live App
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="space-y-3 text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
            Predictable ROI
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Fair Pricing Built to Save Ad Spend
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Choose a plan that pays for itself in your first recovered keyword bleed or budget reallocation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SUBSCRIPTION_PLANS.map((plan) => (
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
                  <span className="text-3xl font-bold font-mono">${plan.monthlyPrice}</span>
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

              <Link
                href="/"
                className={`mt-8 w-full py-2.5 rounded-xl text-xs font-bold text-center block transition-all ${
                  plan.popular
                    ? 'bg-[#00d67d] text-slate-950 hover:bg-[#00c06f]'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
