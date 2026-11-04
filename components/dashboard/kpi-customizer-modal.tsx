'use client';

import React, { useState } from 'react';
import {
  X,
  Check,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sliders,
  DollarSign,
  Target,
  Percent,
  TrendingUp,
  MousePointer,
  Eye,
  BarChart2,
  PieChart,
} from 'lucide-react';
import { KpiMetricId } from '@/types/adoptimize';
import { KPI_DEFINITIONS, DEFAULT_KPI_ORDER } from '@/lib/metrics-calculator';

interface KpiCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeKpis: KpiMetricId[];
  onSaveKpis: (kpis: KpiMetricId[]) => void;
}

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

export function KpiCustomizerModal({
  isOpen,
  onClose,
  activeKpis,
  onSaveKpis,
}: KpiCustomizerModalProps) {
  // Ordered list of all 10 KPIs
  const [orderedKpis, setOrderedKpis] = useState<KpiMetricId[]>(() => {
    const allKeys = Object.keys(KPI_DEFINITIONS) as KpiMetricId[];
    // Place active KPIs first in their current order, followed by remaining disabled KPIs
    const remaining = allKeys.filter((k) => !activeKpis.includes(k));
    return [...activeKpis, ...remaining];
  });

  const [selectedSet, setSelectedSet] = useState<Set<KpiMetricId>>(
    () => new Set(activeKpis)
  );

  if (!isOpen) return null;

  const toggleKpi = (id: KpiMetricId) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) {
          // Keep at least 1 card visible
          return next;
        }
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setOrderedKpis((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index >= orderedKpis.length - 1) return;
    setOrderedKpis((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleResetToDefault = () => {
    const allKeys = Object.keys(KPI_DEFINITIONS) as KpiMetricId[];
    const remaining = allKeys.filter((k) => !DEFAULT_KPI_ORDER.includes(k));
    setOrderedKpis([...DEFAULT_KPI_ORDER, ...remaining]);
    setSelectedSet(new Set(DEFAULT_KPI_ORDER));
  };

  const handleSelectAll = () => {
    const allKeys = Object.keys(KPI_DEFINITIONS) as KpiMetricId[];
    setSelectedSet(new Set(allKeys));
  };

  const handleApply = () => {
    // Only return the ones currently selected, in the current ordering
    const finalSelection = orderedKpis.filter((id) => selectedSet.has(id));
    onSaveKpis(finalSelection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200/90 space-y-5 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs">
              <Sliders className="w-4 h-4 text-[#00d67d]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Customize KPI Cards</h3>
              <p className="text-xs text-slate-500">
                Choose and rearrange the Google Ads metrics displayed on your overview.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between text-xs pt-1 shrink-0">
          <div className="text-slate-600 font-medium">
            <span className="font-bold text-slate-900">{selectedSet.size}</span> of {orderedKpis.length} metrics selected
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              Select All
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Default</span>
            </button>
          </div>
        </div>

        {/* Scrollable Metric List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
          {orderedKpis.map((id, index) => {
            const def = KPI_DEFINITIONS[id];
            const isChecked = selectedSet.has(id);
            const Icon = METRIC_ICONS[id];

            return (
              <div
                key={id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isChecked
                    ? 'bg-white border-slate-200/90 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200/40 opacity-60'
                }`}
              >
                {/* Left: Checkbox + Icon + Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleKpi(id)}
                    className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      isChecked
                        ? 'bg-slate-950 text-white'
                        : 'border border-slate-300 bg-white hover:border-slate-400'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                    <Icon className="w-4 h-4 text-emerald-600" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {def.label}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {def.description}
                    </div>
                  </div>
                </div>

                {/* Right: Reorder Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === orderedKpis.length - 1}
                    className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400">
            Preferences saved to your profile
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-[#00d67d]" />
              <span>Save &amp; Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
