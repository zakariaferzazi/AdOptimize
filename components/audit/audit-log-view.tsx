'use client';

import React from 'react';
import {
  History,
  RotateCcw,
  CheckCircle2,
  Bot,
  User,
  Zap,
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';
import { AuditLog } from '@/types/adoptimize';

interface AuditLogViewProps {
  logs: AuditLog[];
  onRevertLog: (logId: string) => void;
}

export function AuditLogView({ logs, onRevertLog }: AuditLogViewProps) {
  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-[#00d67d] border border-emerald-500/30 text-xs font-semibold mb-3">
            <History className="w-3.5 h-3.5" />
            <span>Audit Proof Accountability</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Change Management & Audit Trail
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1.5 leading-relaxed">
            Every budget reallocation, status toggle, and negative keyword modification is recorded with timestamp, actor, and previous value. One-click instant revert available for all supported changes.
          </p>
        </div>

        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00d67d]" />
            <span>Google Ads API Synchronization: Verified</span>
          </div>
          <div>{logs.length} total logged actions</div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Campaign</th>
                <th className="py-3 px-3">Action Type</th>
                <th className="py-3 px-3">Previous Value</th>
                <th className="py-3 px-3">New Value</th>
                <th className="py-3 px-3">Actor & Source</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const isExecuted = log.status === 'EXECUTED';
                const isReverted = log.status === 'REVERTED';

                return (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Campaign */}
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {log.campaignName}
                    </td>

                    {/* Action Type */}
                    <td className="py-3.5 px-3 font-semibold text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px]">
                        {log.actionType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Previous Value */}
                    <td className="py-3.5 px-3 font-mono text-slate-500 line-through">
                      {log.previousValue}
                    </td>

                    {/* New Value */}
                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-700">
                      {log.newValue}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        {log.source === 'USER' ? (
                          <User className="w-3.5 h-3.5 text-slate-400" />
                        ) : log.source === 'AUTOMATION_RULE' ? (
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-[#00d67d]" />
                        )}
                        <span className="truncate max-w-[140px]">{log.userOrSystem}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isExecuted
                            ? 'bg-emerald-100 text-emerald-800'
                            : isReverted
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3 text-right">
                      {log.canRevert && log.status === 'EXECUTED' ? (
                        <button
                          onClick={() => onRevertLog(log.id)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Revert</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
