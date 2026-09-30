'use client';

import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Play,
  Pause,
  SlidersHorizontal,
  ChevronDown,
  Plus,
  Trash2
} from 'lucide-react';
import { Campaign, CampaignType, CampaignStatus } from '@/types/adoptimize';

interface CampaignsFullViewProps {
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  onToggleStatus: (campaignId: string) => void;
  onOpenCreateCampaign?: () => void;
  onDeleteCampaign?: (campaignId: string) => void;
}

export function CampaignsFullView({
  campaigns,
  onSelectCampaign,
  onToggleStatus,
  onOpenCreateCampaign,
  onDeleteCampaign,
}: CampaignsFullViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | CampaignType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CampaignStatus>('ALL');
  const [sortBy, setSortBy] = useState<'spend' | 'roas' | 'conversions' | 'cpa'>('spend');

  const filtered = campaigns
    .filter((c) => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'spend') return b.spend - a.spend;
      if (sortBy === 'roas') return b.roas - a.roas;
      if (sortBy === 'conversions') return b.conversions - a.conversions;
      if (sortBy === 'cpa') return a.cpa - b.cpa;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 text-xs font-semibold mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Campaign Management & Telemetry</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Campaign Performance & Audit Grid
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Monitor real-time pacing, budget consumption, Quality Scores, and AI health ratings across all connected Google Ads campaigns.
          </p>
        </div>

        {/* Filter controls inside banner */}
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
          </div>

          <div className="flex items-center gap-2 text-xs">
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

            {onOpenCreateCampaign && (
              <button
                onClick={onOpenCreateCampaign}
                className="px-3 py-1.5 bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer ml-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Campaign</span>
              </button>
            )}
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
                <th className="py-3 px-3 text-center">AI Health</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const isHealthy = c.healthStatus === 'HEALTHY';
                const isCritical = c.healthStatus === 'CRITICAL';
                const isEnabled = c.status === 'ENABLED';

                return (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCampaign(c)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    {/* Status Toggle */}
                    <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleStatus(c.id)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          isEnabled
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={isEnabled ? 'Click to Pause' : 'Click to Enable'}
                      >
                        {isEnabled ? <Play className="w-3 h-3 fill-emerald-600" /> : <Pause className="w-3 h-3" />}
                      </button>
                    </td>

                    {/* Campaign Name */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {c.keywordsCount} keywords · {c.activeAdsCount} ads · Goal: {c.primaryGoal}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {c.type.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Budget */}
                    <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-700">
                      ${c.budgetDaily.toFixed(2)}/d
                    </td>

                    {/* Spend */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                      ${c.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Conv */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                      {c.conversions}
                    </td>

                    {/* CPA */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold">
                      <span className={isCritical ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                        ${c.cpa.toFixed(2)}
                      </span>
                    </td>

                    {/* ROAS */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          c.roas >= 4.0
                            ? 'bg-emerald-50 text-emerald-700'
                            : c.roas >= 2.0
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {c.roas.toFixed(2)}x
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
                          className="px-3 py-1 rounded-xl bg-slate-100 group-hover:bg-[#00d67d] group-hover:text-slate-950 font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                        >
                          <span>Deep-Dive</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                        {onDeleteCampaign && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete campaign "${c.name}"?`)) {
                                onDeleteCampaign(c.id);
                              }
                            }}
                            title="Delete Campaign"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
