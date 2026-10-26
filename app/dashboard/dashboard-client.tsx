'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { MetricCard } from '@/components/dashboard/metric-card';
import { PerformanceChart } from '@/components/dashboard/performance-chart';
import { AiInsightsPanel } from '@/components/dashboard/ai-insights-panel';
import { AnomaliesWidget } from '@/components/dashboard/anomalies-widget';
import { CompactAiAssistant } from '@/components/dashboard/compact-ai-assistant';
import { CampaignsTable } from '@/components/dashboard/campaigns-table';
import { CampaignDetailDrawer } from '@/components/campaigns/campaign-detail-drawer';
import { KpiCustomizerModal } from '@/components/dashboard/kpi-customizer-modal';
import { useAdOptimize } from '@/context/adoptimize-context';
import {
  calculateCampaignsMetrics,
  buildMetricCardData,
  DEFAULT_KPI_ORDER,
  KPI_DEFINITIONS,
} from '@/lib/metrics-calculator';
import {
  DollarSign,
  TrendingUp,
  Target,
  Percent,
  Sliders,
  Filter,
  Calendar,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Eye,
  MousePointer,
  BarChart2,
  PieChart,
} from 'lucide-react';
import { Campaign, DateRangePeriod, KpiMetricId, AnomalyAlert } from '@/types/adoptimize';

const METRIC_ICONS: Record<KpiMetricId, React.ComponentType<{ className?: string }>> = {
  spend: DollarSign,
  impressions: Eye,
  clicks: MousePointer,
  ctr: BarChart2,
  cpc: DollarSign,
  conversions: Target,
  conversionRate: Percent,
  cpa: Percent,
  conversionValue: TrendingUp,
  roas: PieChart,
};

export function DashboardClientView() {
  const router = useRouter();
  const {
    state,
    setState,
    user,
    oauthToken,
    setShowConnectModal,
    showToast,
    handleSaveCampaign,
    selectedCampaign,
    setSelectedCampaign,
  } = useAdOptimize();

  const { account, campaigns, anomalies, keywords, searchTerms } = state;

  // 1. Campaign Filter State: 'ALL' or specific campaign id
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);

  // 2. Date Range Filter State
  const [dateRange, setDateRange] = useState<DateRangePeriod>('LAST_30_DAYS');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customDays, setCustomDays] = useState(14);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 3. Customizable KPI Cards State (persisted in localStorage)
  const [activeKpis, setActiveKpis] = useState<KpiMetricId[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('adoptimize_kpi_preferences');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Fall back to default
      }
    }
    return DEFAULT_KPI_ORDER;
  });
  const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);

  // Save KPI preferences handler
  const handleSaveKpis = (newKpis: KpiMetricId[]) => {
    setActiveKpis(newKpis);
    try {
      localStorage.setItem('adoptimize_kpi_preferences', JSON.stringify(newKpis));
      showToast('KPI preferences updated');
    } catch {
      // Ignored
    }
  };

  // Filter campaigns based on selectedCampaignId
  const filteredCampaigns = useMemo(() => {
    if (selectedCampaignId === 'ALL') {
      return campaigns;
    }
    return campaigns.filter((c) => c.id === selectedCampaignId);
  }, [campaigns, selectedCampaignId]);

  // Filter anomalies based on selectedCampaignId
  const filteredAnomalies = useMemo(() => {
    if (selectedCampaignId === 'ALL') {
      return anomalies;
    }
    return anomalies.filter((a) => a.campaignId === selectedCampaignId);
  }, [anomalies, selectedCampaignId]);

  // Compute live current & previous period metrics
  const { current: currentMetrics, previous: previousMetrics, periodLabel } = useMemo(() => {
    return calculateCampaignsMetrics(filteredCampaigns, dateRange, customDays);
  }, [filteredCampaigns, dateRange, customDays]);

  // Build card data for all 10 metrics with deltas
  const allCardData = useMemo(() => {
    return buildMetricCardData(currentMetrics, previousMetrics, periodLabel);
  }, [currentMetrics, previousMetrics, periodLabel]);

  const selectedCampaignObj = useMemo(() => {
    if (selectedCampaignId === 'ALL') return null;
    return campaigns.find((c) => c.id === selectedCampaignId) || null;
  }, [campaigns, selectedCampaignId]);

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

  const getDateLabel = (p: DateRangePeriod) => {
    switch (p) {
      case 'TODAY':
        return 'Today';
      case 'YESTERDAY':
        return 'Yesterday';
      case 'LAST_7_DAYS':
        return 'Last 7 Days';
      case 'LAST_30_DAYS':
        return 'Last 30 Days';
      case 'THIS_MONTH':
        return 'This Month';
      case 'LAST_MONTH':
        return 'Last Month';
      case 'CUSTOM':
        return `Custom (${customDays}d)`;
      case 'ALL_TIME':
        return 'All Time';
      default:
        return 'Last 30 Days';
    }
  };

  const handleApplyCustomDates = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const diffMs = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      setCustomDays(diffDays);
      setDateRange('CUSTOM');
      setShowCustomPicker(false);
      setShowDateDropdown(false);
    }
  };

  // Top header extra controls: Campaign Selector & Date Selector near Account Selector
  const headerControls = (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 1. Campaign Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowCampaignDropdown(!showCampaignDropdown);
            setShowDateDropdown(false);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/90 rounded-full shadow-xs hover:border-slate-300 text-xs text-slate-700 transition-colors cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900 truncate max-w-[140px] sm:max-w-[200px]">
            {selectedCampaignObj ? selectedCampaignObj.name : `All Campaigns (${campaigns.length})`}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {showCampaignDropdown && (
          <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-80 overflow-y-auto">
            <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              Filter by Campaign
            </div>
            <div className="p-1 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCampaignId('ALL');
                  setShowCampaignDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  selectedCampaignId === 'ALL'
                    ? 'bg-emerald-50 text-emerald-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>All Campaigns</span>
                <span className="text-[11px] font-mono text-slate-400">{campaigns.length} total</span>
              </button>

              {campaigns.map((camp) => (
                <button
                  key={camp.id}
                  type="button"
                  onClick={() => {
                    setSelectedCampaignId(camp.id);
                    setShowCampaignDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    selectedCampaignId === camp.id
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        camp.status === 'ENABLED' ? 'bg-emerald-500' : 'bg-slate-400'
                      }`}
                    />
                    <span className="truncate">{camp.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    ${Number(camp.spend || 0).toFixed(0)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Date Range Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowDateDropdown(!showDateDropdown);
            setShowCampaignDropdown(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/90 rounded-full shadow-xs hover:border-slate-300 text-xs text-slate-700 transition-colors cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">{getDateLabel(dateRange)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {showDateDropdown && (
          <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              Select Date Range
            </div>
            <div className="p-1 space-y-0.5">
              {[
                { id: 'TODAY' as DateRangePeriod, label: 'Today' },
                { id: 'YESTERDAY' as DateRangePeriod, label: 'Yesterday' },
                { id: 'LAST_7_DAYS' as DateRangePeriod, label: 'Last 7 Days' },
                { id: 'LAST_30_DAYS' as DateRangePeriod, label: 'Last 30 Days' },
                { id: 'THIS_MONTH' as DateRangePeriod, label: 'This Month' },
                { id: 'LAST_MONTH' as DateRangePeriod, label: 'Last Month' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDateRange(opt.id);
                    setShowDateDropdown(false);
                    setShowCustomPicker(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    dateRange === opt.id
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}

              <div className="pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomPicker(!showCustomPicker)}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    dateRange === 'CUSTOM'
                      ? 'bg-emerald-50 text-emerald-900 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>Custom Range</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustomPicker ? 'rotate-180' : ''}`} />
                </button>

                {showCustomPicker && (
                  <div className="p-2 space-y-2 bg-slate-50 rounded-xl mt-1 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCustomDates}
                      disabled={!customStartDate || !customEndDate}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Apply Range
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppShell title="Overview" headerExtra={headerControls}>
      <div className="space-y-6">
        {/* Top Section Header: Campaign Status Pill & "Customize KPIs" button */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {selectedCampaignObj ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Active Filter:</span>
                <span className="px-2.5 py-0.5 bg-slate-200/80 rounded-full font-bold text-slate-800 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${selectedCampaignObj.status === 'ENABLED' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span>{selectedCampaignObj.name}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCampaignId('ALL')}
                    className="hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                    title="Clear filter"
                  >
                    ×
                  </button>
                </span>
              </div>
            ) : (
              <span className="font-medium">
                Viewing all <strong className="text-slate-800">{campaigns.length} campaigns</strong> across {getDateLabel(dateRange).toLowerCase()}.
              </span>
            )}
          </div>

          {/* Customize KPIs Button */}
          <button
            type="button"
            onClick={() => setIsKpiModalOpen(true)}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-900 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-600" />
            <span>Customize KPIs</span>
          </button>
        </div>

        {/* 1. Customizable KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeKpis.map((kpiId) => {
            const card = allCardData[kpiId];
            if (!card) return null;
            const Icon = METRIC_ICONS[kpiId] || DollarSign;

            return (
              <MetricCard
                key={kpiId}
                label={card.label}
                value={card.value}
                changeText={card.changeText}
                isPositiveChange={card.isPositiveChange}
                isNegativeBad={card.isNegativeBad}
                icon={Icon as any}
                subContext={card.subContext}
              />
            );
          })}
        </div>

        {/* 2. Performance Overview Chart & AI Insights Row (Replacing large dark account card) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2">
            <PerformanceChart
              selectedPeriod={dateRange}
              onSelectPeriod={setDateRange}
              campaigns={filteredCampaigns}
              customDays={customDays}
            />
          </div>
          <div>
            <AiInsightsPanel
              campaigns={filteredCampaigns}
              account={account}
              onSelectCampaign={(c) => setSelectedCampaign(c)}
              onOpenOptimizer={() => router.push('/optimizer')}
              onOpenAudit={() => router.push('/audit')}
            />
          </div>
        </div>

        {/* 3. Performance Alerts & Compact AI Assistant Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2">
            <AnomaliesWidget
              alerts={filteredAnomalies}
              selectedCampaignName={selectedCampaignObj?.name}
              onSelectAlert={(alert) => {
                const camp = campaigns.find((c) => c.id === alert.campaignId);
                if (camp) {
                  setSelectedCampaign(camp);
                } else {
                  router.push('/audit');
                }
              }}
              onViewAll={() => router.push('/audit')}
            />
          </div>

          <div>
            <CompactAiAssistant
              account={account}
              campaigns={filteredCampaigns}
              anomalies={filteredAnomalies}
              userEmail={user?.email}
              userId={user?.uid}
              accessToken={oauthToken || undefined}
            />
          </div>
        </div>

        {/* 4. Active Campaigns Table */}
        <div className="space-y-3">
          <CampaignsTable
            campaigns={campaigns}
            selectedCampaignId={selectedCampaignId}
            period={dateRange}
            customDays={customDays}
            onSelectCampaign={(c) => setSelectedCampaign(c)}
            onToggleStatus={handleToggleCampaignStatus}
            onViewAll={() => router.push('/campaigns')}
          />
        </div>
      </div>

      {/* KPI Customizer Modal */}
      <KpiCustomizerModal
        isOpen={isKpiModalOpen}
        onClose={() => setIsKpiModalOpen(false)}
        activeKpis={activeKpis}
        onSaveKpis={handleSaveKpis}
      />

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
