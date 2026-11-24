'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, Download, Loader2, SearchCheck, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { useAdOptimize } from '@/context/adoptimize-context';
import { withAdOptimize } from '@/components/providers/with-adoptimize';
import { auth } from '@/lib/firebase';
import { downloadCsv } from '@/lib/csv';
import { buildAuditCsv } from '@/lib/google-ads/audit-csv';
import type { AdsAuditReport } from '@/lib/google-ads/audit';
import type { Metrics } from '@/lib/google-ads/reporting';

const periods = [
  ['LAST_7_DAYS', 'Last 7 complete days'],
  ['LAST_14_DAYS', 'Last 14 complete days'],
  ['LAST_30_DAYS', 'Last 30 complete days'],
  ['LAST_90_DAYS', 'Last 90 complete days'],
  ['THIS_MONTH', 'This month'],
  ['LAST_MONTH', 'Last month'],
  ['CUSTOM', 'Custom dates'],
];

export const AuditClientView = withAdOptimize(function AuditClientViewInner() {
  const { state, user } = useAdOptimize();
  const connected = Boolean(state.account.isConnected && state.account.clientCustomerId !== 'Not Connected');
  return (
    <AppShell title="AI Ads Audit">
      <AuditWorkspace key={`${user?.uid}:${state.account.clientCustomerId}`}
        userId={user?.uid} connected={connected} currency={state.account.currency || 'USD'} />
    </AppShell>
  );
});

function AuditWorkspace({ userId, connected, currency }: { userId?: string; connected: boolean; currency: string }) {
  const [period, setPeriod] = useState('LAST_30_DAYS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [targetCpa, setTargetCpa] = useState('');
  const [targetRoas, setTargetRoas] = useState('');
  const [report, setReport] = useState<AdsAuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('All');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const runAudit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    setReport(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      if (!userId || auth.currentUser?.uid !== userId) throw new Error('Sign in to run an account audit.');
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/google-ads/audit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          ...(period === 'CUSTOM' ? { startDate, endDate } : { dateRange: period }),
          ...(targetCpa ? { targetCpa: Number(targetCpa) } : {}),
          ...(targetRoas ? { targetRoas: Number(targetRoas) } : {}),
        }),
      });
      const data: { report?: AdsAuditReport; error?: string } = await response.json();
      if (!response.ok || !data.report) throw new Error(data.error || 'The audit returned no report.');
      setReport(data.report);
      setCategory('All');
    } catch (failure) {
      if (controller.signal.aborted) return;
      console.error('[Ads Audit] Audit failed:', failure);
      setError(failure instanceof Error ? failure.message : 'The audit could not be completed.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const money = (value: number | null) => value === null ? 'Not available' :
    new Intl.NumberFormat(undefined, { style: 'currency', currency: report?.account.currency || currency, maximumFractionDigits: 2 }).format(value);
  const number = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  const formatMetric = (key: keyof Metrics, value: number | null): string => {
    if (value === null) return 'Not available';
    if (key === 'cost' || key === 'cpa') return money(value);
    if (key === 'roas') return `${number(value)}x`;
    return number(value);
  };
  const metrics: Array<{ key: keyof Metrics; label: string }> = [
    { key: 'cost', label: 'Spend' }, { key: 'conversions', label: 'Conversions' },
    { key: 'cpa', label: 'Cost / conversion' }, { key: 'roas', label: 'ROAS' },
  ];
  const findings = report?.findings.filter((finding) => category === 'All' || finding.category === category) || [];
  const categories = ['All', ...new Set(report?.findings.map((finding) => finding.category) || [])];
  const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500';

  const downloadReport = () => {
    if (!report) return;
    downloadCsv(buildAuditCsv(report.findings), `google-ads-audit-${report.dateRange.startDate}-${report.dateRange.endDate}.csv`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <section className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white">
        <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
          <SearchCheck className="w-4 h-4" /> Google Ads performance audit
        </div>
        <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">Know where your ad spend needs attention.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Audit a specific period using your connected account. Compare performance, inspect costly queries,
          and get evidence-led next steps. No estimated health scores, invented savings, or automatic changes.
        </p>
        <div className="mt-5 flex items-center gap-2 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Read-only analysis. You stay in control of every change.
        </div>
      </section>

      <form onSubmit={runAudit} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-900">Audit scope</h3>
          <p className="mt-1 text-xs text-slate-500">All non-removed campaigns. Dates follow your Google Ads account time zone.</p>
        </div>
        <fieldset disabled={loading} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-slate-700">Reporting period
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className={inputClass}>
              {periods.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          {period === 'CUSTOM' && <>
            <label className="text-xs font-medium text-slate-700">Start date
              <input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClass} />
            </label>
            <label className="text-xs font-medium text-slate-700">End date
              <input type="date" required min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClass} />
            </label>
          </>}
          <label className="text-xs font-medium text-slate-700">Target CPA ({currency}, optional)
            <input type="number" min="0.01" step="any" placeholder="e.g. 50" value={targetCpa} onChange={(event) => setTargetCpa(event.target.value)} className={inputClass} />
          </label>
          <label className="text-xs font-medium text-slate-700">Target ROAS (multiple, optional)
            <input type="number" min="0.01" step="any" placeholder="e.g. 3 = 300%" value={targetRoas} onChange={(event) => setTargetRoas(event.target.value)} className={inputClass} />
          </label>
        </fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Targets are audit benchmarks, not changes to your bidding settings.</p>
          <button type="submit" disabled={loading || !connected || !userId}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchCheck className="w-4 h-4" />}
            {loading ? 'Auditing account...' : 'Run audit'}
          </button>
        </div>
        {(!connected || !userId) && <p className="text-sm text-amber-800">Sign in and connect Google Ads in <Link href="/settings" className="underline">Settings</Link> to run an audit.</p>}
      </form>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} No account changes were made.</div>}
      {loading && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Reading campaign performance, keywords and search queries for your selected period...
      </div>}
      {!report && !loading && !error && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
        <SearchCheck className="w-8 h-8 mx-auto text-slate-400" />
        <h3 className="mt-3 font-semibold text-slate-900">Start with the period you want to understand</h3>
        <p className="mt-2 text-sm text-slate-500">Your report will compare the immediately preceding, equally long period.</p>
      </div>}

      {report && <>
        <section className="space-y-4" aria-label="Audit report">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{report.account.name} <span className="text-sm font-normal text-slate-500">#{report.account.customerId}</span></h3>
              <p className="text-sm text-slate-700 mt-1">{report.dateRange.startDate} to {report.dateRange.endDate} <span className="text-slate-400">/ {report.account.timeZone}</span></p>
              <p className="mt-1 text-xs text-slate-500">Compared with {report.previousRange.startDate} to {report.previousRange.endDate}. Generated {new Date(report.generatedAt).toLocaleString()}.</p>
              <p className="mt-1 text-xs text-slate-500">Audit targets: CPA {report.targets.cpa === null ? 'not set' : money(report.targets.cpa)} / ROAS {report.targets.roas === null ? 'not set' : `${report.targets.roas}x`}. Change the scope above and run again to update this report.</p>
            </div>
            <button type="button" onClick={downloadReport} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
              <Download className="w-4 h-4" /> Export findings CSV
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(({ key, label }) => {
              const current = report.totals[key];
              const previous = report.previousTotals[key];
              const change = current !== null && previous !== null && previous !== 0 ? (current - previous) / Math.abs(previous) * 100 : null;
              return <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{formatMetric(key, current)}</p>
                <p className="mt-2 text-xs text-slate-500">Previous: {formatMetric(key, previous)}</p>
                <p className="mt-1 text-xs text-slate-600">{change === null ? 'No comparable percentage change' : `${change > 0 ? '+' : ''}${change.toFixed(1)}% vs previous period`}</p>
              </div>;
            })}
          </div>
          {report.totals.impressions === 0 && report.totals.cost === 0 && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No delivery was reported for this period. Try a different period and verify the connected account; this is not a clean bill of health.</div>}
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h3 className="text-lg font-semibold text-slate-900">Prioritized review plan</h3>
              <p className="mt-1 text-xs text-slate-500">{report.findings.length} findings. Campaign, query and keyword spend overlap; do not add them together.</p></div>
            <select aria-label="Filter findings by category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          {findings.map((finding) => <article key={finding.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${finding.priority === 'high' ? 'text-amber-600' : 'text-slate-500'}`} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{finding.priority === 'high' ? 'Priority review' : 'Investigate'} / {finding.category}{finding.campaignName ? ` / ${finding.campaignName}` : ''}</p>
                <h4 className="mt-1 font-semibold text-slate-900">{finding.title}</h4>
                <p className="mt-2 text-sm text-slate-600">{finding.evidence}</p>
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><strong>Next step: </strong>{finding.recommendation}</div>
              </div>
            </div>
          </article>)}
          {findings.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            <CheckCircle2 className="w-5 h-5 mb-2 text-slate-400" />
            No findings matched {category === 'All' ? 'the completed checks' : 'this category'}. This is not a guarantee of account health; review coverage below.
          </div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Campaign performance</h3>
            <p className="mt-1 text-xs text-slate-500">{report.campaigns.length} of {report.totalCampaigns} non-removed campaigns, ordered by period spend.</p></div>
          <div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Campaign / current status', 'Spend', 'Conversions', 'CPA', 'ROAS'].map((label) => <th key={label} scope="col" className="px-5 py-3 whitespace-nowrap">{label}</th>)}</tr></thead>
            <tbody>{report.campaigns.map((campaign) => <tr key={campaign.id} className="border-t border-slate-100">
              <td className="px-5 py-3"><span className="font-medium text-slate-900">{campaign.name}</span><p className="text-xs text-slate-500 mt-1">{campaign.channel} / {campaign.status}</p></td>
              <td className="px-5 py-3 whitespace-nowrap">{money(campaign.metrics.cost)}</td>
              <td className="px-5 py-3">{number(campaign.metrics.conversions)}</td>
              <td className="px-5 py-3 whitespace-nowrap">{money(campaign.metrics.cpa)}</td>
              <td className="px-5 py-3">{formatMetric('roas', campaign.metrics.roas)}</td>
            </tr>)}</tbody>
          </table></div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Queries with spend and no recorded conversions</h3>
            <p className="mt-1 text-xs text-slate-500">Up to 150 reported queries by spend. Check intent and conversion lag before adding negatives. EXCLUDED queries are already negatives.</p></div>
          {report.searchTerms === null ? <p className="p-5 text-sm text-amber-800">Search-term checks were unavailable. See coverage below.</p> :
            report.searchTerms.length === 0 ? <p className="p-5 text-sm text-slate-500">No non-converting queries were returned. Google may withhold search terms.</p> :
              <div className="overflow-x-auto"><table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Search query', 'Campaign', 'Spend', 'Clicks', 'Current status'].map((label) => <th key={label} scope="col" className="px-5 py-3 whitespace-nowrap">{label}</th>)}</tr></thead>
                <tbody>{report.searchTerms.map((term) => <tr key={`${term.adGroupId}:${term.searchTerm}`} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-900">{term.searchTerm}</td>
                  <td className="px-5 py-3 text-slate-600">{term.campaignName}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{money(term.metrics.cost)}</td>
                  <td className="px-5 py-3">{number(term.metrics.clicks)}</td>
                  <td className="px-5 py-3 text-xs text-slate-500">{term.status || 'UNKNOWN'}</td>
                </tr>)}</tbody>
              </table></div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Keyword quality review</h3>
          <p className="mt-1 text-xs text-slate-500">Spending keywords in the reviewed sample with current Quality Score at or below 4/10. Scores describe current settings, not the historical period.</p>
          {report.keywords === null ? <p className="mt-3 text-sm text-amber-800">Keyword checks were unavailable. See coverage below.</p> :
            <div className="mt-3 space-y-3">
              {report.keywords.filter((keyword) => keyword.metrics.cost > 0 && typeof keyword.qualityScore === 'number' && keyword.qualityScore <= 4).map((keyword) =>
                <div key={`${keyword.adGroupId}:${keyword.criterionId}`} className="flex flex-wrap justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                  <div><p className="font-medium text-slate-900">{keyword.keyword}</p><p className="mt-1 text-xs text-slate-500">{keyword.campaignName} / {keyword.adGroupName} / {keyword.matchType}</p></div>
                  <div className="text-right"><p className="font-semibold text-amber-700">{keyword.qualityScore}/10</p><p className="mt-1 text-xs text-slate-500">{money(keyword.metrics.cost)} period spend</p></div>
                </div>)}
              {!report.keywords.some((keyword) => keyword.metrics.cost > 0 && typeof keyword.qualityScore === 'number' && keyword.qualityScore <= 4) &&
                <p className="text-sm text-slate-500">No spending keywords with a reported score of 4/10 or below in the reviewed sample. Unavailable scores are not treated as passing.</p>}
            </div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Coverage &amp; methodology</h3>
          <p className="mt-2 text-sm text-slate-600">Completed: campaign efficiency and budget checks{report.keywords ? ', keyword quality checks' : ''}{report.searchTerms ? ', search-query checks' : ''}.
            Not assessed: landing-page content, ad policies, attribution accuracy or tracking implementation. Budget visibility is flagged at 20% lost Search impression share; low Quality Score means 4/10 or below.</p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">{report.warnings.map((warning) => <li key={warning}>- {warning}</li>)}</ul>
          <Link href="/chat" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">Investigate with the AI Marketing Agent <ArrowRight className="w-4 h-4" /></Link>
        </section>
      </>}
    </div>
  );
}
