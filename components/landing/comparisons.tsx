import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { PSEO_COMPARISONS } from '@/lib/comparison-data';
import { landing } from './landing-ui';

const competitors = PSEO_COMPARISONS.flatMap((comparison) => comparison.pricing ? [{
  name: comparison.competitorName,
  slug: comparison.slug,
  pricing: comparison.pricing,
}] : []);

export function Comparisons() {
  return (
    <section id="compare" className={`${landing.section} scroll-mt-24 bg-[#F5F3FF]`} aria-labelledby="comparison-heading">
      <div className={landing.container}>
        <p className={landing.label}>Compare your options</p>
        <h2 id="comparison-heading" className={landing.h2}>An agent that works. Pricing that makes sense.</h2>
        <p className={landing.lead}>Get an agent that builds, manages and optimizes Google Ads. Compare published entry prices and the work each plan includes before you commit.</p>

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
          <div className="rounded-xl bg-[#2E1065] p-6 text-white shadow-sm sm:p-7">
            <p className="text-xs font-bold uppercase tracking-wider text-[#FBBF24]">AdOptimize Pro</p>
            <h3 className="mt-3 text-2xl font-bold">Your Google Ads agent, ready to work.</h3>
            <p className="mt-6 text-4xl font-extrabold">$29<span className="text-base font-medium text-purple-100">/month</span></p>
            <p className="mt-2 text-sm text-purple-100">Or $99/year — $8.25/month equivalent, paid yearly.</p>
            <ul className="mt-6 space-y-3 text-sm leading-6">
              {[
                'Create Search and App campaigns from your brief',
                'Manage budgets, bidding, keywords and targeting',
                'Execute approved changes directly in Google Ads',
                'Use audits, reports and execution history',
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#FBBF24]" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <a href="#pricing" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FBBF24] px-6 py-3 text-sm font-semibold text-[#2E1065] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Choose your Pro plan <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
            {competitors.map((competitor, index) => (
              <article key={competitor.slug} className={`${landing.card} min-w-0 ${index === competitors.length - 1 ? 'sm:col-span-2' : ''}`}>
                <h3 className="text-base font-bold text-[#2E1065]">{competitor.name}</h3>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[#2E1065]">{competitor.pricing.label}</p>
                <p className="mt-3 text-sm leading-6 text-[#1F2937]">{competitor.pricing.detail}</p>
                <Link href={`/compare/${competitor.slug}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded text-sm font-semibold text-[#6D28D9] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]">
                  Compare with AdOptimize <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only"> — {competitor.name}</span>
                </Link>
              </article>
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs leading-5 text-[#6B7280]">
          Vendor sources and billing details are linked in each comparison. Checked 27 November 2026. Prices and promotions may change; feature sets, account allowances and spend limits differ. Applicable taxes and Google Ads media spend are separate from AdOptimize Pro.
        </p>
      </div>
    </section>
  );
}
