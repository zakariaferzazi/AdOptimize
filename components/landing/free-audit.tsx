import Link from 'next/link';
import { Check, SearchCheck } from 'lucide-react';
import { FREE_PLAN_SUMMARY } from '@/lib/plans';
import { landing } from './landing-ui';
import { LandingPrimaryCta } from './session-cta';

export function FreeAudit() {
  return (
    <section id="free-audit" className={`${landing.section} scroll-mt-24 border-t border-[#DDD6FE] bg-white`} aria-labelledby="free-audit-heading">
      <div className={`${landing.container} grid items-start gap-10 lg:grid-cols-2`}>
        <div>
          <p className={landing.label}>Free plan · AI Ads Audit</p>
          <h2 id="free-audit-heading" className={landing.h2}>Your free Google Ads audit starts with real account data.</h2>
          <p className={landing.lead}>Connect Google Ads, choose a reporting period and get a prioritized review plan. Find spend with no recorded conversions, compare CPA and ROAS, and review available keyword Quality Scores.</p>
          <p className="mt-4 text-sm leading-6 text-[#6B7280]">Five completed audits per calendar month (UTC). No card required. The audit is read-only and does not change your campaigns.</p>
          <LandingPrimaryCta className="mt-7 w-full sm:w-auto" />
          <Link href="/tools/google-ads-audit" className="mt-4 block text-sm font-semibold text-[#6D28D9] underline">See how the free Google Ads audit tool works</Link>
        </div>
        <div className={landing.card}>
          <SearchCheck className="h-8 w-8 text-[#6D28D9]" aria-hidden="true" />
          <h3 className="mt-4 text-xl font-bold text-[#2E1065]">What your audit reviews</h3>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-[#1F2937]">
            {[
              'Campaign performance versus the previous, equally long period',
              'Reported search queries with spend and no conversions',
              'CPA and ROAS against the optional targets you provide',
              'Budget visibility and spending keywords with low reported Quality Scores',
              'Prioritized findings, coverage notes and a findings CSV export',
            ].map((item) => <li key={item} className="flex items-start gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-[#6D28D9]" aria-hidden="true" />{item}</li>)}
          </ul>
          <p className="mt-6 border-t border-[#DDD6FE] pt-5 text-xs leading-5 text-[#6B7280]">{FREE_PLAN_SUMMARY}</p>
        </div>
      </div>
    </section>
  );
}
