'use client';

import React, { useState } from 'react';
import {
  Search,
  Layers,
  Sparkles,
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
} from 'lucide-react';
import { Campaign, CampaignStatus } from '@/types/adoptimize';

interface CampaignsTableProps {
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  onViewAll?: () => void;
  onOpenSyncCampaigns?: () => void;
  onToggleStatus?: (campaignId: string) => void;
  isSyncing?: boolean;
}

export function CampaignsTable({
  campaigns,
  onSelectCampaign,
  onViewAll,
  onOpenSyncCampaigns,
  onToggleStatus,
  isSyncing = false,
}: CampaignsTableProps) {
  const [statusFilter, setStatusFilter] = useState<'ALL' | CampaignStatus>('ALL');

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    return true;
  });

  const enabledCount = campaigns.filter((c) => c.status === 'ENABLED').length;
  const pausedCount = campaigns.filter((c) => c.status === 'PAUSED').length;

  // Mini sparkline helper
  const renderSparkline = (points: number[], isPositive: boolean) => {
    if (!points || points.length === 0) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 60;
    const height = 20;

    const pathData = points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const y = height - ((p - min) / range) * (height - 4) - 2;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={pathData}
          fill="none"
          stroke={isPositive ? '#00d67d' : '#f43f5e'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs select-none">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Google Ads Active Campaigns
            </h3>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {campaigns.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time telemetry, live status toggling (Enabled &amp; Paused), and 1-click optimization boosts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Quick Filter Tabs */}
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

          {onOpenSyncCampaigns && (
            <button
              onClick={onOpenSyncCampaigns}
              disabled={isSyncing}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00d67d] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Campaigns'}</span>
            </button>
          )}

          <a
            href="https://ads.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Open Google Ads Manager"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors ml-1 cursor-pointer"
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
              <th className="py-3 px-3">Campaign</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3 text-right">Daily Budget</th>
              <th className="py-3 px-3 text-right">Spend</th>
              <th className="py-3 px-3 text-right">Conversions</th>
              <th className="py-3 px-3 text-right">CPA</th>
              <th className="py-3 px-3 text-right">ROAS</th>
              <th className="py-3 px-3 text-center">Trend</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80 text-xs">
            {filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <div className="max-w-md mx-auto space-y-2.5">
                    <p className="text-xs font-medium text-slate-700">
                      {campaigns.length === 0
                        ? 'No active campaigns detected in your connected Google Ads account yet.'
                        : `No campaigns currently matching the "${statusFilter.toLowerCase()}" filter.`}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Campaigns are created inside Google Ads. Once created, click below to sync them into AdOptimize for continuous telemetry and AI boosts.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      {onAddCampaign && (
                        <button
                          onClick={onAddCampaign}
                          className="px-4 py-2 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <span>+ Add Campaign</span>
                        </button>
                      )}
                      {onOpenSyncCampaigns && (
                        <button
                          onClick={onOpenSyncCampaigns}
                          disabled={isSyncing}
                          className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-[#00d67d] ${isSyncing ? 'animate-spin' : ''}`} />
                          <span>Sync Account</span>
                        </button>
                      )}
                      <a
                        href="https://ads.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <span>Open Google Ads</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCampaigns.map((camp) => {
                const isHealthy = camp.healthStatus === 'HEALTHY';
                const isCritical = camp.healthStatus === 'CRITICAL';
                const isOpportunity = camp.healthStatus === 'OPPORTUNITY';

                return (
                  <tr
                    key={camp.id}
                    onClick={() => onSelectCampaign(camp)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
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
                              camp.status === 'ENABLED'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200/60'
                            }`}
                            title={`Click to ${camp.status === 'ENABLED' ? 'Pause' : 'Enable'} campaign`}
                          >
                            {camp.status === 'ENABLED' ? (
                              <>
                                <Play className="w-2.5 h-2.5 fill-emerald-600" />
                                <span>Enabled</span>
                              </>
                            ) : (
                              <>
                                <Pause className="w-2.5 h-2.5 fill-slate-400" />
                                <span>Paused</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 ${
                              camp.status === 'ENABLED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                            }`}
                          >
                            {camp.status === 'ENABLED' ? 'Enabled' : 'Paused'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Campaign Name & Health indicator */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isCritical
                              ? 'bg-rose-500 ring-4 ring-rose-100'
                              : isOpportunity
                              ? 'bg-emerald-500 ring-4 ring-emerald-100'
                              : isHealthy
                              ? 'bg-[#00d67d] ring-4 ring-emerald-50'
                              : 'bg-amber-500 ring-4 ring-amber-100'
                          }`}
                        />
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                            {camp.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {camp.keywordsCount} keywords · {camp.activeAdsCount} active ads
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Campaign Type */}
                    <td className="py-3.5 px-3">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase tracking-tight">
                        {camp.type.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Daily Budget */}
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700 tabular-nums">
                      ${camp.budgetDaily.toFixed(2)}/d
                    </td>

                    {/* Spend */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      ${camp.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Conversions */}
                    <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {camp.conversions}
                    </td>

                    {/* CPA */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold tabular-nums">
                      <span className={isCritical ? 'text-rose-600' : 'text-slate-900'}>
                        ${camp.cpa.toFixed(2)}
                      </span>
                    </td>

                    {/* ROAS */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold tabular-nums">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] ${
                          camp.roas >= 4.0
                            ? 'bg-emerald-50 text-emerald-700'
                            : camp.roas >= 2.0
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {camp.roas.toFixed(2)}x
                      </span>
                    </td>

                    {/* Trend Sparkline */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex justify-center">
                        {renderSparkline(camp.trendPoints, camp.roas >= 2.0)}
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCampaign(camp);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 group-hover:bg-[#00d67d] group-hover:text-slate-950 text-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                          <span>Analyze</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
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
  );
}
