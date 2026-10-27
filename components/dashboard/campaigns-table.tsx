'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  RefreshCw,
  ExternalLink,
  Zap,
  Play,
  Pause,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Campaign, CampaignStatus, DateRangePeriod } from '@/types/adoptimize';
import { getCurrencySymbol, getCampaignPeriodMetrics } from '@/lib/metrics-calculator';

interface CampaignsTableProps {
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  onViewAll?: () => void;
  onOpenSyncCampaigns?: () => void;
  onToggleStatus?: (campaignId: string) => void;
  isSyncing?: boolean;
  selectedCampaignId?: string; // If filtered by top campaign selector
  period?: DateRangePeriod;
  customDays?: number;
  currency?: string;
}

type SortField = 'name' | 'budgetDaily' | 'spend' | 'conversions' | 'cpa' | 'roas';
type SortOrder = 'asc' | 'desc';

export function CampaignsTable({
  campaigns,
  onSelectCampaign,
  onViewAll,
  onOpenSyncCampaigns,
  onToggleStatus,
  isSyncing = false,
  selectedCampaignId = 'ALL',
  period = 'LAST_30_DAYS',
  customDays = 14,
  currency = 'USD',
}: CampaignsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CampaignStatus>('ALL');
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Multiplier scale for date range
  const periodMultiplier = useMemo(() => {
    switch (period) {
      case 'TODAY':
      case 'YESTERDAY':
        return 1 / 30;
      case 'LAST_2_DAYS':
        return 2 / 30;
      case 'LAST_7_DAYS':
        return 7 / 30;
      case 'LAST_14_DAYS':
        return 14 / 30;
      case 'THIS_MONTH':
        return Math.min(new Date().getDate(), 30) / 30;
      case 'CUSTOM':
        return (customDays || 14) / 30;
      case 'LAST_MONTH':
      case 'LAST_30_DAYS':
      case 'ALL_TIME':
      default:
        return 1.0;
    }
  }, [period, customDays]);

  const enabledCount = campaigns.filter((c) => c.status === 'ENABLED').length;
  const pausedCount = campaigns.filter((c) => c.status === 'PAUSED').length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const processedCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => {
        // If a specific campaign is selected at the top, prioritize it
        if (selectedCampaignId !== 'ALL' && c.id !== selectedCampaignId) {
          return false;
        }
        // Status filter
        if (statusFilter !== 'ALL' && c.status !== statusFilter) {
          return false;
        }
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q);
        }
        return true;
      })
      .map((c) => {
        // Exact metrics for selected period (Today, Yesterday, Last 2d, Last 7d, Last 30d, etc.)
        const pm = getCampaignPeriodMetrics(c, period, customDays);

        return {
          ...c,
          displaySpend: pm.spend,
          displayConversions: pm.conversions,
          displayCpa: pm.cpa,
          displayRoas: pm.roas,
        };
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'spend') {
          valA = a.displaySpend;
          valB = b.displaySpend;
        } else if (sortField === 'conversions') {
          valA = a.displayConversions;
          valB = b.displayConversions;
        } else if (sortField === 'cpa') {
          valA = a.displayCpa;
          valB = b.displayCpa;
        }

        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [campaigns, selectedCampaignId, statusFilter, searchQuery, sortField, sortOrder, period, customDays]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 ml-1 inline opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-slate-900 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-slate-900 ml-1 inline" />
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs select-none">
      {/* Table Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Google Ads Campaigns
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {processedCampaigns.length} shown
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real campaign metrics, daily budgets, and live statuses synced from ads.google.com.
          </p>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00d67d] focus:bg-white w-40 sm:w-48 transition-all"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-medium">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({campaigns.length})
            </button>
            <button
              onClick={() => setStatusFilter('ENABLED')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                statusFilter === 'ENABLED'
                  ? 'bg-white text-emerald-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Enabled ({enabledCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('PAUSED')}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                statusFilter === 'PAUSED'
                  ? 'bg-white text-amber-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Paused ({pausedCount})</span>
            </button>
          </div>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors ml-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3">Status</th>
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-3 cursor-pointer group hover:text-slate-700 transition-colors"
              >
                Campaign {renderSortIcon('name')}
              </th>
              <th
                onClick={() => handleSort('budgetDaily')}
                className="py-3 px-3 text-right cursor-pointer group hover:text-slate-700 transition-colors"
              >
                Daily Budget {renderSortIcon('budgetDaily')}
              </th>
              <th
                onClick={() => handleSort('spend')}
                className="py-3 px-3 text-right cursor-pointer group hover:text-slate-700 transition-colors"
              >
                Spend {renderSortIcon('spend')}
              </th>
              <th
                onClick={() => handleSort('conversions')}
                className="py-3 px-3 text-right cursor-pointer group hover:text-slate-700 transition-colors"
              >
                Conversions {renderSortIcon('conversions')}
              </th>
              <th
                onClick={() => handleSort('cpa')}
                className="py-3 px-3 text-right cursor-pointer group hover:text-slate-700 transition-colors"
              >
                CPA {renderSortIcon('cpa')}
              </th>
              <th
                onClick={() => handleSort('roas')}
                className="py-3 px-3 text-right cursor-pointer group hover:text-slate-700 transition-colors"
              >
                ROAS {renderSortIcon('roas')}
              </th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 text-xs">
            {processedCampaigns.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  <div className="max-w-md mx-auto space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      {campaigns.length === 0
                        ? 'No active campaigns detected in your connected Google Ads account.'
                        : 'No campaigns match the active search or status filters.'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Clear the search query or change status filter to inspect your ad groups.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              processedCampaigns.map((camp) => {
                const isEnabled = camp.status === 'ENABLED';

                return (
                  <tr
                    key={camp.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Status Pill & Toggle */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {onToggleStatus ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStatus(camp.id);
                            }}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                              isEnabled
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200/60'
                            }`}
                            title={`Click to ${isEnabled ? 'Pause' : 'Enable'} campaign`}
                          >
                            {isEnabled ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>ENABLED</span>
                              </>
                            ) : (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span>PAUSED</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                              isEnabled
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isEnabled ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{camp.status}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Campaign Name (Clickable link to open details) */}
                    <td className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => onSelectCampaign(camp)}
                        className="text-left font-bold text-slate-900 hover:text-emerald-600 transition-colors cursor-pointer group-hover:underline flex items-center gap-1.5 max-w-xs sm:max-w-md truncate"
                      >
                        <span className="truncate">{camp.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded shrink-0">
                          {camp.type.replace('_', ' ')}
                        </span>
                      </button>
                    </td>

                    {/* Daily Budget */}
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700">
                      {getCurrencySymbol(currency)}{Number(camp.budgetDaily || 0).toFixed(2)}/d
                    </td>

                    {/* Spend */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                      {getCurrencySymbol(currency)}{camp.displaySpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Conversions */}
                    <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-800">
                      {camp.displayConversions.toLocaleString()}
                    </td>

                    {/* CPA */}
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700">
                      {camp.displayConversions > 0 ? `${getCurrencySymbol(currency)}${camp.displayCpa.toFixed(2)}` : '—'}
                    </td>

                    {/* ROAS */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold">
                      <span
                        className={
                          camp.displayRoas >= 3.5
                            ? 'text-emerald-600'
                            : camp.displayRoas >= 2.0
                            ? 'text-slate-800'
                            : 'text-rose-600'
                        }
                      >
                        {camp.displayRoas > 0 ? `${camp.displayRoas.toFixed(2)}x` : '—'}
                      </span>
                    </td>

                    {/* Actions: Analyze */}
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectCampaign(camp)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Analyze</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-500" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
