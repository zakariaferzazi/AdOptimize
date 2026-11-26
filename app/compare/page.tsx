import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import { PSEO_COMPARISONS } from '@/lib/comparison-data';
import { BrandLogo } from '@/components/ui/brand-logo';
import { BLOG_DISCLAIMER } from '@/lib/blog-data';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Google Ads Tool & Agency Comparisons | AdOptimize',
  description: 'Compare AdOptimize with PPC agencies and other Google Ads tools on pricing, channel scope and change approval.',
  path: '/compare',
});

export default function CompareDirectoryPage() {
  return (
    <div className="min-h-screen bg-[#F5F3FF] text-slate-900 font-sans">
      <header className="bg-[#2E1065] text-white px-6 py-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/">
            <BrandLogo />
          </Link>

          <Link
            href="/"
            className="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] flex items-center justify-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4" />
            <span>Honest Comparisons</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            AdOptimize vs. PPC Agencies & Legacy Tools
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Review how AdOptimize’s account analysis, proposal workflow, and $29 monthly or $99 yearly pricing compare with traditional alternatives.
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 leading-relaxed max-w-3xl mx-auto">{BLOG_DISCLAIMER}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PSEO_COMPARISONS.map((comp) => (
            <Link
              key={comp.slug}
              href={`/compare/${comp.slug}`}
              className="bg-white rounded-xl p-7 border border-slate-200/80 shadow-xs hover:border-[#6D28D9] hover:shadow-md transition-all flex flex-col justify-between group space-y-5"
            >
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#5B21B6] bg-[#F5F3FF] px-2.5 py-1 rounded-full border border-[#DDD6FE]">
                  Head-to-Head Comparison
                </span>

                <h2 className="text-lg font-bold text-slate-900 group-hover:text-[#5B21B6] transition-colors">
                  {comp.title}
                </h2>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {comp.tagline}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-[#5B21B6]">
                <span>Read Full Comparison &amp; Data Breakdown</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
