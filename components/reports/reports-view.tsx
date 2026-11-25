'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AppLoader } from '@/components/ui/app-loader';
import Link from 'next/link';
import { ArrowRight, Download, FileText, Loader2, Printer } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { downloadCsv } from '@/lib/csv';
import { buildPerformanceCsv } from '@/lib/google-ads/report-csv';
import type { PerformanceReport } from '@/lib/google-ads/performance-report';
import type { Metrics } from '@/lib/google-ads/reporting';

const periods = [
  ['LAST_7_DAYS', 'Last 7 complete days'], ['LAST_14_DAYS', 'Last 14 complete days'],
  ['LAST_30_DAYS', 'Last 30 complete days'], ['LAST_90_DAYS', 'Last 90 complete days'],
  ['THIS_MONTH', 'This month'], ['LAST_MONTH', 'Last month'], ['CUSTOM', 'Custom dates'],
];
const metricLabels: Array<{ key: keyof Metrics; label: string }> = [
  { key: 'cost', label: 'Spend' }, { key: 'conversions', label: 'Conversions' },
  { key: 'cpa', label: 'Cost / conversion' }, { key: 'roas', label: 'ROAS' },
  { key: 'impressions', label: 'Impressions' }, { key: 'clicks', label: 'Clicks' },
  { key: 'ctr', label: 'CTR' }, { key: 'conversionValue', label: 'Recorded conversion value' },
];

export function ReportsView({ userId, connected }: { userId?: string; connected: boolean }) {
  const [period, setPeriod] = useState('LAST_30_DAYS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [sort, setSort] = useState('cost');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setReport(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      if (!userId || auth.currentUser?.uid !== userId) throw new Error('Sign in to generate a report.');
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/google-ads/report', {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(period === 'CUSTOM' ? { startDate, endDate } : { dateRange: period }),
      });
      const data: { report?: PerformanceReport; error?: string } = await response.json();
      if (!response.ok || !data.report) throw new Error(data.error || 'The report returned no data.');
      setReport(data.report);
      setSearch('');
      setStatus('ALL');
    } catch (failure) {
      if (controller.signal.aborted) return;
      console.error('[Reports] Generation failed:', failure);
      setError(failure instanceof Error ? failure.message : 'The report could not be generated.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const money = (value: number) => new Intl.NumberFormat(undefined, {
    style: 'currency', currency: report?.account.currency || 'USD', maximumFractionDigits: 2,
  }).format(value);
  const number = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  const format = (key: keyof Metrics, value: number | null) => {
    if (value === null) return 'Not available';
    if (['cost', 'cpa', 'conversionValue', 'avgCpc'].includes(key)) return money(value);
    return `${number(value)}${key === 'roas' ? 'x' : key === 'ctr' || key === 'conversionRate' ? '%' : ''}`;
  };
  const campaigns = (report?.campaigns || [])
    .filter((campaign) => (status === 'ALL' || campaign.status === status) &&
      `${campaign.name} ${campaign.id} ${campaign.channel}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((left, right) => {
      const key = sort === 'conversions' ? 'conversions' : sort === 'cpa' ? 'cpa' : sort === 'roas' ? 'roas' : 'cost';
      const a = left.metrics[key];
      const b = right.metrics[key];
      if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
      return (key === 'cpa' ? a - b : b - a) || left.name.localeCompare(right.name);
    });
  const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return <div className="space-y-6 max-w-7xl mx-auto">
    <section className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white print:hidden">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300"><FileText className="w-4 h-4" /> Performance reports</p>
      <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">A clear view of what your ad spend delivered.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Build a report for your chosen dates, compare the previous period, and share campaign results. Direct Google Ads reporting, not estimates from a cached dashboard.</p>
    </section>

    <form onSubmit={generate} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 print:hidden">
      <h3 className="font-semibold text-slate-900">Report period</h3>
      <p className="mt-1 text-xs text-slate-500">All non-removed campaigns. Dates use your Google Ads account time zone. Custom periods support up to 366 days.</p>
      <fieldset disabled={loading} className="mt-4 flex flex-wrap items-end gap-4">
        <label className="min-w-0 w-full sm:w-64 text-xs font-medium text-slate-700">Reporting period
          <select className={inputClass} value={period} onChange={(event) => setPeriod(event.target.value)}>{periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        </label>
        {period === 'CUSTOM' && <>
          <label className="w-full sm:w-auto text-xs font-medium text-slate-700">Start date<input className={inputClass} type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="w-full sm:w-auto text-xs font-medium text-slate-700">End date<input className={inputClass} type="date" required min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
        </>}
        <button disabled={loading || !userId || !connected} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-50">
          {loading && <AppLoader className="h-5 w-5" />}{loading ? 'Generating...' : 'Generate report'}
        </button>
      </fieldset>
      {!userId || !connected ? <p className="mt-4 text-sm text-amber-800">{!userId ? 'Sign in' : 'Connect a Google Ads account'} to generate reports. <Link className="underline" href="/settings">Open settings</Link></p> : null}
    </form>

    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
    {loading && <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">Reading selected-period and previous-period performance from Google Ads...</div>}
    {!report && !loading && !error && <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Choose a period and generate a report. CSV and print exports become available when the report is ready.</div>}

    {report && <article data-print-report className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 print:border-0 print:p-0">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">AdOptimize / Google Ads performance</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950 break-words">{report.account.name}</h3>
          <p className="mt-1 text-sm text-slate-700">{report.dateRange.startDate} to {report.dateRange.endDate}</p>
          <p className="mt-1 text-xs text-slate-500">Compared with {report.previousRange.startDate} to {report.previousRange.endDate}.</p>
          <p className="mt-1 text-xs text-slate-500">Account {report.account.customerId} / {report.account.timeZone} / {report.account.currency}</p>
          <p className="mt-1 text-xs text-slate-500">Generated {new Date(report.generatedAt).toLocaleString()}</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" disabled={!campaigns.length} onClick={() => downloadCsv(buildPerformanceCsv(campaigns, report.account.currency), `google-ads-campaigns-${report.dateRange.startDate}-${report.dateRange.endDate}.csv`)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><Download className="w-4 h-4" /> Export campaign CSV</button>
          <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><Printer className="w-4 h-4" /> Print / Save PDF</button>
        </div>
      </header>

      <section>
        <h4 className="font-semibold text-slate-900">Account performance</h4>
        <p className="mt-1 text-xs text-slate-500">Totals cover all {report.totalCampaigns} non-removed campaigns, independent of the table filters below.</p>
        <div className="mt-4 grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-3">
          {metricLabels.map(({ key, label }) => {
            const current = report.totals[key];
            const previous = report.previousTotals[key];
            const delta = current !== null && previous !== null && previous !== 0 ? (current - previous) / Math.abs(previous) * 100 : null;
            return <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-4 break-inside-avoid">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{format(key, current)}</p>
              <p className="mt-2 text-xs text-slate-500">Previous: {format(key, previous)}</p>
              <p className="mt-1 text-xs text-slate-600">{delta === null ? 'No comparable percentage change' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}% vs previous`}</p>
            </div>;
          })}
        </div>
        {report.totals.cost === 0 && report.totals.impressions === 0 && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No delivery was reported for these dates. Check the account and period before drawing conclusions.</p>}
      </section>

      <section className="space-y-4">
        <div><h4 className="font-semibold text-slate-900">Campaign breakdown</h4>
          <p className="mt-1 text-xs text-slate-500">{campaigns.length} shown / {report.campaigns.length} loaded / {report.totalCampaigns} total. CSV and print use the table&apos;s current filters and ordering.</p></div>
        <div className="flex flex-wrap gap-3 print:hidden">
          <input aria-label="Search campaigns" type="search" placeholder="Search name, ID or type" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <select aria-label="Filter campaign status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="ALL">All current statuses</option><option value="ENABLED">Enabled</option><option value="PAUSED">Paused</option></select>
          <select aria-label="Sort campaigns" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="cost">Highest spend</option><option value="conversions">Most conversions</option><option value="cpa">Lowest CPA</option><option value="roas">Highest ROAS</option></select>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500"><tr>{['Campaign / current settings', 'Spend', 'Clicks', 'Conversions', 'CPA', 'ROAS'].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead>
            <tbody>{campaigns.map((campaign) => <tr key={campaign.id} className="border-t border-slate-100">
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{campaign.name}</p><p className="mt-1 text-slate-500">{campaign.channel} / {campaign.status} / #{campaign.id}</p></td>
              <td className="px-4 py-3 whitespace-nowrap">{money(campaign.metrics.cost)}</td>
              <td className="px-4 py-3">{number(campaign.metrics.clicks)}</td>
              <td className="px-4 py-3">{number(campaign.metrics.conversions)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{format('cpa', campaign.metrics.cpa)}</td>
              <td className="px-4 py-3 whitespace-nowrap">{format('roas', campaign.metrics.roas)}</td>
            </tr>)}
              {!campaigns.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">{report.campaigns.length ? 'No campaigns match these filters.' : 'No non-removed campaigns were returned.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-slate-100 pt-5">
        <h4 className="font-semibold text-slate-900">Reporting notes</h4>
        <ul className="mt-2 space-y-2 text-xs leading-5 text-slate-500">{report.warnings.map((warning) => <li key={warning}>- {warning}</li>)}</ul>
        <Link href="/audit" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 print:hidden">Find evidence-led next steps in Ads Audit <ArrowRight className="w-4 h-4" /></Link>
      </section>
    </article>}
    <style>{`@media print {
      @page { margin: 14mm; }
      body:has([data-print-report]) *:not([data-print-report]):not([data-print-report] *):not(:has([data-print-report])) { display: none !important; }
      body:has([data-print-report]), body:has([data-print-report]) :has([data-print-report]) {
        display: block !important; min-height: 0 !important; max-width: none !important;
        padding: 0 !important; margin: 0 !important; overflow: visible !important; background: white !important;
      }
      [data-print-report] .overflow-x-auto { overflow: visible; }
      [data-print-report] table { font-size: 9px; }
      [data-print-report] tr { break-inside: avoid; }
    }`}</style>
  </div>;
}
