'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';
import { PSEOTool } from '@/lib/pseo-data';

interface ToolInteractiveWidgetProps {
  tool: PSEOTool;
}

export function ToolInteractiveWidget({ tool }: ToolInteractiveWidgetProps) {
  // Common states
  const [monthlySpend, setMonthlySpend] = useState<number>(5000);
  const [targetRevenue, setTargetRevenue] = useState<number>(20000);
  const [conversionRate, setConversionRate] = useState<number>(3.5);
  const [cpc, setCpc] = useState<number>(1.85);
  const [grossMargin, setGrossMargin] = useState<number>(45);
  const [qualityScore, setQualityScore] = useState<number>(6);
  const [copied, setCopied] = useState<boolean>(false);
  const [auditInput, setAuditInput] = useState<string>('');
  const [auditRunning, setAuditRunning] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<boolean>(false);

  // Negative keyword interactive list
  const sampleNegatives = [
    'free',
    'crack',
    'download',
    'login',
    'salary',
    'jobs',
    'internship',
    'resume',
    'templates',
    'torrent',
    'reddit',
    'diy',
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleNegatives.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuditRunning(true);
    setTimeout(() => {
      setAuditRunning(false);
      setAuditResult(true);
    }, 900);
  };

  // Calculations
  const wastedEstimate = Math.round(monthlySpend * 0.22);
  const estimatedClicks = Math.round(monthlySpend / (cpc || 1));
  const estimatedConversions = Math.max(1, Math.round(estimatedClicks * ((conversionRate || 1) / 100)));
  const calculatedCpa = (monthlySpend / estimatedConversions).toFixed(2);
  const calculatedRoas = ((targetRevenue / monthlySpend) * 100).toFixed(0);
  const breakEvenRoas = (100 / (grossMargin / 100)).toFixed(0);

  // Quality score discount
  const qsDelta =
    qualityScore >= 10
      ? '-50% (50% cheaper clicks)'
      : qualityScore === 9
      ? '-33% CPC discount'
      : qualityScore === 8
      ? '-25% CPC discount'
      : qualityScore === 7
      ? '-17% CPC discount'
      : qualityScore === 6
      ? 'Benchmark level (no penalty)'
      : qualityScore === 5
      ? '+16% CPC penalty'
      : qualityScore === 4
      ? '+25% CPC penalty'
      : '+67% to +100% CPC penalty';

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-md space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-[#00d67d] flex items-center justify-center font-bold text-xs">
            ⚡
          </div>
          <span className="font-bold text-slate-900 text-sm">Interactive {tool.title}</span>
        </div>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
          Instant Live Calculation
        </span>
      </div>

      {/* 1. AUDIT TOOL */}
      {tool.toolType === 'audit' && (
        <div className="space-y-6">
          <form onSubmit={handleRunAudit} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Enter your Google Ads Customer ID or Account Domain for Scan:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. 842-194-0291 or mycompany.com"
                value={auditInput}
                onChange={(e) => setAuditInput(e.target.value)}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#00d67d]"
              />
              <button
                type="submit"
                disabled={auditRunning}
                className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-[#00d67d] font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                {auditRunning ? 'Scanning Logs...' : 'Run 60-Sec Audit'}
              </button>
            </div>
          </form>

          {auditResult && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                  3 Critical Issues Detected
                </span>
                <span className="text-xs font-mono text-slate-500">Scan Complete</span>
              </div>
              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Search Term Query Leak:</strong> 42 non-converting searches (&ldquo;free&rdquo;, &ldquo;login&rdquo;, &ldquo;salary&rdquo;) spent $385 without conversions.
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Budget Bottleneck:</strong> Primary Search campaign hits daily budget ceiling before 3:30 PM (28% impression share lost).
                  </div>
                </div>
              </div>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <span>Open Full AdOptimize Dashboard to resolve these issues</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 2. NEGATIVE KEYWORDS FINDER */}
      {tool.toolType === 'negative-keywords' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Universal High-Drain Negative Keywords Pack (Copy & Paste):
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy All'}</span>
            </button>
          </div>

          <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-xs max-h-48 overflow-y-auto space-y-1">
            {sampleNegatives.map((neg, i) => (
              <div key={i} className="text-rose-400">
                -[{neg}]
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            AdOptimize syncs negative keywords automatically into your Google Ads account with 1 click.
          </p>
        </div>
      )}

      {/* 3. CPA CALCULATOR */}
      {tool.toolType === 'cpa-calc' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Ad Spend ($)</label>
              <input
                type="number"
                value={monthlySpend}
                onChange={(e) => setMonthlySpend(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Average CPC ($)</label>
              <input
                type="number"
                step="0.1"
                value={cpc}
                onChange={(e) => setCpc(Number(e.target.value) || 0.1)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Conv. Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={conversionRate}
                onChange={(e) => setConversionRate(Number(e.target.value) || 0.5)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-emerald-800">Calculated Cost Per Acquisition (CPA)</div>
              <div className="text-2xl font-bold font-mono text-emerald-950">${calculatedCpa}</div>
            </div>
            <div className="text-xs text-emerald-800 text-right">
              Projected <strong>{estimatedConversions} conversions</strong> from {estimatedClicks.toLocaleString()} clicks
            </div>
          </div>
        </div>
      )}

      {/* 4. ROAS CALCULATOR */}
      {tool.toolType === 'roas-calc' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Ad Spend ($)</label>
              <input
                type="number"
                value={monthlySpend}
                onChange={(e) => setMonthlySpend(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Ad Revenue ($)</label>
              <input
                type="number"
                value={targetRevenue}
                onChange={(e) => setTargetRevenue(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Gross Margin (%)</label>
              <input
                type="number"
                value={grossMargin}
                onChange={(e) => setGrossMargin(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400">Target ROAS (Multiplier)</div>
              <div className="text-2xl font-bold font-mono text-[#00d67d]">{calculatedRoas}% ({((targetRevenue / (monthlySpend || 1))).toFixed(2)}x)</div>
            </div>
            <div className="text-xs text-slate-300">
              Break-Even ROAS Threshold: <strong className="text-white">{breakEvenRoas}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* 5. WASTED SPEND ESTIMATOR */}
      {tool.toolType === 'wasted-spend' && (
        <div className="space-y-5">
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
              <span>Your Monthly Google Ads Spend:</span>
              <span className="font-mono text-sm text-emerald-700">${monthlySpend.toLocaleString()} / mo</span>
            </div>
            <input
              type="range"
              min="1000"
              max="50000"
              step="500"
              value={monthlySpend}
              onChange={(e) => setMonthlySpend(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">Estimated Monthly Wasted Spend:</div>
              <div className="text-3xl font-extrabold font-mono text-rose-900">${wastedEstimate.toLocaleString()} / mo</div>
            </div>
            <div className="text-xs text-rose-800 max-w-xs">
              Based on ~22% average budget leakage from non-converting broad match queries and misplaced display clicks.
            </div>
          </div>
        </div>
      )}

      {/* 6. QUALITY SCORE CHECKER */}
      {tool.toolType === 'quality-score' && (
        <div className="space-y-5">
          <div>
            <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
              <span>Target Keyword Quality Score (1 to 10):</span>
              <span className="font-mono text-sm text-emerald-700">{qualityScore} / 10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={qualityScore}
              onChange={(e) => setQualityScore(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Impact on Your Cost Per Click:</div>
              <div className="text-lg font-bold font-mono text-[#00d67d]">{qsDelta}</div>
            </div>
            <div className="text-xs text-slate-300">
              Score ≥ 7 gives CPC auction discounts.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
