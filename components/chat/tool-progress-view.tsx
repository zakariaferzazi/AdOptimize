'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Database,
  BarChart3,
  Sliders,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { ToolCallExecution } from '@/types/adoptimize';

// Friendly names mapping for internal tools
const TOOL_FRIENDLY_MAP: Record<
  string,
  { label: string; activeText: string; icon: any }
> = {
  get_account_overview: {
    label: 'Retrieved account overview and spend totals',
    activeText: 'Retrieving account overview...',
    icon: Database,
  },
  get_account_performance: {
    label: 'Analyzed campaign performance trends',
    activeText: 'Retrieving campaign performance data...',
    icon: BarChart3,
  },
  get_campaigns: {
    label: 'Inspected active campaigns and daily budgets',
    activeText: 'Inspecting campaigns and budgets...',
    icon: Search,
  },
  get_campaign_performance: {
    label: 'Inspected campaign metrics & Quality Score',
    activeText: 'Inspecting campaign metrics...',
    icon: BarChart3,
  },
  get_search_terms: {
    label: 'Audited user search terms and query intent',
    activeText: 'Auditing search queries and conversions...',
    icon: Search,
  },
  get_keywords: {
    label: 'Reviewed targeted keywords and match types',
    activeText: 'Reviewing keyword match types...',
    icon: Search,
  },
  get_ads_performance: {
    label: 'Reviewed responsive search ad headlines & CTR',
    activeText: 'Reviewing ad creatives...',
    icon: BarChart3,
  },
  get_conversion_metrics: {
    label: 'Analyzed conversion rates and blended CPA',
    activeText: 'Analyzing CPA & conversion rates...',
    icon: BarChart3,
  },
  get_performance_changes: {
    label: 'Compared period-over-period campaign shifts',
    activeText: 'Comparing performance against previous period...',
    icon: Sliders,
  },
  get_change_history: {
    label: 'Retrieved recent account audit logs',
    activeText: 'Retrieving change history...',
    icon: Database,
  },
  analyze_account: {
    label: 'Completed diagnostic audit across active campaigns',
    activeText: 'Auditing account efficiency...',
    icon: ShieldCheck,
  },
  find_wasted_spend: {
    label: 'Identified non-converting queries and bleeder campaigns',
    activeText: 'Scanning for wasted ad spend...',
    icon: ShieldCheck,
  },
  identify_underperforming_campaigns: {
    label: 'Identified campaigns exceeding target CPA benchmark',
    activeText: 'Auditing campaign efficiency & CPA...',
    icon: BarChart3,
  },
  diagnose_performance_changes: {
    label: 'Diagnosed root-cause factors behind CPA fluctuations',
    activeText: 'Diagnosing performance changes...',
    icon: Sliders,
  },
  propose_budget_reallocation: {
    label: 'Calculated optimal capital redistribution for higher ROAS',
    activeText: 'Calculating budget reallocation...',
    icon: Sliders,
  },
  propose_campaign_status_change: {
    label: 'Prepared transparent campaign status change proposal',
    activeText: 'Preparing campaign change proposal...',
    icon: ShieldCheck,
  },
  propose_campaign_budget_change: {
    label: 'Prepared transparent daily budget modification proposal',
    activeText: 'Preparing budget modification proposal...',
    icon: ShieldCheck,
  },
  update_campaign_budget: {
    label: 'Prepared campaign budget update proposal',
    activeText: 'Preparing budget update...',
    icon: Sliders,
  },
  pause_campaign: {
    label: 'Prepared campaign pause proposal',
    activeText: 'Preparing campaign pause proposal...',
    icon: ShieldCheck,
  },
};

export function getFriendlyToolDescription(toolName: string): string {
  if (TOOL_FRIENDLY_MAP[toolName]) {
    return TOOL_FRIENDLY_MAP[toolName].label;
  }
  // Convert any snake_case tool name to clean title
  return toolName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getFriendlyActiveToolText(toolName: string): string {
  if (TOOL_FRIENDLY_MAP[toolName]) {
    return TOOL_FRIENDLY_MAP[toolName].activeText;
  }
  return 'Analyzing campaign performance...';
}

/**
 * Clean Live Progress Box during chat requests
 */
interface ToolProgressLiveProps {
  onCancel?: () => void;
  activeModelLabel?: string;
}

export function ToolProgressLive({ onCancel, activeModelLabel }: ToolProgressLiveProps) {
  return (
    <div className="flex gap-3 max-w-2xl mr-auto animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] border border-slate-800 flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
        <RefreshCw className="w-4 h-4 animate-spin text-[#00d67d]" />
      </div>

      <div className="p-4 rounded-3xl bg-white border border-slate-200/90 shadow-xs text-xs text-slate-700 space-y-2.5 max-w-md">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00d67d] animate-pulse" />
            <span>Analyzing campaign performance...</span>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold transition-colors cursor-pointer"
            >
              Stop
            </button>
          )}
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <Check className="w-3.5 h-3.5 text-[#00c06f] stroke-[2.5]" />
            <span>Retrieving Google Ads campaign data</span>
          </div>
          <div className="flex items-center gap-2 text-slate-800 font-medium">
            <Check className="w-3.5 h-3.5 text-[#00c06f] stroke-[2.5]" />
            <span>Inspecting conversion rates &amp; spend efficiency</span>
          </div>
          <div className="flex items-center gap-2 text-[#00a85e] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#00d67d] animate-ping ml-0.5 mr-1" />
            <span>Preparing recommendations &amp; findings...</span>
          </div>
        </div>

        {activeModelLabel && (
          <div className="text-[10px] text-slate-400 pt-1">
            Engine: {activeModelLabel}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Optional expandable Analysis Details accordion for completed responses
 */
interface ToolAnalysisDetailsProps {
  toolCalls: ToolCallExecution[];
}

export function ToolAnalysisDetails({ toolCalls }: ToolAnalysisDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  const validTools = toolCalls.filter((tc) => tc.status === 'success');
  const count = validTools.length;

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-[#00c06f]" />
        <span>
          {count} {count === 1 ? 'account source examined' : 'account sources examined'}
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 animate-in fade-in duration-150">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Analysis Details
          </div>
          <ul className="space-y-1.5">
            {validTools.map((tc, idx) => {
              const friendly = getFriendlyToolDescription(tc.name);
              return (
                <li
                  key={tc.id || idx}
                  className="flex items-start gap-2 text-[11px] text-slate-700 font-medium"
                >
                  <span className="text-[#00c06f] font-bold mt-0.5">✓</span>
                  <span>{friendly}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-[10px] text-slate-400 pt-1 italic">
            Grounded strictly in verified Google Ads account data.
          </p>
        </div>
      )}
    </div>
  );
}
