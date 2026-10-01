import type { Metadata } from 'next';
import Link from 'next/link';
import { TrendingUp, ArrowRight, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { PSEO_COMPARISONS } from '@/lib/pseo-data';

export const metadata: Metadata = {
  title: 'Google Ads Management Comparisons & Alternatives - AdOptimize',
  description: 'Compare AdOptimize with traditional PPC marketing agencies, WordStream, and Optmyzr. Discover transparent pricing, continuous monitoring, and audit-proof controls.',
};

export default function CompareDirectoryPage() {
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
            <SlidersHorizontal className="w-4 h-4" />
            <span>Honest Comparisons</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            AdOptimize vs. PPC Agencies & Legacy Tools
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            See how continuous 15-minute anomaly detection, transparent root-cause evidence, and guarded budget reallocations stack up against traditional alternatives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PSEO_COMPARISONS.map((comp) => (
            <Link
              key={comp.slug}
              href={`/compare/${comp.slug}`}
              className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between group space-y-5"
            >
              <div className="space-y-3">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  Head-to-Head
                </span>

                <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {comp.title}
                </h2>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {comp.tagline}
                </p>

                <div className="pt-2 text-xs text-slate-500 font-mono">
                  Target Keyword: {comp.targetKeyword}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                <span>Read Full Comparison</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
