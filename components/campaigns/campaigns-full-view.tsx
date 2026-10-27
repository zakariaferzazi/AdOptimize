'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  SlidersHorizontal,
  ChevronDown,
  ExternalLink,
  Zap,
  Trash2,
  Plus,
  RefreshCw,
  Edit2,
  Check,
  X,
  Loader2,
  DollarSign,
  Target,
  Sparkles,
} from 'lucide-react';
import { Campaign, CampaignType, CampaignStatus, DateRangePeriod } from '@/types/adoptimize';
import { getCurrencySymbol, getCampaignPeriodMetrics } from '@/lib/metrics-calculator';

interface CampaignsFullViewProps {
  campaigns: Campaign[];
  currency?: string;
  onSelectCampaign: (campaign: Campaign) => void;
  onToggleStatus: (campaignId: string) => void;
  onUpdateBudget?: (campaignId: string, newBudget: number) => Promise<boolean>;
  onCreateCampaignClick?: () => void;
  onOpenSyncCampaigns?: () => void;
  onDeleteCampaign?: (campaignId: string) => void;
  isSyncing?: boolean;
  isMutatingId?: string | null;
}

export function CampaignsFullView({
  campaigns,
  currency = 'USD',
  onSelectCampaign,
  onToggleStatus,
  onUpdateBudget,
  onCreateCampaignClick,
  onOpenSyncCampaigns,
  onDeleteCampaign,
  isSyncing = false,
  isMutatingId = null,
}: CampaignsFullViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<DateRangePeriod>('LAST_30_DAYS');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CampaignType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CampaignStatus>('ALL');
  const [sortBy, setSortBy] = useState<'spend' | 'roas' | 'conversions' | 'cpa'>('spend');

  // Inline budget editing state
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState<string>('');
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  const sym = getCurrencySymbol(currency);

  const startEditBudget = (e: React.MouseEvent, c: Campaign) => {
    e.stopPropagation();
    setEditingBudgetId(c.id);
    setEditingBudgetValue(String(c.budgetDaily || 50));
  };

  const cancelEditBudget = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBudgetId(null);
    setEditingBudgetValue('');
  };

  const saveEditBudget = async (e: React.MouseEvent, c: Campaign) => {
    e.stopPropagation();
    const val = parseFloat(editingBudgetValue);
    if (isNaN(val) || val <= 0) return;

    if (onUpdateBudget) {
      setIsSavingBudget(true);
      try {
        await onUpdateBudget(c.id, val);
        setEditingBudgetId(null);
      } finally {
        setIsSavingBudget(false);
      }
    } else {
      setEditingBudgetId(null);
    }
  };

  // Filtered campaigns
  const filtered = useMemo(() => {
    return campaigns
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
  }, [campaigns, searchQuery, typeFilter, statusFilter, sortBy, selectedPeriod]);

  // Aggregate stats across active/filtered campaigns
  const aggregateStats = useMemo(() => {
    let totalSpend = 0;
    let totalConv = 0;
    let totalRevenue = 0;
    let enabledCount = 0;
    let pausedCount = 0;

    campaigns.forEach((c) => {
      if (c.status === 'ENABLED') enabledCount++;
      else pausedCount++;

      const m = getCampaignPeriodMetrics(c, selectedPeriod);
      totalSpend += m.spend;
      totalConv += m.conversions;
      totalRevenue += (m.conversions * (c.conversionValue || 120));
    });

    const avgCpa = totalConv > 0 ? totalSpend / totalConv : 0;
    const blendedRoas = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;

    return {
      enabledCount,
      pausedCount,
      totalSpend,
      totalConv,
      avgCpa,
      blendedRoas,
    };
  }, [campaigns, selectedPeriod]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 text-xs font-semibold mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>Google Ads Execution & Campaign Management</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Campaigns Command Center
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
              Create and pause campaigns, adjust daily budgets, and audit real performance across your connected Google Ads account. Changes sync directly to ads.google.com.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onCreateCampaignClick && (
              <button
                type="button"
                onClick={onCreateCampaignClick}
                className="px-4 py-2.5 bg-[#00d67d] hover:bg-[#00c070] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Campaign</span>
              </button>
            )}

            {onOpenSyncCampaigns && (
              <button
                type="button"
                onClick={onOpenSyncCampaigns}
                disabled={isSyncing}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#00d67d]' : 'text-slate-400'}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
              </button>
            )}

            <a
              href="https://ads.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white font-semibold rounded-xl text-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Google Ads</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Filter & Action controls inside banner */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
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
              <option value="ENABLED">● Enabled ({aggregateStats.enabledCount})</option>
              <option value="PAUSED">❚❚ Paused ({aggregateStats.pausedCount})</option>
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
          </div>
        </div>
      </div>

      {/* 2. Metric Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Campaigns</div>
          <div className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <span>{campaigns.length}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              {aggregateStats.enabledCount} active
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{aggregateStats.pausedCount} paused</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Period Spend</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {sym}{aggregateStats.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">{selectedPeriod.replace(/_/g, ' ')}</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Conversions</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {aggregateStats.totalConv.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tracked conversion goals</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Average CPA</div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {aggregateStats.totalConv > 0 ? `${sym}${aggregateStats.avgCpa.toFixed(2)}` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Cost per acquisition</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Blended ROAS</div>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
            {aggregateStats.totalSpend > 0 ? `${aggregateStats.blendedRoas.toFixed(2)}x` : '—'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Return on ad spend</div>
        </div>
      </div>

      {/* 3. Campaigns Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs select-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Campaign</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Daily Budget</th>
                <th className="py-3 px-3 text-right">Spend</th>
                <th className="py-3 px-3 text-right">Conv</th>
                <th className="py-3 px-3 text-right">CPA</th>
                <th className="py-3 px-3 text-right">ROAS</th>
                <th className="py-3 px-3 text-center">Health</th>
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
                        Create a new Google Ads campaign above or sync with your connected Google Ads account.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        {onCreateCampaignClick && (
                          <button
                            type="button"
                            onClick={onCreateCampaignClick}
                            className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c070] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create First Campaign</span>
                          </button>
                        )}
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
                  const isEnabled = c.status === 'ENABLED';
                  const isMutatingThis = isMutatingId === c.id;
                  const isEditingThisBudget = editingBudgetId === c.id;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCampaign(c)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Status Toggle with Execution Spinner */}
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          disabled={isMutatingThis}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(c.id);
                          }}
                          className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                            isEnabled
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80'
                              : 'text-slate-400 bg-slate-100 hover:bg-slate-200 border border-slate-200/80'
                          }`}
                          title={`Click to ${isEnabled ? 'Pause' : 'Enable'} campaign in Google Ads`}
                        >
                          {isMutatingThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          ) : isEnabled ? (
                            <Play className="w-3 h-3 fill-emerald-600" />
                          ) : (
                            <Pause className="w-3 h-3 fill-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Campaign Name */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                          <span>{c.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {c.keywordsCount || 0} keywords · {c.activeAdsCount || 0} ads
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase">
                          {String(c.type || 'SEARCH').replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Daily Budget with Inline Quick Edit */}
                      <td className="py-3.5 px-3 text-right font-mono" onClick={(e) => e.stopPropagation()}>
                        {isEditingThisBudget ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <span className="text-slate-400 font-bold">{sym}</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={editingBudgetValue}
                              onChange={(e) => setEditingBudgetValue(e.target.value)}
                              className="w-16 px-1.5 py-0.5 bg-white border border-emerald-500 rounded text-xs font-mono font-bold text-slate-900 focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              disabled={isSavingBudget}
                              onClick={(e) => saveEditBudget(e, c)}
                              className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                              title="Save budget"
                            >
                              {isSavingBudget ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditBudget}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={(e) => startEditBudget(e, c)}
                            className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-emerald-700 hover:bg-slate-100 px-2 py-0.5 rounded cursor-pointer transition-colors"
                            title="Click to edit daily budget"
                          >
                            <span>{sym}{Number(c.budgetDaily || 0).toFixed(2)}/d</span>
                            <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-70" />
                          </div>
                        )}
                      </td>

                      {/* Spend */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {sym}{Number(m.spend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Conversions */}
                      <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900">
                        {m.conversions || 0}
                      </td>

                      {/* CPA */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold">
                        <span className={isCritical ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                          {m.conversions > 0 ? `${sym}${Number(m.cpa || 0).toFixed(2)}` : '—'}
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
                          {Number(m.roas || 0) > 0 ? `${Number(m.roas || 0).toFixed(2)}x` : '—'}
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
                          {c.healthScore || 85}/100
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
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
                              type="button"
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
