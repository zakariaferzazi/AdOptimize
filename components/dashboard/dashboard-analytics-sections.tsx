'use client';

import React, { useMemo } from 'react';
import { BarChart3, Globe2, Monitor, MousePointerClick, Search, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { Campaign, Keyword, SearchTerm, BreakdownItem } from '@/types/adoptimize';
import { CalculatedPeriodMetrics, formatCurrency } from '@/lib/metrics-calculator';

interface DashboardAnalyticsSectionsProps {
  campaigns: Campaign[];
  keywords: Keyword[];
  searchTerms: SearchTerm[];
  deviceBreakdown: BreakdownItem[];
  networkBreakdown: BreakdownItem[];
  currentMetrics: CalculatedPeriodMetrics;
  currency: string;
  monthlySpendCap?: number;
  onOpenCampaign: (campaign: Campaign) => void;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-xs text-slate-500">{children}</div>;
}

function Section({ title, description, icon: Icon, children }: { title: string; description: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-200/70 bg-emerald-50 text-emerald-700"><Icon className="h-4 w-4" /></div>
        <div><h2 className="text-sm font-bold text-slate-900">{title}</h2><p className="text-[11px] text-slate-500">{description}</p></div>
      </div>
      {children}
    </section>
  );
}

export function DashboardAnalyticsSections({
  campaigns,
  keywords,
  searchTerms,
  deviceBreakdown,
  networkBreakdown,
  currentMetrics,
  currency,
  monthlySpendCap,
  onOpenCampaign,
}: DashboardAnalyticsSectionsProps) {
  const qualityScore = keywords.length ? keywords.reduce((sum, keyword) => sum + keyword.qualityScore, 0) / keywords.length : null;
  const auditScore = campaigns.length
    ? Math.round(campaigns.reduce((sum, campaign) => sum + Math.max(0, Math.min(100, campaign.healthScore || 0)), 0) / campaigns.length)
    : null;
  const spendTarget = monthlySpendCap || 0;
  const spendProgress = spendTarget ? Math.min(100, (currentMetrics.spend / spendTarget) * 100) : 0;
  type RankedItem = { id: string; name: string; metric: string; onClick?: () => void };
  type RankedGroup = { title: string; icon: React.ComponentType<{ className?: string }>; items: RankedItem[] };
  const rankedGroups = useMemo<RankedGroup[]>(() => [
    { title: 'Top campaigns', icon: TrendingUp, items: [...campaigns].sort((a, b) => b.conversions - a.conversions || b.spend - a.spend).slice(0, 5).map((item) => ({ id: item.id, name: item.name, metric: `${item.conversions.toFixed(1)} conv · ${formatCurrency(item.spend, currency)}`, onClick: () => onOpenCampaign(item) })) },
    { title: 'Top keywords', icon: Search, items: [...keywords].sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks).slice(0, 5).map((item) => ({ id: item.id, name: item.keyword, metric: `${item.conversions.toFixed(1)} conv · ${formatCurrency(item.spend, currency)}` })) },
    { title: 'Search terms to review', icon: MousePointerClick, items: [...searchTerms].sort((a, b) => b.spend - a.spend).slice(0, 5).map((item) => ({ id: item.id, name: item.searchTerm, metric: `${formatCurrency(item.spend, currency)} · ${item.recommendedAction}` })) },
  ], [campaigns, keywords, searchTerms, currency, onOpenCampaign]);
  const renderBreakdown = (items: BreakdownItem[]) => items.length ? (
    <div className="mt-3 space-y-2.5">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {items.map((item, index) => <div key={item.name} title={`${item.name}: ${item.sharePercent.toFixed(1)}%`} className={`h-full ${['bg-emerald-500', 'bg-sky-500', 'bg-violet-500', 'bg-amber-400', 'bg-rose-400'][index % 5]}`} style={{ width: `${item.sharePercent}%` }} />)}
      </div>
      {items.slice(0, 6).map((item) => <div key={item.name} className="flex items-center justify-between text-xs"><span className="capitalize text-slate-600">{item.name.toLowerCase()}</span><span className="font-semibold text-slate-800">{item.sharePercent.toFixed(1)}% · {formatCurrency(item.spend, currency)}</span></div>)}
    </div>
  ) : <div className="mt-3"><EmptyState>Segmentation is unavailable for this account sync.</EmptyState></div>;

  return (
    <div className="space-y-8">
      <Section title="Budget & Distribution" description="Budget pacing and available Google Ads distribution data." icon={Wallet}>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs lg:col-span-2">
            <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold text-slate-500">Projected spend</div><div className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(currentMetrics.spend, currency)}</div></div>{spendTarget > 0 ? <div className={`text-xs font-bold ${spendProgress >= 100 ? 'text-rose-600' : 'text-emerald-700'}`}>{spendProgress.toFixed(0)}% of target</div> : <span className="text-xs text-slate-400">Target unavailable</span>}</div>
            {spendTarget > 0 ? <><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${spendProgress >= 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${spendProgress}%` }} /></div><div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>Actual {formatCurrency(currentMetrics.spend, currency)}</span><span>Remaining {formatCurrency(Math.max(0, spendTarget - currentMetrics.spend), currency)}</span></div></> : <EmptyState>Set a monthly spend cap in Settings to enable pacing and overspending warnings.</EmptyState>}
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs"><div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Globe2 className="h-4 w-4 text-emerald-600" />Network distribution</div>{renderBreakdown(networkBreakdown)}</div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs"><div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Monitor className="h-4 w-4 text-emerald-600" />Device distribution</div>{renderBreakdown(deviceBreakdown)}</div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs"><div className="flex items-center gap-2 text-xs font-bold text-slate-800"><MousePointerClick className="h-4 w-4 text-emerald-600" />Device metrics</div><div className="mt-3"><EmptyState>Device-level spend, impressions, clicks and conversions are unavailable.</EmptyState></div></div>
        </div>
      </Section>

      <Section title="Account Health & Recommendations" description="AdOptimize health signals are separate from Google&apos;s keyword Quality Score and optimization score." icon={ShieldCheck}>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs"><div className="text-[11px] font-semibold text-slate-500">AdOptimize PPC audit score</div><div className="mt-1 text-3xl font-bold text-slate-900">{auditScore === null ? '—' : `${auditScore}/100`}</div><div className="mt-2 text-[11px] text-slate-500">{auditScore === null ? 'Not enough synchronized data.' : 'Based on campaign health signals.'}</div></div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs"><div className="text-[11px] font-semibold text-slate-500">Account quality signals</div><div className="mt-1 text-xl font-bold text-slate-900">{qualityScore === null ? '—' : `${qualityScore.toFixed(1)}/10`}</div><div className="mt-2 text-[11px] text-slate-500">Average keyword Quality Score; not an account-level score.</div></div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs"><div className="text-[11px] font-semibold text-slate-500">Google recommendations</div><div className="mt-3"><EmptyState>Google optimization recommendations are not returned by the current API queries.</EmptyState></div></div>
        </div>
      </Section>

      <Section title="Google Ads Campaigns" description="Top synchronized campaign, keyword and search-term elements." icon={BarChart3}>
        <div className="grid gap-3 lg:grid-cols-3">{rankedGroups.map((group) => <div key={group.title} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs"><div className="flex items-center gap-2 text-xs font-bold text-slate-800"><group.icon className="h-4 w-4 text-emerald-600" />{group.title}</div>{group.items.length ? <div className="mt-3 space-y-2">{group.items.map((item) => <button key={item.id} type="button" onClick={item.onClick} className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-2.5 text-left hover:bg-emerald-50"><span className="truncate text-xs font-semibold text-slate-800">{item.name}</span><span className="shrink-0 text-[10px] text-slate-500">{item.metric}</span></button>)}</div> : <div className="mt-3"><EmptyState>No synchronized data.</EmptyState></div>}</div>)}</div>
      </Section>
    </div>
  );
}
