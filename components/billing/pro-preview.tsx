'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, LockKeyhole, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { withAdOptimize } from '@/components/providers/with-adoptimize';
import { PlanCta } from '@/components/billing/plan-cta';

type Feature = 'agent' | 'audit' | 'optimizer' | 'reports';

const previews: Record<Feature, { title: string; headline: string; description: string; items: string[] }> = {
  agent: {
    title: 'AI Marketing Agent',
    headline: 'An agent that can take action, not just answer.',
    description: 'Ask it to investigate your account, build a campaign, or prepare a change. Review the proposal before it executes supported actions in Google Ads.',
    items: ['Investigate live campaign and search-term performance', 'Create Search or App campaigns and adjust budgets, bidding, and targeting', 'Add keywords or negatives and pause or enable campaigns'],
  },
  audit: {
    title: 'AI Ads Audit',
    headline: 'Find where your account needs attention.',
    description: 'Run an evidence-led audit for your chosen period, compare it with the previous period, and see prioritized findings grounded in your account data.',
    items: ['Inspect non-converting search queries and campaign performance', 'Review budget and efficiency signals with supporting evidence', 'Export findings as a CSV for your team'],
  },
  optimizer: {
    title: 'Budget Optimizer',
    headline: 'See where your budget could work harder.',
    description: 'Review budget recommendations alongside campaign performance and decide which supported changes to apply.',
    items: ['Compare campaign-level performance', 'Review suggested budget adjustments', 'Approve changes before they are sent to Google Ads'],
  },
  reports: {
    title: 'Reports',
    headline: 'Turn campaign data into a clear report.',
    description: 'Build a period-specific report with previous-period comparisons, campaign breakdowns, and exports you can share.',
    items: ['Compare spend, conversions, CPA, and ROAS', 'Filter and sort campaign performance', 'Export CSV or print a clean report'],
  },
};

function Example({ feature }: { feature: Feature }) {
  if (feature === 'agent') {
    return (
      <div className="space-y-4">
        <div className="ml-8 rounded-2xl rounded-tr-sm bg-indigo-50 p-4 text-sm text-indigo-950">
          Review my Search campaign and prepare a daily budget change.
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Sparkles className="h-4 w-4 text-indigo-600" /> Proposed campaign budget</div>
          <p className="mt-3 text-sm text-slate-600">The agent reviews the campaign, prepares the change, and shows its current and proposed settings for your approval.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-lg bg-slate-100 px-3 py-2">Current: $40/day</span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <span className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700">Proposed: $50/day</span>
            <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">Awaiting approval</span>
          </div>
        </div>
      </div>
    );
  }
  if (feature === 'audit') {
    return <div className="space-y-4">
      <div className="rounded-xl bg-slate-950 p-4 text-white"><p className="text-xs font-semibold text-indigo-200">LAST 30 COMPLETE DAYS</p><p className="mt-2 text-lg font-bold">Account performance audit</p><p className="mt-1 text-xs text-slate-300">Period comparison · Search query review · Findings</p></div>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Spend</p><p className="mt-1 text-xl font-bold">$4,800</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Conversions</p><p className="mt-1 text-xl font-bold">35</p></div></div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold text-amber-800">REVIEW SEARCH TERMS</p><p className="mt-2 text-sm text-slate-700">A query has spend and no recorded conversions. Inspect its relevance before deciding what to exclude.</p></div>
    </div>;
  }
  if (feature === 'optimizer') {
    return <div className="space-y-4">
      <p className="text-sm text-slate-600">Recommendations for your review</p>
      <div className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><p className="font-bold text-slate-900">Search campaign</p><span className="text-xs font-semibold text-indigo-700">Budget recommendation</span></div><p className="mt-2 text-sm text-slate-600">Compare performance and review the suggested budget adjustment.</p><div className="mt-4 flex items-center gap-2 text-xs font-semibold"><span className="rounded-lg bg-slate-100 px-3 py-2">$40 / day</span><ArrowRight className="h-4 w-4 text-slate-400" /><span className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-700">$50 / day</span></div></div>
      <p className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-900">Review the recommendation before applying a supported change.</p>
    </div>;
  }
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-slate-900">Performance report</p><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Last 30 days</span></div>
    <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Spend</p><p className="mt-1 text-xl font-bold">$4,800</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Conversions</p><p className="mt-1 text-xl font-bold">35</p></div></div>
    <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-bold">Campaign breakdown</p><div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-600"><span>Search campaign</span><span>Compare previous period</span></div></div>
    <p className="text-xs text-slate-500">CSV export and print-ready report available with Pro.</p>
  </div>;
}

export const ProPreview = withAdOptimize(function ProPreview({ feature }: { feature: Feature }) {
  const preview = previews[feature];
  return (
    <AppShell title={preview.title}>
      <div className="mx-auto max-w-6xl space-y-6 pt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-indigo-700">
          <LockKeyhole className="h-4 w-4" /> PRO FEATURE PREVIEW
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-3xl border border-indigo-100 bg-white p-7 sm:p-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">{preview.headline}</h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">{preview.description}</p>
            <ul className="mt-6 space-y-3">{preview.items.map(item => (
              <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-indigo-600" />{item}</li>
            ))}</ul>
            <div className="mt-8 space-y-3">
              <PlanCta interval="monthly" label="Unlock Pro — $29/month" className="site-button w-full" />
              <PlanCta interval="yearly" label="Choose yearly — $99/year" className="site-button-secondary w-full" />
              <p className="text-xs leading-5 text-slate-500">USD. Taxes calculated at checkout. Cancel anytime.</p>
            </div>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-500 p-5 sm:p-8">
            <div className="rounded-2xl bg-white p-5 shadow-xl sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <h2 className="font-bold text-slate-900">{preview.title}</h2>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Illustrative preview</span>
              </div>
              <Example feature={feature} />
              <p className="mt-5 text-xs leading-5 text-slate-500">Example only, not your account data. Pro is required to use this feature.</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-500">Want to compare billing options? <Link href="/pricing" className="font-semibold text-indigo-700 underline">See Pro pricing</Link>.</p>
      </div>
    </AppShell>
  );
});
