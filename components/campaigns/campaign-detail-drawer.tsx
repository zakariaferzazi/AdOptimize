'use client';

import React, { useState } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Smartphone,
  Monitor,
  Globe,
  Plus,
  MinusCircle,
  Play,
  Pause,
  Sliders,
  DollarSign,
  Zap
} from 'lucide-react';
import {
  Campaign,
  Keyword,
  SearchTerm,
  AdCreative,
  BreakdownItem,
  AIInsight,
  GoogleAdsAccount
} from '@/types/adoptimize';

interface CampaignDetailDrawerProps {
  campaign: Campaign | null;
  keywords: Keyword[];
  searchTerms: SearchTerm[];
  ads: AdCreative[];
  deviceBreakdown: BreakdownItem[];
  locationBreakdown: BreakdownItem[];
  insights: AIInsight[];
  account?: GoogleAdsAccount;
  onClose: () => void;
  onBoostCampaign?: (campaign: Campaign) => void;
  onApplyInsight?: (insight: AIInsight) => void;
  onAddNegativeKeyword?: (term: SearchTerm) => void;
  onToggleCampaignStatus?: (campaignId: string) => void;
}

export function CampaignDetailDrawer({
  campaign,
  keywords,
  searchTerms,
  ads,
  deviceBreakdown,
  locationBreakdown,
  insights,
  account,
  onClose,
  onBoostCampaign,
  onApplyInsight,
  onAddNegativeKeyword,
  onToggleCampaignStatus,
}: CampaignDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'keywords' | 'search_terms' | 'ads' | 'breakdowns' | 'ai_actions'>('overview');

  if (!campaign) return null;

  const campaignKeywords = keywords.filter((k) => k.campaignId === campaign.id);
  const campaignSearchTerms = searchTerms.filter((s) => s.campaignId === campaign.id);
  const campaignAds = ads.filter((a) => a.campaignId === campaign.id);
  const campaignInsights = insights.filter((i) => i.campaignId === campaign.id);

  const isHealthy = campaign.healthStatus === 'HEALTHY';
  const isCritical = campaign.healthStatus === 'CRITICAL';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                isCritical
                  ? 'bg-rose-500 ring-4 ring-rose-100'
                  : isHealthy
                  ? 'bg-[#00d67d] ring-4 ring-emerald-100'
                  : 'bg-amber-500 ring-4 ring-amber-100'
              }`}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {campaign.name}
                </h2>
                <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold shrink-0">
                  {campaign.type}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily Budget: ${campaign.budgetDaily.toFixed(2)}/day · Goal: {campaign.primaryGoal.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBoostCampaign && (
              <button
                onClick={() => onBoostCampaign(campaign)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>Boost</span>
              </button>
            )}

            {onToggleCampaignStatus && (
              <button
                onClick={() => onToggleCampaignStatus(campaign.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  campaign.status === 'ENABLED'
                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                {campaign.status === 'ENABLED' ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Campaign</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Enable Campaign</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-100 bg-white flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'overview' as const, label: 'Overview' },
            { id: 'keywords' as const, label: `Keywords (${campaignKeywords.length})` },
            { id: 'search_terms' as const, label: `Search Terms (${campaignSearchTerms.length})` },
            { id: 'ads' as const, label: `Ads (${campaignAds.length})` },
            { id: 'breakdowns' as const, label: 'Devices & Locations' },
            { id: 'ai_actions' as const, label: `AI Actions (${campaignInsights.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#00d67d] text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-500">Spend (7d)</div>
                  <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
                    ${campaign.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Budget: ${campaign.budgetDaily}/d</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-500">Conversions</div>
                  <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
                    {campaign.conversions}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Conv Rate: {campaign.conversionRate}%</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-500">Actual CPA</div>
                  <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
                    ${campaign.cpa.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">CPC: ${campaign.cpc.toFixed(2)}</div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[11px] font-medium text-slate-500">ROAS</div>
                  <div className="text-lg font-bold text-emerald-600 mt-1 font-mono">
                    {campaign.roas.toFixed(2)}x
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Value: ${campaign.conversionValue.toLocaleString()}</div>
                </div>
              </div>

              {/* Health Score & Diagnostic Banner */}
              <div className="p-4 bg-slate-950 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-medium">AI Health Score</div>
                  <div className="text-2xl font-bold text-white flex items-center gap-2 mt-0.5 font-mono">
                    <span>{campaign.healthScore}/100</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-sans font-semibold ${
                        isHealthy ? 'bg-emerald-500/20 text-[#00d67d]' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {campaign.healthStatus}
                    </span>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400">
                  <div>Previous period CPA: ${campaign.previousPeriod.cpa.toFixed(2)}</div>
                  <div className="text-[#00d67d] font-semibold mt-0.5">
                    {campaign.cpa < campaign.previousPeriod.cpa ? 'Efficiency improving' : 'CPA rising'}
                  </div>
                </div>
              </div>

              {/* Day-by-Day Historical Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Historical Daily Trend
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Daily Spend</th>
                        <th className="py-2.5 px-3 text-right">Conversions</th>
                        <th className="py-2.5 px-3 text-right">CPA</th>
                        <th className="py-2.5 px-3 text-right">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {campaign.historicalPoints.map((day, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-sans font-medium text-slate-700">{day.date}</td>
                          <td className="py-2 px-3 text-right">${day.spend}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{day.conversions}</td>
                          <td className="py-2 px-3 text-right">${day.cpa.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-emerald-600 font-bold">{day.roas.toFixed(1)}x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KEYWORDS */}
          {activeTab === 'keywords' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Keywords tracked in this campaign</span>
                <span className="font-semibold text-slate-900">{campaignKeywords.length} keywords</span>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Keyword</th>
                      <th className="py-2.5 px-3">Match</th>
                      <th className="py-2.5 px-3 text-right">Spend</th>
                      <th className="py-2.5 px-3 text-right">Clicks</th>
                      <th className="py-2.5 px-3 text-right">Conv</th>
                      <th className="py-2.5 px-3 text-right">CPA</th>
                      <th className="py-2.5 px-3 text-center">QS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaignKeywords.map((kw) => (
                      <tr key={kw.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{kw.keyword}</span>
                            {kw.flag === 'TOP_PERFORMER' && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                                Winner
                              </span>
                            )}
                            {kw.flag === 'HIGH_SPEND_ZERO_CONV' && (
                              <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded">
                                Bleeder
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-500 uppercase">{kw.matchType}</td>
                        <td className="py-3 px-3 text-right font-mono">${kw.spend.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono">{kw.clicks}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{kw.conversions}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          <span className={kw.cpa > 100 ? 'text-rose-600' : 'text-slate-800'}>
                            ${kw.cpa.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-mono text-xs px-1.5 py-0.5 rounded font-bold ${
                              kw.qualityScore >= 8
                                ? 'bg-emerald-50 text-emerald-700'
                                : kw.qualityScore <= 4
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {kw.qualityScore}/10
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SEARCH TERMS */}
          {activeTab === 'search_terms' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Negative Keyword Mining</span>
                </div>
                <p className="mt-1 text-amber-800">
                  Search terms that waste budget without generating leads can be added as negative match queries with 1 click.
                </p>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="py-2.5 px-3">Search Query</th>
                      <th className="py-2.5 px-3 text-right">Spend</th>
                      <th className="py-2.5 px-3 text-right">Conv</th>
                      <th className="py-2.5 px-3 text-center">Relevance</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaignSearchTerms.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-medium text-slate-900">
                          {st.searchTerm}
                        </td>
                        <td className="py-3 px-3 text-right font-mono">${st.spend.toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold">{st.conversions}</td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              st.intentRelevance === 'LOW'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {st.intentRelevance}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {st.recommendedAction === 'ADD_NEGATIVE' ? (
                            <button
                              onClick={() => onAddNegativeKeyword && onAddNegativeKeyword(st)}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors flex items-center gap-1 ml-auto"
                            >
                              <MinusCircle className="w-3.5 h-3.5" />
                              <span>Add Negative</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">High intent</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ADS */}
          {activeTab === 'ads' && (
            <div className="space-y-4">
              {campaignAds.map((ad) => (
                <div key={ad.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">Ad ID: {ad.id}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        ad.adStrength === 'EXCELLENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Strength: {ad.adStrength}
                    </span>
                  </div>

                  {/* Ad Preview Simulation */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-xs text-emerald-700 font-medium">Ad · {ad.finalUrl}</div>
                    <div className="text-sm font-bold text-blue-700 hover:underline cursor-pointer mt-0.5">
                      {ad.headline1} | {ad.headline2} | {ad.headline3}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {ad.description1} {ad.description2}
                    </div>
                  </div>

                  {/* AI Critique */}
                  <div className="text-xs text-slate-600 bg-white/60 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">AI Ad Critique: </span>
                      {ad.aiCritique}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-600 pt-1">
                    <span>CTR: {ad.ctr}%</span>
                    <span>·</span>
                    <span>Conv: {ad.conversions}</span>
                    <span>·</span>
                    <span>CPA: ${ad.cpa.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: BREAKDOWNS */}
          {activeTab === 'breakdowns' && (
            <div className="space-y-6">
              {/* Devices */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Device Performance</span>
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="py-2 px-3">Device</th>
                        <th className="py-2 px-3 text-right">Spend</th>
                        <th className="py-2 px-3 text-right">Conversions</th>
                        <th className="py-2 px-3 text-right">CPA</th>
                        <th className="py-2 px-3 text-right">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {deviceBreakdown.map((dev, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-sans font-medium text-slate-800">{dev.name}</td>
                          <td className="py-2.5 px-3 text-right">${dev.spend.toLocaleString()}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{dev.conversions}</td>
                          <td className="py-2.5 px-3 text-right">${dev.cpa.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{dev.roas.toFixed(1)}x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Locations */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Top Geographic Locations</span>
                </h4>
                <div className="border border-slate-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="py-2 px-3">Country</th>
                        <th className="py-2 px-3 text-right">Spend</th>
                        <th className="py-2 px-3 text-right">Conversions</th>
                        <th className="py-2 px-3 text-right">CPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {locationBreakdown.map((loc, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-sans font-medium text-slate-800">{loc.name}</td>
                          <td className="py-2 px-3 text-right">${loc.spend.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{loc.conversions}</td>
                          <td className="py-2 px-3 text-right">${loc.cpa.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: AI ACTIONS */}
          {activeTab === 'ai_actions' && (
            <div className="space-y-4">
              {campaignInsights.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No open issues for this campaign.
                </div>
              ) : (
                campaignInsights.map((ins) => (
                  <div
                    key={ins.id}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{ins.category.replace('_', ' ')}</span>
                      <span className="text-xs font-mono font-bold text-[#00d67d] bg-slate-950 px-2 py-0.5 rounded">
                        {ins.confidence}% Confidence
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed font-medium">
                      {ins.problem}
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200/60 text-xs text-slate-600">
                      <div className="font-bold text-slate-800">Recommended Fix:</div>
                      <div className="mt-0.5">{ins.recommendedAction}</div>
                      <div className="mt-1 text-emerald-700 font-medium">Impact: {ins.expectedImpact}</div>
                    </div>

                    {ins.actionPayload && onApplyInsight && (
                      <button
                        onClick={() => onApplyInsight(ins)}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#00d67d]" />
                        <span>One-Click Execute Optimization</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Customer ID:{' '}
            <span className="font-mono text-slate-700 font-semibold">
              {account?.clientCustomerId && account.clientCustomerId !== 'Not Connected'
                ? account.clientCustomerId
                : campaign?.accountId || 'Active Account'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
