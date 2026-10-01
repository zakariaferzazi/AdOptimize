import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, ArrowRight, Layers, CheckCircle2 } from 'lucide-react';
import { PSEO_SOLUTIONS } from '@/lib/pseo-data';

export const metadata: Metadata = {
  title: 'Google Ads Optimization Solutions by Industry - AdOptimize',
  description: 'Tailored Google Ads and Performance Max optimization playbooks for SaaS, eCommerce, B2B lead generation, and performance marketing agencies.',
};

export default function SolutionsDirectoryPage() {
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

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center justify-center gap-1.5">
            <Layers className="w-4 h-4" />
            <span>Vertical Solutions</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Google Ads Optimization Tailored for Your Industry
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Every business model faces distinct Google Ads failure modes. Explore custom diagnostic rules, negative query patterns, and benchmark data built for your sector.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PSEO_SOLUTIONS.map((sol) => (
            <Link
              key={sol.slug}
              href={`/solutions/${sol.slug}`}
              className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between group space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    {sol.industry}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Avg CPA: {sol.avgCpa}
                  </span>
                </div>

                <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {sol.headline}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {sol.subheadline}
                </p>

                <div className="space-y-1.5 pt-2 text-xs text-slate-600">
                  <div className="font-semibold text-slate-800">Common Bleeds Caught:</div>
                  {sol.commonBleeds.slice(0, 2).map((bleed, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-rose-700">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{bleed}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                <span>View {sol.industry} Playbook</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
