'use client';

import React, { useMemo } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Monitor,
  MousePointerClick,
  Search,
  ShieldCheck,
  Smartphone,
  Target,
  Tablet,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Campaign, Keyword, SearchTerm, BreakdownItem, AIInsight, AnomalyAlert, AuditLog } from '@/types/adoptimize';
import { CalculatedPeriodMetrics, formatCurrency } from '@/lib/metrics-calculator';

interface DashboardAnalyticsSectionsProps {
  campaigns: Campaign[];
  keywords: Keyword[];
  searchTerms: SearchTerm[];
  deviceBreakdown: BreakdownItem[];
  insights: AIInsight[];
  anomalies: AnomalyAlert[];
  auditLogs: AuditLog[];
  currentMetrics: CalculatedPeriodMetrics;
  previousMetrics: CalculatedPeriodMetrics;
  currency: string;
  monthlySpendCap?: number;
  onOpenCampaign: (campaign: Campaign) => void;
  onOpenReport: (path: string) => void;
  onApplyRecommendation?: (id: string) => void;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-xs text-slate-500">{children}</div>;
}

function Section({ title, description, icon: Icon, children }: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-200/70 bg-emerald-50 text-emerald-700">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Delta({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (!previous) return <span className="text-[11px] text-slate-400">No previous data</span>;
  const percent = ((current - previous) / Math.abs(previous)) * 100;
  const positive = invert ? percent <= 0 : percent >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${positive ? 'text-emerald-700' : 'text-rose-600'}`}>
      {percent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(percent).toFixed(1)}%
    </span>
  );
}

export function DashboardAnalyticsSections({
  campaigns,
  keywords,
  searchTerms,
  deviceBreakdown,
  insights,
  anomalies,
  auditLogs,
  currentMetrics,
  previousMetrics,
  currency,
  monthlySpendCap,
  onOpenCampaign,
  onOpenReport,
  onApplyRecommendation,
}: DashboardAnalyticsSectionsProps) {
  const topCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => b.conversions - a.conversions || b.spend - a.spend).slice(0, 5),
    [campaigns]
  );
  const topKeywords = useMemo(
    () => [...keywords].sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks).slice(0, 5),
    [keywords]
  );
  const topSearchTerms = useMemo(
    () => [...searchTerms].sort((a, b) => b.spend - a.spend).slice(0, 5),
    [searchTerms]
  );
  const auditScore = useMemo(() => {
    if (!campaigns.length && !keywords.length) return null;
    const campaignScore = campaigns.length
      ? campaigns.reduce((sum, campaign) => sum + Math.max(0, Math.min(100, campaign.healthScore || 0)), 0) / campaigns.length
      : 0;
    const qualityScore = keywords.length
      ? (keywords.reduce((sum, keyword) => sum + Math.max(0, Math.min(10, keyword.qualityScore || 0)), 0) / keywords.length) * 10
      : campaignScore;
    return Math.round((campaignScore + qualityScore) / (campaigns.length && keywords.length ? 2 : 1));
  }, [campaigns, keywords]);
  const spendTarget = monthlySpendCap || 0;
  const spendProgress = spendTarget ? Math.min(100, (currentMetrics.spend / spendTarget) * 100) : 0;
  const projectedSpend = currentMetrics.spend;
  const qualityScore = keywords.length
    ? keywords.reduce((sum, keyword) => sum + keyword.qualityScore, 0) / keywords.length
    : null;
  type RankedItem = { id: string; name: string; metric: string; onClick?: () => void };
  const rankedGroups: { title: string; icon: React.ComponentType<{ className?: string }>; items: RankedItem[] }[] = [
    { title: 'Top campaigns', icon: TrendingUp, items: topCampaigns.map((item) => ({ id: item.id, name: item.name, metric: `${item.conversions.toFixed(1)} conv · ${formatCurrency(item.spend, currency)}`, onClick: () => onOpenCampaign(item) })) },
    { title: 'Top keywords', icon: Search, items: topKeywords.map((item) => ({ id: item.id, name: item.keyword, metric: `${item.conversions.toFixed(1)} conv · ${formatCurrency(item.spend, currency)}` })) },
    { title: 'Search terms to review', icon: MousePointerClick, items: topSearchTerms.map((item) => ({ id: item.id, name: item.searchTerm, metric: `${formatCurrency(item.spend, currency)} · ${item.recommendedAction}` })) },
  ];

  return (
    <div className="space-y-8">
      <Section title="Account Performance" description="Current-period performance compared with the previous period." icon={TrendingUp}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ['Spend', formatCurrency(currentMetrics.spend, currency), currentMetrics.spend, previousMetrics.spend, true],
            ['Conversions', currentMetrics.conversions.toLocaleString(), currentMetrics.conversions, previousMetrics.conversions, false],
            ['CPA', formatCurrency(currentMetrics.cpa, currency), currentMetrics.cpa, previousMetrics.cpa, true],
            ['CTR', `${currentMetrics.ctr.toFixed(2)}%`, currentMetrics.ctr, previousMetrics.ctr, false],
            ['ROAS', `${currentMetrics.roas.toFixed(2)}x`, currentMetrics.roas, previousMetrics.roas, false],
          ].map(([label, value, current, previous, invert]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500">{label}</div>
              <div className="mt-1 text-lg font-bold text-slate-900">{value}</div>
              <Delta current={Number(current)} previous={Number(previous)} invert={Boolean(invert)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Performance Analytics" description="PPC Investigator explains the measurable relationship between reach, traffic, cost and conversions." icon={BarChart3}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            ['Impressions', currentMetrics.impressions.toLocaleString(), 'Reach'],
            ['Clicks', currentMetrics.clicks.toLocaleString(), `CTR ${currentMetrics.ctr.toFixed(2)}%`],
            ['Average CPC', formatCurrency(currentMetrics.cpc, currency), 'Traffic cost'],
            ['Conversions', currentMetrics.conversions.toLocaleString(), `Rate ${currentMetrics.conversionRate.toFixed(2)}%`],
            ['Cost / conversion', formatCurrency(currentMetrics.cpa, currency), 'Efficiency'],
          ].map(([label, value, context]) => (
            <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="text-[11px] font-semibold text-slate-500">{label}</div>
              <div className="mt-1 text-base font-bold text-slate-900">{value}</div>
              <div className="mt-1 text-[11px] text-slate-400">{context}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Budget & Distribution" description="Budget pacing is based on the configured account cap. Distribution panels only appear when Google Ads returns those breakdowns." icon={Wallet}>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold text-slate-500">Projected spend</div>
                <div className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(projectedSpend, currency)}</div>
              </div>
              {spendTarget > 0 ? (
                <div className={`text-xs font-bold ${spendProgress > 100 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {spendProgress.toFixed(0)}% of target
                </div>
              ) : <span className="text-xs text-slate-400">Target unavailable</span>}
            </div>
            {spendTarget > 0 ? (
              <>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${spendProgress > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${spendProgress}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                  <span>Actual {formatCurrency(currentMetrics.spend, currency)}</span>
                  <span>Remaining {formatCurrency(Math.max(0, spendTarget - currentMetrics.spend), currency)}</span>
                </div>
              </>
            ) : <EmptyState>Set a monthly spend cap in Settings to enable pacing and overspending warnings.</EmptyState>}
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Globe2 className="h-4 w-4 text-emerald-600" /> Network distribution</div>
            <div className="mt-3"><EmptyState>Google Ads network segmentation is not present in the synchronized dataset.</EmptyState></div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Monitor className="h-4 w-4 text-emerald-600" /> Device distribution</div>
            {deviceBreakdown.length ? (
              <div className="mt-3 space-y-2">{deviceBreakdown.map((item) => <div key={item.name} className="flex items-center justify-between text-xs"><span>{item.name}</span><span className="font-semibold">{item.sharePercent.toFixed(1)}%</span></div>)}</div>
            ) : <div className="mt-3"><EmptyState>Device segmentation is unavailable for this account sync.</EmptyState></div>}
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><MousePointerClick className="h-4 w-4 text-emerald-600" /> Device metrics</div>
            <div className="mt-3"><EmptyState>Spend, impressions, clicks and conversions by device require a device-segment query.</EmptyState></div>
          </div>
        </div>
      </Section>

      <Section title="Account Health & Recommendations" description="AdOptimize health uses synchronized campaign and keyword signals; it is separate from Google's own optimization score." icon={ShieldCheck}>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500">AdOptimize PPC audit score</div>
            <div className="mt-1 text-3xl font-bold text-slate-900">{auditScore === null ? '—' : `${auditScore}/100`}</div>
            <div className="mt-2 text-[11px] text-slate-500">{auditScore === null ? 'Not enough synchronized data.' : 'Based on campaign health and keyword quality signals.'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500">Account quality signals</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{qualityScore === null ? '—' : `${qualityScore.toFixed(1)}/10`}</div>
            <div className="mt-2 text-[11px] text-slate-500">Average keyword Quality Score; not Google&apos;s account-level score.</div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="text-[11px] font-semibold text-slate-500">Google recommendations</div>
            <div className="mt-3"><EmptyState>Google optimization score and recommendation resources are not returned by the current API queries.</EmptyState></div>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><Target className="h-4 w-4 text-emerald-600" /> Landing page health</div>
            <div className="mt-3"><EmptyState>Landing page URL checks require ad-level URLs and an external HTTP monitor, which are not synchronized yet.</EmptyState></div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Express optimizations</div>
            {insights.length ? <div className="mt-3 space-y-2">{insights.slice(0, 4).map((insight) => <div key={insight.id} className="rounded-xl bg-slate-50 p-3 text-xs"><div className="font-semibold text-slate-800">{insight.problem}</div><div className="mt-1 text-slate-500">{insight.recommendedAction}</div></div>)}</div> : <div className="mt-3"><EmptyState>No actionable optimization opportunities were returned.</EmptyState></div>}
          </div>
        </div>
      </Section>

      <Section title="AI Intelligence" description="Existing real insights and anomaly evidence, without duplicating the dashboard's primary insight cards." icon={Search}>
        {anomalies.length || insights.length ? (
          <div className="grid gap-3 md:grid-cols-2">{[...insights.slice(0, 2), ...anomalies.slice(0, 2)].map((item) => <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs"><div className="text-xs font-bold text-slate-800">{'problem' in item ? item.problem : item.title}</div><div className="mt-1 text-[11px] text-slate-500">{'problem' in item ? item.whyItMatters : item.whyItMatters}</div></div>)}</div>
        ) : <EmptyState>No AI insights or performance alerts are available for this period.</EmptyState>}
      </Section>

      <Section title="Account Activity" description="Recent synchronized account changes recorded by AdOptimize." icon={Activity}>
        {auditLogs.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white"><table className="w-full text-left text-xs"><thead className="border-b border-slate-100 text-[11px] text-slate-500"><tr><th className="p-3">Time</th><th className="p-3">Campaign</th><th className="p-3">Change</th><th className="p-3">Source</th></tr></thead><tbody>{auditLogs.slice(0, 8).map((log) => <tr key={log.id} className="border-b border-slate-50 last:border-0"><td className="p-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td><td className="p-3 font-semibold">{log.campaignName}</td><td className="p-3">{log.actionType}: {log.previousValue} → {log.newValue}</td><td className="p-3 text-slate-500">{log.source}</td></tr>)}</tbody></table></div> : <EmptyState>No account changes have been recorded.</EmptyState>}
      </Section>

      <Section title="Google Ads Campaigns" description="Top synchronized campaign, keyword and search-term elements." icon={BarChart3}>
        <div className="grid gap-3 lg:grid-cols-3">
          {rankedGroups.map((group) => (
            <div key={group.title} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800"><group.icon className="h-4 w-4 text-emerald-600" />{group.title}</div>
              {group.items.length ? <div className="mt-3 space-y-2">{group.items.map((item) => <button key={item.id} type="button" onClick={item.onClick} className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-50 p-2.5 text-left hover:bg-emerald-50"><span className="truncate text-xs font-semibold text-slate-800">{item.name}</span><span className="shrink-0 text-[10px] text-slate-500">{item.metric}</span></button>)}</div> : <div className="mt-3"><EmptyState>No synchronized data.</EmptyState></div>}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
