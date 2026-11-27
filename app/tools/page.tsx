import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { ArrowRight, Wrench, CheckCircle2 } from 'lucide-react';
import { PSEO_TOOLS } from '@/lib/pseo-data';
import { BrandLogo } from '@/components/ui/brand-logo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Google Ads Audit Tool & PPC Calculators | AdOptimize',
  description: 'Run five free Google Ads audits per month. Review query waste and available Quality Scores, or use our public CPA and ROAS calculators.',
  path: '/tools',
});

export default function ToolsDirectoryPage() {
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
            Open Live App
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] flex items-center justify-center gap-1.5">
            <Wrench className="w-4 h-4" />
            <span>Free Google Ads Audit Tools</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Free Google Ads audit and practical PPC tools
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Start with a read-only audit of your connected Google Ads account. Free includes five audits per month; campaign management requires Pro. Our public calculators also help you understand CPA and ROAS.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PSEO_TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="bg-white rounded-xl p-6 sm:p-7 border border-slate-200/80 shadow-xs hover:border-[#6D28D9] hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#5B21B6] bg-[#F5F3FF] px-2.5 py-1 rounded-full border border-[#DDD6FE]">
                    Public tool or guide
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    AdOptimize
                  </span>
                </div>

                <h2 className="text-base font-bold text-slate-900 group-hover:text-[#5B21B6] transition-colors">
                  {tool.title}
                </h2>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {tool.subheadline}
                </p>

                <ul className="space-y-1.5 pt-2 text-xs text-slate-600">
                  {tool.keyBenefits.slice(0, 2).map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#6D28D9] shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-[#5B21B6]">
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
