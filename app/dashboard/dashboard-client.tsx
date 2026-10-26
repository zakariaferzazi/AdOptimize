'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PerformanceChart } from '@/components/dashboard/performance-chart';
import { AccountMonitorCard } from '@/components/dashboard/account-monitor-card';
import { AnomaliesWidget } from '@/components/dashboard/anomalies-widget';
import { CampaignsTable } from '@/components/dashboard/campaigns-table';
import { CampaignDetailDrawer } from '@/components/campaigns/campaign-detail-drawer';
import { useAdOptimize } from '@/context/adoptimize-context';
import { computeAccountMetrics } from '@/lib/mock-data';
import {
  DollarSign,
  TrendingUp,
  Target,
  Percent,
  Sparkles,
  Sliders,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Campaign, DateRangePeriod } from '@/types/adoptimize';

export function DashboardClientView() {
  const router = useRouter();
  const {
    state,
    setState,
    user,
    setShowConnectModal,
    showToast,
    handleSaveCampaign,
    selectedCampaign,
    setSelectedCampaign,
  } = useAdOptimize();

  const { account, campaigns, anomalies, keywords, searchTerms, isDemoMode } = state;
  const metrics = computeAccountMetrics(campaigns);

  const [dateRange, setDateRange] = useState<DateRangePeriod>('LAST_30_DAYS');

  const handleToggleCampaignStatus = async (campaignId: string) => {
    const target = campaigns.find((c) => c.id === campaignId);
    if (!target) return;
    const newStatus = target.status === 'ENABLED' ? 'PAUSED' : 'ENABLED';
    const updated = { ...target, status: newStatus as any };
    await handleSaveCampaign(updated);
  };

  const handleUpdateBudget = async (campaignId: string, newBudget: number) => {
    const target = campaigns.find((c) => c.id === campaignId);
    if (!target) return;
    const updated = { ...target, budgetDaily: newBudget };
    await handleSaveCampaign(updated);
  };

  return (
    <AppShell title="Executive Overview">
      <div className="space-y-6">
        {/* Top KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Ad Spend (30d)"
            value={`$${metrics.spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            changeText="-4.8%"
            isPositiveChange={true}
            icon={DollarSign}
            subContext="vs. previous period"
          />
          <MetricCard
            label="Total Conversions"
            value={metrics.conversions.toLocaleString()}
            changeText="+12.4%"
            isPositiveChange={true}
            icon={Target}
            subContext="vs. previous period"
          />
          <MetricCard
            label="Blended Cost / Conv"
            value={`$${metrics.cpa.toFixed(2)}`}
            changeText="-8.1%"
            isPositiveChange={true}
            icon={Percent}
            subContext="target: <$45.00"
          />
          <MetricCard
            label="Blended Account ROAS"
            value={`${metrics.roas.toFixed(2)}x`}
            changeText="+18.2%"
            isPositiveChange={true}
            icon={TrendingUp}
            subContext="benchmark: >3.0x"
          />
        </div>

        {/* Charts & Account Monitor Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PerformanceChart
              selectedPeriod={dateRange}
              onSelectPeriod={setDateRange}
              campaigns={campaigns}
            />
          </div>
          <div>
            <AccountMonitorCard
              account={account}
              totalSpend={metrics.spend}
              onOpenSettings={() => router.push('/settings')}
              onOpenOptimizer={() => router.push('/optimizer')}
            />
          </div>
        </div>

        {/* Active Anomalies & Opportunity Callout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AnomaliesWidget
              anomalies={anomalies}
              onSelectAnomaly={(anomaly) => {
                const camp = campaigns.find((c) => c.id === anomaly.campaignId);
                if (camp) {
                  setSelectedCampaign(camp);
                } else {
                  router.push('/audit');
                }
              }}
              onViewAll={() => router.push('/audit')}
            />
          </div>

          {/* Quick Actions & Shortcut Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>One-Click Optimizations</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Optimization Tools Ready
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Scan search terms for wasted spend, audit low-ROAS broad terms, and reallocate budget to profitable campaigns.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/optimizer"
                className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-between transition-colors shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#00d67d]" />
                  <span>Open Budget Optimizer</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                href="/audit"
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Run Full AI Audit</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Live Campaigns Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Active Campaigns</h2>
              <p className="text-xs text-slate-500">
                Direct SearchStream metrics synced from your Google Ads account.
              </p>
            </div>
            <Link
              href="/campaigns"
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>View All Campaigns</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <CampaignsTable
            campaigns={campaigns}
            onSelectCampaign={(c) => setSelectedCampaign(c)}
            onToggleStatus={handleToggleCampaignStatus}
            onViewAll={() => router.push('/campaigns')}
          />
        </div>
      </div>

      {/* Campaign Detail Drawer */}
      {selectedCampaign && (
        <CampaignDetailDrawer
          campaign={selectedCampaign}
          isOpen={Boolean(selectedCampaign)}
          onClose={() => setSelectedCampaign(null)}
          onUpdateBudget={(newBudget) => handleUpdateBudget(selectedCampaign.id, newBudget)}
          onToggleStatus={() => handleToggleCampaignStatus(selectedCampaign.id)}
          keywords={keywords.filter((k) => k.campaignId === selectedCampaign.id)}
          searchTerms={searchTerms.filter((st) => st.campaignId === selectedCampaign.id)}
          userEmail={user?.email}
        />
      )}
    </AppShell>
  );
}
