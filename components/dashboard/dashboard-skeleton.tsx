'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Minimal Top Loading Status Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div className="h-4 w-48 bg-slate-200 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-slate-100 rounded-xl" />
          <div className="h-8 w-32 bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-100" />
            </div>
            <div className="h-7 w-32 bg-slate-200 rounded-md" />
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <div className="h-4 w-14 bg-slate-100 rounded-md" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Upper Row: Performance Chart & AdOptimize AI */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        {/* Chart Skeleton (col-span-2) */}
        <div className="xl:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="h-5 w-40 bg-slate-200 rounded" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-slate-100 rounded-lg" />
              <div className="h-6 w-16 bg-slate-100 rounded-lg" />
              <div className="h-6 w-16 bg-slate-100 rounded-lg" />
            </div>
          </div>
          <div className="h-64 rounded-2xl bg-slate-50/80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Loading performance history...</span>
            </div>
          </div>
        </div>

        {/* AdOptimize AI Skeleton (col-span-1) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100" />
              <div className="h-4 w-28 bg-slate-200 rounded" />
            </div>
            <div className="h-4 w-14 bg-slate-100 rounded" />
          </div>
          <div className="h-20 bg-slate-50 rounded-2xl" />
          <div className="space-y-2">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="flex flex-wrap gap-1.5">
              <div className="h-6 w-24 bg-slate-100 rounded-xl" />
              <div className="h-6 w-28 bg-slate-100 rounded-xl" />
              <div className="h-6 w-24 bg-slate-100 rounded-xl" />
            </div>
          </div>
          <div className="h-9 bg-slate-50 rounded-xl" />
        </div>
      </div>

      {/* Lower Row: Performance Alerts & AI Insights */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        <div className="xl:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <div className="h-5 w-36 bg-slate-200 rounded" />
          <div className="h-28 bg-slate-50 rounded-2xl" />
        </div>
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          <div className="h-28 bg-slate-50 rounded-2xl" />
        </div>
      </div>

      {/* Campaigns Table Skeleton */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 bg-slate-200 rounded" />
          <div className="h-8 w-48 bg-slate-100 rounded-xl" />
        </div>
        <div className="space-y-2 pt-2">
          {[1, 2, 3].map((r) => (
            <div key={r} className="h-12 bg-slate-50 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
