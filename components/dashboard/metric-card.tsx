'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  changeText: string;
  isPositiveChange: boolean;
  isNegativeBad?: boolean;
  icon: LucideIcon;
  variant?: 'dark' | 'light';
  subContext?: string;
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  changeText,
  isPositiveChange,
  isNegativeBad = false,
  icon: Icon,
  variant = 'light',
  subContext,
  onClick,
}: MetricCardProps) {
  const isDark = variant === 'dark';

  return (
    <div
      onClick={onClick}
      className={`rounded-3xl p-5 transition-all duration-200 select-none ${
        onClick ? 'cursor-pointer hover:scale-[1.01]' : ''
      } ${
        isDark
          ? 'bg-slate-950 text-white shadow-xl shadow-slate-950/10'
          : 'bg-white text-slate-900 border border-slate-200/70 shadow-xs hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-3.5">
        {/* Circular Icon Pill (Matching reference design) */}
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            isDark
              ? 'bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30'
              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          }`}
        >
          <Icon className="w-5 h-5 stroke-[2.2]" />
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={`text-xs font-medium truncate ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {label}
          </div>
          <div className="text-2xl font-bold tracking-tight font-sans tabular-nums mt-0.5">
            {value}
          </div>
        </div>
      </div>

      {/* Comparison Delta Footer */}
      {(changeText || subContext) && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            {isPositiveChange ? (
              <TrendingUp
                className={`w-3.5 h-3.5 ${
                  isNegativeBad ? 'text-rose-500' : 'text-emerald-600'
                }`}
              />
            ) : (
              <TrendingDown
                className={`w-3.5 h-3.5 ${
                  isNegativeBad ? 'text-emerald-600' : 'text-rose-500'
                }`}
              />
            )}
            <span
              className={
                isPositiveChange
                  ? isNegativeBad
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                  : isNegativeBad
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }
            >
              {changeText}
            </span>
          </div>

          {subContext && (
            <span
              className={`text-[11px] truncate max-w-[140px] ${
                isDark ? 'text-slate-400' : 'text-slate-400'
              }`}
            >
              {subContext}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
