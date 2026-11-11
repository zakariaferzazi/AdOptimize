import type { ProposedAccountChange } from '@/types/adoptimize';
import type { ProposalStatus } from '@/lib/store/types';
import type { ProposalView } from './proposals';

/**
 * Maps server proposals onto the approval-card contract the chat UI renders.
 * Kept separate so the chat turn, conversation reload and execution routes all
 * present the same card for the same proposal.
 */

const STATUS_MAP: Record<ProposalStatus, ProposedAccountChange['status']> = {
  pending_approval: 'PENDING_APPROVAL',
  approved: 'APPROVED',
  executing: 'APPROVED',
  succeeded: 'EXECUTED',
  executed_unverified: 'EXECUTED_UNVERIFIED',
  failed: 'FAILED',
  superseded: 'SUPERSEDED',
  cancelled: 'DECLINED',
  expired: 'EXPIRED',
};

const HIDDEN_KEYS = new Set(['campaignId', 'resourceName', 'budgetResourceName', 'customGoalResource', 'adGroupId', 'criterionId', 'exists']);

function label(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}

function display(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
  if (Array.isArray(value)) {
    const items = value.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)));
    return items.length ? items.slice(0, 6).join(', ') + (items.length > 6 ? ` (+${items.length - 6} more)` : '') : 'none';
  }
  if (typeof value === 'object') {
    const parts = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const shown = display(item);
        return shown ? `${label(key)} ${shown}` : undefined;
      })
      .filter(Boolean);
    return parts.length ? parts.join(', ') : undefined;
  }
  return String(value);
}

export function describeCurrentState(before: Record<string, unknown>): string {
  const lines = Object.entries(before)
    .filter(([key]) => !HIDDEN_KEYS.has(key))
    .map(([key, value]) => {
      const shown = display(value);
      return shown ? `${label(key)}: ${shown}` : undefined;
    })
    .filter(Boolean);
  return lines.length ? lines.join('\n') : 'New resource (does not exist yet).';
}

function outcomeMessage(view: ProposalView): string | undefined {
  const result = view.result as { user_message?: string; error?: { message?: string } } | undefined;
  if (!result) return undefined;
  if (view.status === 'succeeded' || view.status === 'executed_unverified') return result.user_message;
  if (view.status === 'failed') return [result.user_message, result.error?.message].filter(Boolean).join(' ');
  return result.user_message;
}

export function toClientProposal(view: ProposalView, conversationId: string, messageId?: string): ProposedAccountChange {
  const reason = typeof view.payload.reason === 'string' && view.payload.reason ? view.payload.reason : view.summary;
  const status = STATUS_MAP[view.status] || 'FAILED';
  const executionResult =
    outcomeMessage(view) ||
    (status === 'SUPERSEDED'
      ? 'Replaced by a newer version of this proposal.'
      : status === 'DECLINED'
      ? 'Declined. No changes were made to Google Ads.'
      : status === 'EXPIRED'
      ? 'Expired before approval. Ask again to re-check it against live data.'
      : undefined);

  return {
    id: view.proposalId,
    proposalId: view.proposalId,
    revision: view.revision,
    payloadHash: view.payloadHash,
    conversationId,
    actionType: view.actionType,
    title: view.title,
    campaignId: view.campaignId || '',
    campaignName: view.target.label || view.campaignName || 'Account',
    currentSettings: describeCurrentState(view.beforeSnapshot),
    proposedChanges: view.changes.length ? view.changes.join('\n') : view.summary,
    reason,
    evidence: 'Checked against live Google Ads data and validated by Google Ads (validate-only) when prepared. It is re-checked for changes immediately before it is applied.',
    potentialRisks: view.warnings.length
      ? view.warnings.join(' ')
      : 'This changes your live account. It is applied only after you approve this exact version.',
    status,
    payload: view.payload,
    destructive: view.destructive || undefined,
    warnings: view.warnings.length ? view.warnings : undefined,
    ...(executionResult ? { executionResult } : {}),
    ...(messageId ? { messageId } : {}),
  };
}
