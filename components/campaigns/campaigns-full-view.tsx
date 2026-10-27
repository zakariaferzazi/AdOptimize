'use client';

import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Play,
  Pause,
  SlidersHorizontal,
  ChevronDown,
  ExternalLink,
  Zap,
  Trash2,
} from 'lucide-react';
import { Campaign, CampaignType, CampaignStatus, DateRangePeriod } from '@/types/adoptimize';
import { getCurrencySymbol, getCampaignPeriodMetrics } from '@/lib/metrics-calculator';

interface CampaignsFullViewProps {
  campaigns: Campaign[];
  currency?: string;
  onSelectCampaign: (campaign: Campaign) => void;
  onToggleStatus: (campaignId: string) => void;
  onOpenSyncCampaigns?: () => void;
  onDeleteCampaign?: (campaignId: string) => void;
  isSyncing?: boolean;
}

export function CampaignsFullView({
  campaigns,
  currency,
  onSelectCampaign,
  onToggleStatus,
  onOpenSyncCampaigns,
  onDeleteCampaign,
  isSyncing = false,
}: CampaignsFullViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<DateRangePeriod>('LAST_30_DAYS');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CampaignType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CampaignStatus>('ALL');
  const [sortBy, setSortBy] = useState<'spend' | 'roas' | 'conversions' | 'cpa'>('spend');

  const sym = getCurrencySymbol(currency);
  const filtered = campaigns
    .filter((c) => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const mA = getCampaignPeriodMetrics(a, selectedPeriod);
      const mB = getCampaignPeriodMetrics(b, selectedPeriod);
      if (sortBy === 'spend') return mB.spend - mA.spend;
      if (sortBy === 'roas') return mB.roas - mA.roas;
      if (sortBy === 'conversions') return mB.conversions - mA.conversions;
      if (sortBy === 'cpa') return mA.cpa - mB.cpa;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Google Ads Telemetry & AI Boost</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Campaign Performance & Audit Grid
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Monitor real-time pacing, budget consumption, Quality Scores, and AI health ratings across all connected Google Ads campaigns.
          </p>
        </div>

        {/* Filter & Action controls inside banner */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by campaign name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#00d67d]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none"
            >
              <option value="ALL">All Statuses ({campaigns.length})</option>
              <option value="ENABLED">● Enabled ({campaigns.filter(c => c.status === 'ENABLED').length})</option>
              <option value="PAUSED">❚❚ Paused ({campaigns.filter(c => c.status === 'PAUSED').length})</option>
            </select>

            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-medium focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="SEARCH">Search</option>
              <option value="PERFORMANCE_MAX">Performance Max</option>
              <option value="DISPLAY">Display</option>
              <option value="SHOPPING">Shopping</option>
            </select>

            {/* Timeframe Selector */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-xs text-[#00d67d] font-bold focus:outline-none"
            >
              <option value="LAST_30_DAYS">Last 30 Days</option>
              <option value="LAST_14_DAYS">Last 14 Days</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="ALL_TIME">All Time</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-bold"
            >
              <option value="spend">Highest Spend</option>
              <option value="roas">Highest ROAS</option>
              <option value="conversions">Most Conversions</option>
              <option value="cpa">Lowest CPA</option>
            </select>



            <a
              href="https://ads.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs inline-flex items-center gap-1 transition-colors"
            >
              <span>Google Ads</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs select-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Campaign</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Budget</th>
                <th className="py-3 px-3 text-right">Spend</th>
                <th className="py-3 px-3 text-right">Conv</th>
                <th className="py-3 px-3 text-right">CPA</th>
                <th className="py-3 px-3 text-right">ROAS</th>
                <th className="py-3 px-3 text-center">Health Score</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <p className="text-sm font-semibold text-slate-700">No campaigns found</p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Campaigns created or updated inside your Google Ads account appear automatically here in real time.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <a
                          href="https://ads.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>Open Google Ads Manager</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const m = getCampaignPeriodMetrics(c, selectedPeriod);
                  const isHealthy = c.healthStatus === 'HEALTHY';
                  const isCritical = c.healthStatus === 'CRITICAL' || m.cpa > 80;
                  const isOpportunity = c.healthStatus === 'OPPORTUNITY';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCampaign(c)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Status Toggle */}
                      <td className="py-3.5 px-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(c.id);
                          }}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                            c.status === 'ENABLED'
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                          }`}
                          title={`Click to ${c.status === 'ENABLED' ? 'Pause' : 'Enable'}`}
                        >
                          {c.status === 'ENABLED' ? (
                            <Play className="w-3 h-3 fill-emerald-600" />
                          ) : (
                            <Pause className="w-3 h-3 fill-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Campaign Name */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {c.keywordsCount} keywords · {c.activeAdsCount} ads
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                          {String(c.type || 'SEARCH').replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Daily Budget */}
                      <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700">
                        {sym}{Number(c.budgetDaily || 0).toFixed(2)}/d
                      </td>

                      {/* Spend */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {sym}{Number(m.spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>

                      {/* Conversions */}
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {m.conversions || 0}
                      </td>

                      {/* CPA */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold">
                        <span className={isCritical ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                          {sym}{Number(m.cpa || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* ROAS */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            Number(m.roas || 0) >= 4.0
                              ? 'bg-emerald-50 text-emerald-700'
                              : Number(m.roas || 0) >= 2.0
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {Number(m.roas || 0).toFixed(2)}x
                        </span>
                      </td>

                      {/* AI Health Score */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                            isHealthy
                              ? 'bg-emerald-50 text-emerald-700'
                              : isCritical
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {c.healthScore}/100
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCampaign(c);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 group-hover:bg-[#00d67d] group-hover:text-slate-950 font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <span>Analyze</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>

                          {onDeleteCampaign && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Remove campaign "${c.name}" from AdOptimize monitoring?`)) {
                                  onDeleteCampaign(c.id);
                                }
                              }}
                              title="Remove from monitoring"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
