'use client';

import React from 'react';
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
} from 'lucide-react';
import { Campaign } from '@/types/adoptimize';

interface CampaignsTableProps {
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  onViewAll?: () => void;
  onOpenSyncCampaigns?: () => void;
  onBoostCampaign?: (campaign: Campaign) => void;
  onAddCampaign?: () => void;
  isSyncing?: boolean;
}

export function CampaignsTable({
  campaigns,
  onSelectCampaign,
  onViewAll,
  onOpenSyncCampaigns,
  onBoostCampaign,
  onAddCampaign,
  isSyncing = false,
}: CampaignsTableProps) {
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
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Google Ads Active Campaigns
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time telemetry, AI health scores, and 1-click optimization boosts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onAddCampaign && (
            <button
              onClick={onAddCampaign}
              className="px-3 py-1.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>+ Add Campaign</span>
            </button>
          )}

          {onOpenSyncCampaigns && (
            <button
              onClick={onOpenSyncCampaigns}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00d67d] ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          )}

          <a
            href="https://ads.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Open Google Ads Manager"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors ml-1 cursor-pointer"
            >
              <span>View All ({campaigns.length})</span>
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
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <div className="max-w-md mx-auto space-y-2.5">
                    <p className="text-xs font-medium text-slate-700">
                      No active campaigns detected in your connected Google Ads account yet.
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
              campaigns.map((camp) => {
                const isHealthy = camp.healthStatus === 'HEALTHY';
                const isCritical = camp.healthStatus === 'CRITICAL';
                const isOpportunity = camp.healthStatus === 'OPPORTUNITY';

                return (
                  <tr
                    key={camp.id}
                    onClick={() => onSelectCampaign(camp)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Campaign Name & Health indicator */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
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
                      <div className="flex items-center justify-end gap-1.5">
                        {onBoostCampaign && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onBoostCampaign(camp);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Boost performance with AI optimization"
                          >
                            <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                            <span>Boost</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCampaign(camp);
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 group-hover:bg-[#00d67d] group-hover:text-slate-950 text-slate-700 text-xs font-semibold transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer"
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
