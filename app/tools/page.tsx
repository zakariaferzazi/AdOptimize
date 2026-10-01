import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, ArrowRight, Wrench, Sparkles, CheckCircle2 } from 'lucide-react';
import { PSEO_TOOLS } from '@/lib/pseo-data';

export const metadata: Metadata = {
  title: 'Free Google Ads Tools & Calculators - AdOptimize',
  description: 'Free Google Ads audit tools, negative keyword finders, CPA calculators, Target ROAS estimators, and Quality Score diagnostics.',
};

export default function ToolsDirectoryPage() {
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
            Open Live App
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center justify-center gap-1.5">
            <Wrench className="w-4 h-4" />
            <span>Free Google Ads Audit Tools</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Free Google Ads Diagnostic Tools & Calculators
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Stop wasting budget on underperforming campaigns. Use our free specialized tools to identify negative keyword leaks, calculate target CPA, and model ROAS impact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PSEO_TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    Free Tool
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {tool.searchVolumeEstimate}
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {tool.title}
                </h2>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {tool.subheadline}
                </p>

                <ul className="space-y-1.5 pt-2 text-xs text-slate-600">
                  {tool.keyBenefits.slice(0, 2).map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                <span>Use Tool Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
