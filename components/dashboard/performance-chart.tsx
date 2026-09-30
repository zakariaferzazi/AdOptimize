'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ArrowUpRight, Filter, TrendingUp, Layers } from 'lucide-react';
import { DateRangePeriod, Campaign } from '@/types/adoptimize';

export type ChartMetric = 'spend' | 'conversionValue' | 'conversions' | 'cpa' | 'roas' | 'ctr' | 'cpc';

interface PerformanceChartProps {
  selectedPeriod: DateRangePeriod;
  onSelectPeriod: (period: DateRangePeriod) => void;
  campaigns?: Campaign[];
}

export function PerformanceChart({
  selectedPeriod,
  onSelectPeriod,
  campaigns = [],
}: PerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState<ChartMetric>('spend');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  // Dynamically compute 7-day time series from active campaigns
  const daysData = useMemo(() => {
    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    const today = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      let daySpend = 0;
      let dayConversions = 0;
      let dayConversionValue = 0;
      let dayClicks = 0;
      let dayImpressions = 0;

      for (const camp of campaigns) {
        if (camp.historicalPoints && camp.historicalPoints[6 - i]) {
          const pt = camp.historicalPoints[6 - i];
          daySpend += pt.spend || 0;
          dayConversions += pt.conversions || 0;
          dayConversionValue += (pt.spend || 0) * (pt.roas || 1);
        } else {
          // Proportionate distribution if detailed daily points aren't present
          const weight = 0.12 + ((7 - i) * 0.005);
          daySpend += (camp.spend || 0) * weight;
          dayConversions += Math.round((camp.conversions || 0) * weight);
          dayConversionValue += (camp.conversionValue || 0) * weight;
          dayClicks += Math.round((camp.clicks || 0) * weight);
          dayImpressions += Math.round((camp.impressions || 0) * weight);
        }
      }

      const cpa = dayConversions > 0 ? daySpend / dayConversions : 0;
      const roas = daySpend > 0 ? dayConversionValue / daySpend : 0;
      const ctr = dayImpressions > 0 ? (dayClicks / dayImpressions) * 100 : 0;
      const cpc = dayClicks > 0 ? daySpend / dayClicks : 0;

      result.push({
        label,
        spend: Math.round(daySpend * 100) / 100,
        conversions: dayConversions,
        conversionValue: Math.round(dayConversionValue * 100) / 100,
        cpa: Math.round(cpa * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        ctr: Math.round(ctr * 10) / 10,
        cpc: Math.round(cpc * 100) / 100,
      });
    }

    return result;
  }, [campaigns]);

  // Helper to format values based on metric
  const formatMetricVal = (val: number, metric: ChartMetric) => {
    switch (metric) {
      case 'spend':
      case 'conversionValue':
        return `$${val.toLocaleString()}`;
      case 'cpa':
      case 'cpc':
        return `$${val.toFixed(2)}`;
      case 'roas':
        return `${val.toFixed(2)}x`;
      case 'ctr':
        return `${val.toFixed(2)}%`;
      case 'conversions':
        return val.toString();
    }
  };

  // Map values to chart height (normalized between 0 and 100)
  const currentValues = daysData.length > 0 ? daysData.map((d) => d[activeMetric]) : [];
  const maxVal = currentValues.length > 0 ? Math.max(...currentValues) * 1.25 || 100 : 100;
  const minVal = 0;

  // Generate SVG points coordinates
  const width = 680;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;

  const getCoordinates = (values: number[]) => {
    if (values.length <= 1) return [];
    return values.map((val, idx) => {
      const x = paddingX + (idx / (values.length - 1)) * (width - 2 * paddingX);
      const y = height - paddingY - ((val - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
      return { x, y };
    });
  };

  // Curvature helper for smooth SVG Bézier curve
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const primaryCoords = getCoordinates(currentValues);
  // Secondary comparison values (simulating prior period)
  const prevValues = currentValues.map((v) => v * 0.88);
  const secondaryCoords = getCoordinates(prevValues);

  const primaryPath = createSmoothPath(primaryCoords);
  const secondaryPath = createSmoothPath(secondaryCoords);
  const primaryAreaPath = primaryCoords.length > 0
    ? `${primaryPath} L ${primaryCoords[primaryCoords.length - 1].x},${height - paddingY} L ${primaryCoords[0].x},${height - paddingY} Z`
    : '';

  const hoveredPoint = hoverIndex !== null && primaryCoords[hoverIndex] ? primaryCoords[hoverIndex] : primaryCoords[0] || null;
  const hoveredData = hoverIndex !== null && daysData[hoverIndex] ? daysData[hoverIndex] : daysData[0] || null;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col justify-between">
      {/* Top Header & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Performance Overview
          </h2>
          <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto py-1">
            {[
              { id: 'spend' as ChartMetric, label: 'Spend' },
              { id: 'conversionValue' as ChartMetric, label: 'Revenue' },
              { id: 'conversions' as ChartMetric, label: 'Conversions' },
              { id: 'roas' as ChartMetric, label: 'ROAS' },
              { id: 'cpa' as ChartMetric, label: 'CPA' },
              { id: 'ctr' as ChartMetric, label: 'CTR' },
              { id: 'cpc' as ChartMetric, label: 'CPC' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMetric(tab.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                  activeMetric === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend & Period Dropdown */}
        <div className="flex items-center gap-4">
          {/* Legend dots (Matching reference: Income / Expenses style) */}
          <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00d67d]" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
              <span>Previous</span>
            </div>
          </div>

          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span>
                {selectedPeriod === 'LAST_7_DAYS'
                  ? 'Last 7 days'
                  : selectedPeriod === 'LAST_30_DAYS'
                  ? 'Last 30 days'
                  : selectedPeriod === 'TODAY'
                  ? 'Today'
                  : 'Previous period'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showPeriodDropdown && (
              <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-slate-200 p-1 z-30 animate-in fade-in zoom-in-95 duration-75">
                {[
                  { id: 'TODAY' as DateRangePeriod, label: 'Today' },
                  { id: 'LAST_7_DAYS' as DateRangePeriod, label: 'Last 7 days' },
                  { id: 'LAST_30_DAYS' as DateRangePeriod, label: 'Last 30 days' },
                  { id: 'PREVIOUS_PERIOD' as DateRangePeriod, label: 'Previous period' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectPeriod(item.id);
                      setShowPeriodDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      selectedPeriod === item.id
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      {daysData.length === 0 ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 mt-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Performance Telemetry Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Connect your Google Ads account or create a campaign to track real-time pacing curves, CPA efficiency, and blended ROAS.
          </p>
        </div>
      ) : (
        <>
          <div className="relative w-full h-[240px] mt-4">
            {/* Y Axis Guide Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-slate-400 font-mono">
              <div className="border-b border-slate-100 pb-0.5 flex justify-between">
                <span>{formatMetricVal(maxVal, activeMetric)}</span>
              </div>
              <div className="border-b border-slate-100 pb-0.5 flex justify-between">
                <span>{formatMetricVal(maxVal * 0.66, activeMetric)}</span>
              </div>
              <div className="border-b border-slate-100 pb-0.5 flex justify-between">
                <span>{formatMetricVal(maxVal * 0.33, activeMetric)}</span>
              </div>
              <div className="border-b border-slate-100 pb-0.5 flex justify-between">
                <span>0</span>
              </div>
            </div>

            {/* SVG Curves */}
            <svg
              className="absolute inset-0 w-full h-full overflow-visible"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00d67d" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#00d67d" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gradient Area under current curve */}
              <path d={primaryAreaPath} fill="url(#emeraldGradient)" />

              {/* Secondary comparison line (Warm Amber/Yellow) */}
              <path
                d={secondaryPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="opacity-80"
              />

              {/* Primary current line (Vivid Emerald Green) */}
              <path
                d={primaryPath}
                fill="none"
                stroke="#00d67d"
                strokeWidth="3.2"
                strokeLinecap="round"
              />

              {/* Interactive vertical hover line */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1={paddingY}
                  x2={hoveredPoint.x}
                  y2={height - paddingY}
                  stroke="#00d67d"
                  strokeDasharray="4 4"
                  strokeWidth="1.5"
                  className="opacity-70"
                />
              )}

              {/* Interactive dots */}
              {primaryCoords.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIndex === idx ? 6 : 4}
                  fill={hoverIndex === idx ? '#00d67d' : '#ffffff'}
                  stroke="#00d67d"
                  strokeWidth={hoverIndex === idx ? 3 : 2}
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoverIndex(idx)}
                />
              ))}
            </svg>

            {/* Floating Tooltip Pill (Matching the $5,500 green pill in reference screenshot!) */}
            {hoveredPoint && hoveredData && (
              <div
                className="absolute -translate-x-1/2 pointer-events-none transition-all duration-150 z-10"
                style={{
                  left: `${(hoveredPoint.x / width) * 100}%`,
                  top: `${Math.max(10, (hoveredPoint.y / height) * 100 - 18)}%`,
                }}
              >
                <div className="bg-[#00d67d] text-slate-950 font-bold px-2.5 py-1 rounded-xl text-xs shadow-lg shadow-[#00d67d]/30 flex items-center gap-1">
                  <span>{formatMetricVal(hoveredData[activeMetric], activeMetric)}</span>
                </div>
                {/* Tooltip caret */}
                <div className="w-2 h-2 bg-[#00d67d] rotate-45 mx-auto -mt-1" />
              </div>
            )}
          </div>

          {/* X Axis Date Labels */}
          <div className="flex justify-between items-center px-4 pt-3 border-t border-slate-100 text-xs font-medium text-slate-500">
            {daysData.map((d, idx) => (
              <button
                key={idx}
                onClick={() => setHoverIndex(idx)}
                className={`transition-colors ${
                  hoverIndex === idx ? 'text-slate-950 font-bold' : 'hover:text-slate-900'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
