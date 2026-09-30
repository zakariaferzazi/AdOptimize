'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Share2,
  DollarSign
} from 'lucide-react';
import { Campaign, PerformanceMetric, AIInsight, GoogleAdsAccount } from '@/types/adoptimize';

interface ReportsViewProps {
  campaigns: Campaign[];
  metrics: PerformanceMetric;
  insights: AIInsight[];
  account: GoogleAdsAccount;
}

export function ReportsView({ campaigns, metrics, insights, account }: ReportsViewProps) {
  const [reportPeriod, setReportPeriod] = useState('Last 7 Days');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    const headers = ['Campaign', 'Type', 'Daily Budget', 'Spend', 'Conversions', 'CPA', 'ROAS'];
    const rows = campaigns.map((c) => [
      `"${c.name}"`,
      c.type,
      c.budgetDaily,
      c.spend,
      c.conversions,
      c.cpa.toFixed(2),
      c.roas.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `adoptimize_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const topCampaign = [...campaigns].sort((a, b) => b.roas - a.roas)[0];
  const lowestCampaign = [...campaigns].sort((a, b) => a.roas - b.roas)[0];

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 text-xs font-semibold mb-3">
            <FileText className="w-3.5 h-3.5" />
            <span>Executive Performance Summary</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Performance Reports & Briefs
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
            Audit report ready for leadership, founders, and agency client presentations.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleDownloadCsv}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-[#00d67d] hover:bg-[#00c06f] text-slate-950 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Canvas */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-xs space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Report Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xl font-bold text-slate-900 tracking-tight">
              <span>.adopt</span>
              <span className="text-[#00d67d]">imize</span>
              <span className="text-slate-400 font-normal text-sm ml-2">Executive Performance Audit</span>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              Account: {account.accountName} (Customer ID: {account.clientCustomerId})
            </div>
          </div>

          <div className="text-right text-xs text-slate-500 font-mono">
            <div>Period: {reportPeriod}</div>
            <div>Generated: {new Date().toLocaleDateString()}</div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Executive Summary & Findings
          </h3>
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-800 leading-relaxed space-y-2">
            {campaigns.length === 0 ? (
              <p className="text-slate-500 italic">
                No campaign data currently recorded in this account. Connect your Google Ads account or create your first campaign to generate live performance audits.
              </p>
            ) : (
              <>
                <p>
                  Over the reporting period, your account deployed <strong>${metrics.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> in advertising capital across {campaigns.length} campaigns, generating <strong>{metrics.conversions} conversions</strong> at a blended CPA of <strong>${metrics.cpa.toFixed(2)}</strong> and an aggregate ROAS of <strong>{metrics.roas.toFixed(2)}x</strong>.
                </p>
                {topCampaign && (
                  <p>
                    <strong>Top Performer:</strong> Campaign <em>"{topCampaign.name}"</em> generated {topCampaign.conversions} conversions with a strong ROAS of <strong>{topCampaign.roas.toFixed(2)}x</strong> at ${topCampaign.cpa.toFixed(2)} CPA.
                    {lowestCampaign && lowestCampaign.id !== topCampaign.id && lowestCampaign.spend > 0 && (
                      <span> In contrast, <em>"{lowestCampaign.name}"</em> absorbed ${lowestCampaign.spend.toLocaleString()} with {lowestCampaign.roas.toFixed(2)}x ROAS, representing an immediate budget reallocation opportunity.</span>
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Key Aggregate Metrics Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            2. Core Financial & Acquisition Metrics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Total Spend</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                ${metrics.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Conversions</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {metrics.conversions}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Blended CPA</div>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                ${metrics.cpa.toFixed(2)}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">Account ROAS</div>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {metrics.roas.toFixed(2)}x
              </div>
            </div>
          </div>
        </div>

        {/* Campaign Breakdown Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            3. Campaign Breakdown
          </h3>
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">Campaign</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Spend</th>
                  <th className="py-2.5 px-3 text-right">Conversions</th>
                  <th className="py-2.5 px-3 text-right">CPA</th>
                  <th className="py-2.5 px-3 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 font-sans italic text-xs">
                      No campaigns currently configured in this account.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{c.name}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-500">{c.type}</td>
                      <td className="py-2.5 px-3 text-right">${c.spend.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{c.conversions}</td>
                      <td className="py-2.5 px-3 text-right">${c.cpa.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{c.roas.toFixed(2)}x</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority AI Recommendations */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            4. Priority Action Recommendations
          </h3>
          <div className="space-y-2.5">
            {insights.slice(0, 3).map((ins) => (
              <div key={ins.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                  <span>{ins.problem}</span>
                  <span className="font-mono text-emerald-700">{ins.confidence}% Confidence</span>
                </div>
                <div className="text-slate-600 leading-relaxed">{ins.recommendedAction}</div>
                <div className="text-emerald-700 font-semibold mt-1">Impact: {ins.expectedImpact}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
