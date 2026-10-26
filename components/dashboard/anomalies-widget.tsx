'use client';

import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Zap,
  TrendingDown,
  TrendingUp,
  Sliders,
} from 'lucide-react';
import { AnomalyAlert } from '@/types/adoptimize';

interface PerformanceAlertsWidgetProps {
  alerts: AnomalyAlert[];
  onSelectAlert: (alert: AnomalyAlert) => void;
  onViewAll: () => void;
  selectedCampaignName?: string;
}

export function AnomaliesWidget({
  alerts,
  onSelectAlert,
  onViewAll,
  selectedCampaignName,
}: PerformanceAlertsWidgetProps) {
  const unresolved = (alerts || []).filter((a) => !a.resolved).slice(0, 5);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Performance Alerts
            </h3>
            {unresolved.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                {unresolved.length} Issues to Review
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedCampaignName
              ? `Filtered for "${selectedCampaignName}"`
              : 'Statistical anomalies & threshold exceedances across active ad sets'}
          </p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List Items */}
      <div className="divide-y divide-slate-100 mt-2">
        {unresolved.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-xs font-bold text-slate-900">No Active Performance Alerts</div>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              All campaign KPIs, conversion rates, and CPA volatility metrics are within normal baseline thresholds.
            </p>
          </div>
        ) : (
          unresolved.map((item) => {
            const isCritical = item.severity === 'CRITICAL';
            const isOpportunity = item.severity === 'OPPORTUNITY';
            
            // Distinguish genuine anomalies (sudden spike or drop) from ordinary threshold limits
            const isGenuineAnomaly =
              item.whatChanged?.toLowerCase().includes('spike') ||
              item.whatChanged?.toLowerCase().includes('sudden') ||
              item.whatChanged?.toLowerCase().includes('abnormal') ||
              item.title?.toLowerCase().includes('anomaly');

            return (
              <div
                key={item.id}
                onClick={() => onSelectAlert(item)}
                className="py-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/80 px-2.5 -mx-2.5 rounded-2xl transition-colors"
              >
                {/* Left: Icon & Description */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                      isCritical
                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                        : isOpportunity
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}
                  >
                    {isCritical ? (
                      <AlertCircle className="w-4 h-4 stroke-[2.2]" />
                    ) : isOpportunity ? (
                      <Zap className="w-4 h-4 stroke-[2.2]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                        {item.title}
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                          isGenuineAnomaly
                            ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isGenuineAnomaly ? 'Anomaly' : 'Threshold'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="font-medium text-slate-700 truncate">{item.campaignName}</span>
                      <span>·</span>
                      <span className="shrink-0">{item.whenChanged}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Metric Tag + Inspect action */}
                <div className="text-right shrink-0 flex items-center gap-2">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                      isCritical
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : isOpportunity
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}
                  >
                    {item.metric}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
