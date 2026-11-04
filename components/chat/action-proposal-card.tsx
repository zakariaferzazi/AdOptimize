'use client';

import React from 'react';
import {
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import { ProposedAccountChange } from '@/types/adoptimize';

interface ActionProposalCardProps {
  proposal: ProposedAccountChange;
  messageId: string;
  isExecuting: boolean;
  onApprove: (proposal: ProposedAccountChange, messageId: string) => void;
  onDecline: (proposalId: string, messageId: string) => void;
  onCampaignClick?: (campaignName: string) => void;
}

export function ActionProposalCard({
  proposal,
  messageId,
  isExecuting,
  onApprove,
  onDecline,
  onCampaignClick,
}: ActionProposalCardProps) {
  const isPending = proposal.status === 'PENDING_APPROVAL';
  const isExecuted = proposal.status === 'EXECUTED';
  const isDeclined = proposal.status === 'DECLINED';
  const isFailed = proposal.status === 'FAILED';

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-900 p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
              Proposed Google Ads Change
            </h4>
            <p className="text-[11px] text-slate-500">
              Explicit user approval required before any changes are applied
            </p>
          </div>
        </div>

        <span
          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
            isPending
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : isExecuted
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : isDeclined
              ? 'bg-slate-100 text-slate-700'
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}
        >
          {proposal.status.replace('_', ' ')}
        </span>
      </div>

      {/* Main Details */}
      <div className="space-y-3 text-xs">
        <div>
          <span className="font-bold text-slate-700">Affected Campaign: </span>
          {onCampaignClick ? (
            <button
              onClick={() => onCampaignClick(proposal.campaignName)}
              className="font-bold text-slate-950 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{proposal.campaignName}</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </button>
          ) : (
            <span className="font-bold text-slate-950">{proposal.campaignName}</span>
          )}
        </div>

        {/* Current vs Proposed Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
              Current Settings
            </span>
            <span className="font-mono text-slate-800 font-semibold text-xs">
              {proposal.currentSettings}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#00a85e] uppercase tracking-wider block mb-0.5">
              Proposed Change
            </span>
            <span className="font-mono text-slate-950 font-bold text-xs">
              {proposal.proposedChanges}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div>
          <span className="font-bold text-slate-700">Reason for Recommendation: </span>
          <span className="text-slate-700">{proposal.reason}</span>
        </div>

        {/* Supporting Evidence */}
        <div>
          <span className="font-bold text-slate-700">Supporting Performance Metrics: </span>
          <span className="font-mono text-[11px] text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
            {proposal.evidence}
          </span>
        </div>

        {/* Potential Risks */}
        <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl text-[11px] text-amber-950 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Potential Risks:</strong> {proposal.potentialRisks}
          </span>
        </div>
      </div>

      {/* Outcome Banner */}
      {proposal.executionResult && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
            isExecuted
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
              : isDeclined
              ? 'bg-slate-100 text-slate-700 border border-slate-200'
              : 'bg-rose-50 text-rose-950 border border-rose-300'
          }`}
        >
          {isExecuted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : isDeclined ? (
            <XCircle className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{proposal.executionResult}</span>
        </div>
      )}

      {/* Action Buttons */}
      {isPending && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => onApprove(proposal, messageId)}
            disabled={isExecuting}
            className="px-5 py-2.5 bg-[#00d67d] hover:bg-[#00c06f] disabled:opacity-50 text-slate-950 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            {isExecuting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
            ) : (
              <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
            )}
            <span>{isExecuting ? 'Applying in Google Ads...' : 'Approve & Execute Change'}</span>
          </button>

          <button
            onClick={() => onDecline(proposal.id, messageId)}
            disabled={isExecuting}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-2xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
            <span>Decline</span>
          </button>
        </div>
      )}
    </div>
  );
}
