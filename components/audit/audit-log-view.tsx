'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Download, History, Loader2, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { fetchUserAuditLogs } from '@/lib/firestore-service';
import { activityOutcomes, appLogEntry, type ActivityEntry, type ActivityPage } from '@/lib/activity';
import { downloadCsv, toCsv } from '@/lib/csv';

async function loadAgentActivity(token: string, signal: AbortSignal, cursor?: string): Promise<ActivityPage> {
  const response = await fetch(`/api/activity${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store',
  });
  const data: ActivityPage & { error?: string } = await response.json();
  if (!response.ok || !Array.isArray(data.entries)) throw new Error(data.error || 'AI workflow history could not be loaded.');
  return data;
}

export function AuditLogView({ userId, accountId, accountName }: { userId?: string; accountId: string; accountName: string }) {
  const [agentEntries, setAgentEntries] = useState<ActivityEntry[]>([]);
  const [appEntries, setAppEntries] = useState<ActivityEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [durable, setDurable] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(userId && accountId));
  const [loadingMore, setLoadingMore] = useState(false);
  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const moreRequest = useRef<AbortController | null>(null);
  useEffect(() => () => moreRequest.current?.abort(), []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        if (!userId || auth.currentUser?.uid !== userId) throw new Error('Sign in to load your saved activity.');
        const token = await auth.currentUser.getIdToken();
        const [agent, app] = await Promise.allSettled([
          loadAgentActivity(token, controller.signal), fetchUserAuditLogs(userId, { accountId, requireServer: true }),
        ]);
        if (controller.signal.aborted) return;
        const failures: string[] = [];
        if (agent.status === 'fulfilled' && agent.value.account.customerId === accountId) {
          setAgentEntries(agent.value.entries);
          setNextCursor(agent.value.nextCursor);
          setDurable(agent.value.durable);
        } else if (agent.status === 'rejected') {
          console.error('[Activity] AI history failed:', agent.reason);
          failures.push(`AI workflow history: ${agent.reason instanceof Error ? agent.reason.message : 'Could not be loaded. Refresh to retry.'}`);
        } else {
          failures.push('The connected account changed. Reload this page before reviewing its activity.');
        }
        if (app.status === 'fulfilled') {
          const scoped = app.value.filter((log) => log.accountId?.replace(/\D/g, '') === accountId);
          setAppEntries(scoped.slice(0, 200).map(appLogEntry));
          if (scoped.length > 200) failures.push('Only the latest 200 app records are loaded. AI workflow history can be paged separately.');
        } else {
          console.error('[Activity] App history failed:', app.reason);
          failures.push('App records could not be loaded. AI workflow results, when available, are shown separately.');
        }
        setErrors(failures);
      } catch (failure) {
        if (controller.signal.aborted) return;
        console.error('[Activity] Read failed:', failure);
        setErrors([failure instanceof Error ? failure.message : 'Saved activity could not be loaded.']);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    if (userId && accountId) void load();
    return () => controller.abort();
  }, [userId, accountId, version]);

  const refresh = () => {
    moreRequest.current?.abort();
    setLoadingMore(false);
    setLoading(true);
    setErrors([]);
    setAgentEntries([]);
    setAppEntries([]);
    setNextCursor(null);
    setVersion((value) => value + 1);
  };
  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    const controller = new AbortController();
    moreRequest.current = controller;
    setLoadingMore(true);
    try {
      if (!userId || auth.currentUser?.uid !== userId) throw new Error('Sign in to load older activity.');
      const token = await auth.currentUser.getIdToken();
      const page = await loadAgentActivity(token, controller.signal, nextCursor);
      if (controller.signal.aborted) return;
      if (page.account.customerId !== accountId) throw new Error('The connected account changed. Reload this page to continue.');
      setAgentEntries((existing) => [...new Map([...existing, ...page.entries].map((entry) => [entry.id, entry])).values()]);
      setNextCursor(page.nextCursor);
    } catch (failure) {
      if (controller.signal.aborted) return;
      console.error('[Activity] Older history failed:', failure);
      setErrors((existing) => [...existing, failure instanceof Error ? failure.message : 'Older activity could not be loaded.']);
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

  const all = [...agentEntries, ...appEntries].sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.id.localeCompare(a.id));
  const invalidDates = Boolean(startDate && endDate && startDate > endDate);
  const entries = all.filter((entry) => {
    const time = new Date(entry.timestamp).getTime();
    return !invalidDates && (outcome === 'ALL' || entry.outcome === outcome) && (source === 'ALL' || entry.source === source) &&
      (!startDate || time >= new Date(`${startDate}T00:00:00`).getTime()) &&
      (!endDate || time <= new Date(`${endDate}T23:59:59.999`).getTime()) &&
      [entry.title, entry.target, entry.operation, entry.summary, entry.actor, entry.proposalId || ''].join(' ').toLowerCase().includes(search.trim().toLowerCase());
  });
  const attention = all.filter((entry) => entry.outcome === 'failed' || entry.outcome === 'unverified').length;
  const exportCsv = () => downloadCsv(toCsv([
    ['Timestamp (UTC)', 'Outcome', 'Action', 'Target', 'Source', 'Actor', 'Summary', 'Details', 'Proposal ID'],
    ...entries.map((entry) => [
      entry.timestamp, activityOutcomes[entry.outcome], entry.title, entry.target, entry.source,
      entry.actor, entry.summary, entry.message || '', entry.proposalId || '',
    ]),
  ]), `adoptimize-activity-${accountId}.csv`);
  const inputClass = 'min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return <div className="space-y-6 max-w-7xl mx-auto">
    <section className="rounded-3xl bg-slate-950 p-6 sm:p-8 text-white">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300"><History className="w-4 h-4" /> AdOptimize activity</p>
      <h2 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">Know what was proposed, approved and actually verified.</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Review saved AI workflow events and account-linked app records. An approval is not an execution, and an accepted request is not a verified outcome.</p>
      <p className="mt-4 text-xs text-slate-400">{accountName} {accountId && `/ ${accountId}`} / Changes made outside AdOptimize are not included.</p>
    </section>

    {!userId || !accountId ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">{!userId ? 'Sign in' : 'Select a Google Ads account'} to view its saved activity. <Link className="underline" href="/settings">Open settings</Link></div> : <>
      <div className="grid gap-3 sm:grid-cols-3">
        {[['Loaded events', all.length], ['Verified executions', all.filter((entry) => entry.outcome === 'verified').length], ['Failed / needs verification', attention]].map(([label, count]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{count}</p></div>)}
      </div>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="font-semibold text-slate-900">Account activity</h3><p className="mt-1 text-xs text-slate-500">Newest first. Search and filters apply to loaded records. Times and date filters use your browser&apos;s local time.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={refresh} disabled={loading || loadingMore} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
            <button type="button" onClick={exportCsv} disabled={loading || !entries.length} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><Download className="w-4 h-4" /> Export filtered CSV</button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-slate-500">Search activity<input aria-label="Search activity" type="search" className={`${inputClass} mt-1.5 w-full`} placeholder="Campaign, action or proposal ID" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="text-xs text-slate-500">Outcome<select className={`${inputClass} mt-1.5 w-full`} value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="ALL">All outcomes</option>{Object.entries(activityOutcomes).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          <label className="text-xs text-slate-500">Source<select className={`${inputClass} mt-1.5 w-full`} value={source} onChange={(event) => setSource(event.target.value)}><option value="ALL">All sources</option><option>AI workflow</option><option>App record</option></select></label>
          <label className="text-xs text-slate-500">From date<input className={`${inputClass} mt-1.5 w-full`} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="text-xs text-slate-500">Through date<input className={`${inputClass} mt-1.5 w-full`} type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <button type="button" onClick={() => { setSearch(''); setOutcome('ALL'); setSource('ALL'); setStartDate(''); setEndDate(''); }} className="self-end rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600">Reset filters</button>
        </div>
        {invalidDates && <p role="alert" className="text-sm text-rose-700">End date must not be before start date.</p>}
        {!durable && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">AI workflow storage is running in local memory. These events will not survive a server restart. Production requires Cloudflare D1.</p>}
        {errors.map((error, index) => <p role="alert" key={`${index}:${error}`} className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p>)}
        {loading ? <div role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading saved activity...</div> : <>
          <p className="text-xs text-slate-500">{entries.length} of {all.length} loaded events match. Load older AI events below to search further.</p>
          <div className="space-y-3">
            {entries.map((entry) => <details key={entry.id} className="group rounded-xl border border-slate-200">
              <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()} / {entry.source} / {entry.actor}</p>
                  <h4 className="mt-1.5 font-semibold text-sm text-slate-900">{entry.title}</h4>
                  <p className="mt-1 break-words text-sm text-slate-600">{entry.target}</p>
                  <p className="mt-1 text-xs text-slate-400">Expand for details</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.outcome === 'verified' ? 'bg-emerald-50 text-emerald-800' : entry.outcome === 'failed' ? 'bg-rose-50 text-rose-800' : entry.outcome === 'unverified' ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>{activityOutcomes[entry.outcome]}</span>
              </summary>
              <div className="space-y-3 border-t border-slate-100 p-4 text-sm text-slate-600">
                <p className="break-words">{entry.summary}</p>
                {entry.message && <p className="rounded-lg bg-slate-50 p-3 break-words">{entry.message}</p>}
                {entry.outcome === 'approved' && <p>Approval was recorded at this time. Look for an execution event to confirm what happened afterward.</p>}
                {entry.changes.length > 0 && <ul className="list-disc space-y-1 pl-5">{entry.changes.map((change, index) => <li key={index}>{change}</li>)}</ul>}
                <p className="text-xs text-slate-500 break-all">Operation: {entry.operation || 'Not recorded'}{entry.proposalId && ` / Proposal: ${entry.proposalId}`}</p>
                {(entry.before !== undefined || entry.after !== undefined) && <div className="grid gap-3 sm:grid-cols-2">
                  {[['Recorded before', entry.before], ['Recorded after', entry.after]].map(([label, value]) => <div key={String(label)} className="min-w-0 rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{String(label)}</p><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">{value === undefined ? 'Not recorded' : typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</pre></div>)}
                </div>}
              </div>
            </details>)}
            {!entries.length && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{errors.length ? 'History is incomplete. Refresh to retry unavailable sources.' : all.length ? 'No loaded activity matches these filters.' : 'No recorded AdOptimize activity for this account yet. Proposals, approvals and executions will appear here as you use the AI Marketing Agent.'}</div>}
          </div>
          {nextCursor && <div className="pt-2 text-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{loadingMore && <Loader2 className="w-4 h-4 animate-spin" />} Load older AI events</button></div>}
        </>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500">
        <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> This is a read-only history, not a rollback tool. To undo a change, ask the agent to read the current state and prepare a new proposal for your approval.</p>
        <p className="mt-2">Verified means the AI execution was confirmed by a Google Ads read-back at that time, not that the account is unchanged now. App records are not read-back verified. Proposal details describe the recorded proposal, not current live settings.</p>
        <p className="mt-2">Older app records without an account ID are excluded to avoid mixing account histories. Up to 200 account-linked app records are shown; use Load older AI events for earlier AI workflow history.</p>
        <Link href="/chat" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">Open AI Marketing Agent <ArrowRight className="w-4 h-4" /></Link>
      </section>
    </>}
  </div>;
}
