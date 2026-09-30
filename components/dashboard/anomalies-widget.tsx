'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, ArrowUpRight, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { AnomalyAlert } from '@/types/adoptimize';

interface AnomaliesWidgetProps {
  anomalies: AnomalyAlert[];
  onSelectAnomaly: (anomaly: AnomalyAlert) => void;
  onViewAll: () => void;
}

export function AnomaliesWidget({
  anomalies,
  onSelectAnomaly,
  onViewAll,
}: AnomaliesWidgetProps) {
  const unresolved = anomalies.filter((a) => !a.resolved).slice(0, 5);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Detected Anomalies
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous audit across active ad sets
          </p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* List Items (Matching Scheduled Transfers layout in reference) */}
      <div className="divide-y divide-slate-100 mt-2">
        {unresolved.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            No active anomalies. All campaign metrics within expected bounds.
          </div>
        ) : (
          unresolved.map((item) => {
            const isCritical = item.severity === 'CRITICAL';
            const isOpportunity = item.severity === 'OPPORTUNITY';

            return (
              <div
                key={item.id}
                onClick={() => onSelectAnomaly(item)}
                className="py-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/80 px-2 -mx-2 rounded-2xl transition-colors"
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
                    <div className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                      <span className="truncate">{item.campaignName}</span>
                      <span>·</span>
                      <span className="shrink-0">{item.whenChanged}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Metric Tag */}
                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg ${
                      isCritical
                        ? 'bg-rose-50 text-rose-700'
                        : isOpportunity
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {item.metric}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
