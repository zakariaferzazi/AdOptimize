'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LockKeyhole, Menu, Send } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';

const FEATURES = {
  dashboard: { title: 'Overview', benefit: 'See spend, conversions and ROAS together. Spot performance changes and decide where to focus next.' },
  campaigns: { title: 'Campaigns', benefit: 'Review campaign performance, manage budgets and bidding, and apply the changes you approve.' },
  chat: { title: 'AI Marketing Agent', benefit: 'Turn your brief into campaigns, investigate performance and execute approved budget, bidding and targeting changes.' },
  reports: { title: 'Reports', benefit: 'Compare reporting periods, review campaign breakdowns and export performance reports for your team or clients.' },
  optimizer: { title: 'Budget Optimizer', benefit: 'Review opportunities to rebalance spend and adjust budgets around your CPA and ROAS goals.' },
  activity_log: { title: 'Activity History', benefit: 'Follow proposals, approvals and execution outcomes in one place, with searchable records and exports.' },
};

const upgradeClass = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6D28D9] px-5 py-3 text-sm font-semibold text-white hover:bg-[#5B21B6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D28D9]';

export function ProPreview({ feature }: { feature: keyof typeof FEATURES }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const details = FEATURES[feature];

  return (
    <div className="min-h-screen bg-[#F5F3FF] font-sans text-[#1F2937]">
      <Sidebar currentTab={feature === 'dashboard' ? 'overview' : feature} isMobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)} isDesktopCollapsed={collapsed} onToggleDesktop={() => setCollapsed((value) => !value)} />
      <div className={`min-w-0 ${collapsed ? '' : 'lg:pl-64'}`}>
        <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation menu" className="rounded-xl p-2 hover:bg-[#DDD6FE] lg:hidden"><Menu className="h-5 w-5" /></button>
            {collapsed && <button type="button" onClick={() => setCollapsed(false)} className="hidden rounded-xl p-2 hover:bg-[#DDD6FE] lg:block" aria-label="Expand sidebar"><Menu className="h-5 w-5" /></button>}
            <h1 className="text-xl font-bold text-[#2E1065] sm:text-2xl">{details.title}</h1>
          </div>
          <Link href="/billing" className="text-sm font-semibold text-[#6D28D9] underline">Your Free plan</Link>
        </header>
        <main className="mx-auto max-w-7xl space-y-6 px-4 pb-10 sm:px-8">
          <section className="rounded-xl border border-[#DDD6FE] bg-white p-6 sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#FBBF24] px-3 py-1 text-xs font-bold text-[#2E1065]"><LockKeyhole className="h-3.5 w-3.5" />Pro feature preview</p>
            <h2 className="mt-4 text-2xl font-bold text-[#2E1065]">Unlock {feature === 'dashboard' ? 'your live dashboard' : details.title} with Pro</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6B7280]">{details.benefit}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/pricing" className={upgradeClass}>Upgrade to Pro <ArrowRight className="h-4 w-4" /></Link>
              <p className="text-sm text-[#6B7280]">$29/month or $99/year. Both include all Pro features.</p>
            </div>
            <Link href="/audit" className="mt-5 inline-block text-sm font-semibold text-[#6D28D9] underline">Keep using your five free monthly audits</Link>
          </section>
          <p className="text-sm text-[#6B7280]">Preview only. Example data for illustration, not your connected account. Live data and actions require Pro.</p>
          {feature === 'chat' ? <ChatPreview /> : <ToolPreview feature={feature} />}
        </main>
      </div>
    </div>
  );
}

export function ChatPreview() {
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    setQuestion(input.trim());
    setInput('');
  };
  return (
    <section className="overflow-hidden rounded-xl border border-[#DDD6FE] bg-white">
      <div className="border-b border-[#DDD6FE] px-5 py-4 text-sm font-semibold text-[#2E1065]">AI Marketing Agent <span className="ml-2 font-normal text-[#6B7280]">Preview</span></div>
      <div className="space-y-5 p-5 sm:p-8">
        <p className="max-w-2xl text-sm leading-6">What would you like to achieve? Pro can help you build campaigns, find wasted spend, manage budgets and execute the changes you approve.</p>
        <button type="button" onClick={() => setInput('Build a Search campaign for my business with a $25 daily budget.')} className="rounded-xl border border-[#DDD6FE] px-4 py-3 text-left text-sm text-[#6D28D9] hover:bg-[#F5F3FF]">Build a Search campaign with a $25 daily budget</button>
        {question && (
          <div className="space-y-4">
            <p className="ml-auto max-w-xl break-words rounded-xl bg-[#F5F3FF] p-4 text-sm"><span className="mb-2 block font-semibold">You</span>{question}</p>
            <div role="status" aria-live="polite" className="max-w-xl rounded-xl border border-[#DDD6FE] p-4 text-sm leading-6">
              <p className="font-semibold text-[#2E1065]">Upgrade to Pro to use the AI Marketing Agent.</p>
              <p className="mt-2">Your Free plan includes AI Ads Audit. Pro unlocks agent conversations and approved campaign management. This preview has not sent your message to the AI or made any Google Ads changes.</p>
              <Link href="/pricing" className="mt-3 inline-block font-semibold text-[#6D28D9] underline">See Pro plans</Link>
            </div>
          </div>
        )}
        <form onSubmit={submit} className="flex flex-col gap-3 border-t border-[#DDD6FE] pt-5 sm:flex-row">
          <label htmlFor="preview-message" className="sr-only">Message the AI Marketing Agent preview</label>
          <textarea id="preview-message" value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} rows={2} placeholder="Tell the agent what you want to achieve..."
            className="min-w-0 flex-1 resize-y rounded-xl border border-[#DDD6FE] p-3 text-sm focus-visible:outline-2 focus-visible:outline-[#6D28D9]" />
          <button type="submit" disabled={!input.trim()} className={`${upgradeClass} disabled:opacity-50`}><Send className="h-4 w-4" />Send</button>
        </form>
      </div>
    </section>
  );
}

function ToolPreview({ feature }: { feature: Exclude<keyof typeof FEATURES, 'chat'> }) {
  const rows = {
    dashboard: [['Spend', '$1,240'], ['Conversions', '82'], ['ROAS', '3.4x']],
    campaigns: [['Core Search', 'Paused | $25/day'], ['Brand Search', 'Paused | $10/day'], ['App installs', 'Paused | $25/day']],
    reports: [['Reporting period', 'Last 30 days vs previous 30 days'], ['Campaign breakdown', 'Spend, conversions, CPA and ROAS'], ['Export options', 'CSV and print']],
    optimizer: [['Core Search budget', '$50/day -> $40/day'], ['Review signal', 'Non-converting query spend'], ['Next step', 'Review a proposal before applying']],
    activity_log: [['Campaign build', 'Draft prepared'], ['Budget proposal', 'Awaiting approval'], ['Approved keyword update', 'Succeeded']],
  }[feature];
  const action = { dashboard: 'View live performance', campaigns: 'Manage campaigns', reports: 'Generate report', optimizer: 'Review budget changes', activity_log: 'Search and export history' }[feature];
  return (
    <section className="rounded-xl border border-[#DDD6FE] bg-white p-5 sm:p-8">
      <h2 className="text-lg font-bold text-[#2E1065]">{FEATURES[feature].title} preview</h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-5">
            <dt className="text-sm text-[#6B7280]">{label}</dt>
            <dd className="mt-3 break-words text-lg font-semibold text-[#2E1065]">{value}</dd>
          </div>
        ))}
      </dl>
      <Link href="/pricing" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#6D28D9] underline"><LockKeyhole className="h-4 w-4" />{action} with Pro</Link>
    </section>
  );
}
