import { createHash, randomUUID } from 'crypto';
import { getStore } from '@/lib/store';
import type { ProposalRecord, ProposalStatus } from '@/lib/store/types';
import type { ActionType, ProposalTarget } from '@/lib/google-ads/catalog';

/**
 * Durable proposal lifecycle.
 *
 * A proposal is the only thing that can authorise a mutation. It is stored
 * server-side, bound to the user, conversation and account, versioned by
 * revision, and claimed with a compare-and-swap so a change can never be
 * applied twice. A new proposal supersedes an older pending one only when it
 * belongs to the same task and targets the same thing, so unrelated pending
 * changes in one conversation stay independently approvable.
 */

export const PROPOSAL_EXPIRATION_MINUTES = Number(process.env.AI_PROPOSAL_EXPIRATION_MINUTES || 60);

export function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function hashPayload(payload: Record<string, unknown>): string {
  return createHash('sha256').update(stableSerialize(payload)).digest('hex');
}

export function idempotencyKey(proposalId: string, revision: number, payloadHash: string): string {
  return createHash('sha256').update(`${proposalId}:${revision}:${payloadHash}`).digest('hex');
}

export interface ProposalMeta {
  taskId?: string;
  targetKey: string;
  title: string;
  summary: string;
  changes: string[];
  warnings: string[];
  destructive: boolean;
  actionType: ActionType;
  target: ProposalTarget;
  reason?: string;
}

export function parseMeta(record: Pick<ProposalRecord, 'meta' | 'operation'>): ProposalMeta {
  const fallback: ProposalMeta = {
    targetKey: record.operation,
    title: record.operation.replace(/_/g, ' '),
    summary: record.operation.replace(/_/g, ' '),
    changes: [],
    warnings: [],
    destructive: false,
    actionType: 'UPDATE_SETTINGS',
    target: { kind: 'account', label: 'Account' },
  };
  if (!record.meta) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(record.meta) as Partial<ProposalMeta>) };
  } catch {
    return fallback;
  }
}

export interface CreateProposalInput {
  userId: string;
  conversationId: string;
  accountId: string;
  operation: string;
  payload: Record<string, unknown>;
  before: Record<string, unknown>;
  meta: ProposalMeta;
}

export async function createProposal(
  input: CreateProposalInput
): Promise<{ record: ProposalRecord; supersededIds: string[] }> {
  const store = await getStore();
  const now = new Date();
  const payloadHash = hashPayload(input.payload);

  const existing = await store.proposals.listByConversation(input.conversationId, input.userId);
  const replaced = existing.filter((record) => {
    if (record.status !== 'pending_approval' || record.operation !== input.operation) return false;
    const meta = parseMeta(record);
    return meta.targetKey === input.meta.targetKey && (meta.taskId || null) === (input.meta.taskId || null);
  });
  const latestReplaced = replaced[0];

  const record: ProposalRecord = {
    id: randomUUID(),
    user_id: input.userId,
    conversation_id: input.conversationId,
    account_id: input.accountId,
    revision: latestReplaced ? latestReplaced.revision + 1 : 1,
    status: 'pending_approval',
    operation: input.operation,
    payload: JSON.stringify(input.payload),
    payload_hash: payloadHash,
    before_snapshot: JSON.stringify(input.before),
    supersedes_id: latestReplaced?.id || null,
    expires_at: new Date(now.getTime() + PROPOSAL_EXPIRATION_MINUTES * 60 * 1000).toISOString(),
    result: null,
    meta: JSON.stringify(input.meta),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  await store.proposals.create(record);

  for (const previous of replaced) {
    await store.proposals.update({ ...previous, status: 'superseded', updated_at: now.toISOString() });
  }

  await store.audit.append({
    id: randomUUID(),
    event: latestReplaced ? 'proposal_revised' : 'proposal_created',
    proposal_id: record.id,
    conversation_id: record.conversation_id,
    user_id: record.user_id,
    account_id: record.account_id,
    timestamp: now.toISOString(),
    details: JSON.stringify({
      operation: record.operation,
      revision: record.revision,
      supersedes_id: record.supersedes_id,
      target: input.meta.targetKey,
      task: input.meta.taskId || null,
    }),
  });

  return { record, supersededIds: replaced.map((item) => item.id) };
}

export interface ProposalView {
  proposalId: string;
  revision: number;
  status: ProposalStatus;
  operation: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  title: string;
  summary: string;
  changes: string[];
  warnings: string[];
  destructive: boolean;
  actionType: ActionType;
  target: ProposalTarget;
  campaignId?: string;
  campaignName?: string;
  beforeSnapshot: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
  result: unknown;
}

function safeParse(value: string | null): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function toProposalView(record: ProposalRecord): ProposalView {
  const payload = (safeParse(record.payload) || {}) as Record<string, unknown>;
  const beforeSnapshot = (safeParse(record.before_snapshot) || {}) as Record<string, unknown>;
  const meta = parseMeta(record);
  return {
    proposalId: record.id,
    revision: record.revision,
    status: record.status,
    operation: record.operation,
    payload,
    payloadHash: record.payload_hash,
    title: meta.title,
    summary: meta.summary,
    changes: meta.changes,
    warnings: meta.warnings,
    destructive: meta.destructive,
    actionType: meta.actionType,
    target: meta.target,
    campaignId: meta.target.campaignId || (payload.campaignId ? String(payload.campaignId) : undefined),
    campaignName: meta.target.campaignName || (beforeSnapshot.name ? String(beforeSnapshot.name) : undefined),
    beforeSnapshot,
    expiresAt: record.expires_at,
    createdAt: record.created_at,
    result: safeParse(record.result),
  };
}

export function isExpired(record: ProposalRecord, now = Date.now()): boolean {
  if (!record.expires_at) return false;
  return now >= new Date(record.expires_at).getTime();
}

export class ProposalError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status = 409, code?: string) {
    super(message);
    this.name = 'ProposalError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Approve the exact revision the user is looking at.
 *
 * The compare-and-swap in the store guarantees that a stale revision, a
 * superseded proposal, or a second click cannot approve anything. Destructive
 * changes additionally require an explicit acknowledgement from the UI.
 */
export async function approveProposalRevision(input: {
  userId: string;
  proposalId: string;
  revision: number;
  payloadHash: string;
  acknowledgeRisk?: boolean;
}): Promise<ProposalRecord> {
  const store = await getStore();
  const record = await store.proposals.get(input.proposalId, input.userId);
  if (!record) throw new ProposalError('This proposal was not found.', 404);

  if (record.revision !== input.revision || record.payload_hash !== input.payloadHash) {
    throw new ProposalError('This proposal has been revised. Approve the latest version shown in the conversation.', 409);
  }

  if (isExpired(record) && record.status === 'pending_approval') {
    await store.proposals.update({ ...record, status: 'expired', updated_at: new Date().toISOString() });
    throw new ProposalError('This proposal has expired. Ask for the change again so it is re-checked against live data.', 409);
  }

  if (record.status === 'approved') return record;
  if (record.status !== 'pending_approval') {
    throw new ProposalError(`This proposal cannot be approved while it is ${record.status.replace(/_/g, ' ')}.`, 409);
  }

  if (parseMeta(record).destructive && input.acknowledgeRisk !== true) {
    throw new ProposalError(
      'This change stops delivery or removes something. Confirm that you understand the impact to approve it.',
      428,
      'acknowledgement_required'
    );
  }

  const approved = await store.proposals.approve(input.proposalId, input.userId, input.revision, input.payloadHash);
  if (!approved) throw new ProposalError('This proposal changed while it was being approved. Review the latest version.', 409);

  await store.audit.append({
    id: randomUUID(),
    event: 'proposal_approved',
    proposal_id: approved.id,
    conversation_id: approved.conversation_id,
    user_id: approved.user_id,
    account_id: approved.account_id,
    timestamp: new Date().toISOString(),
    details: JSON.stringify({ revision: approved.revision, operation: approved.operation, acknowledgedRisk: Boolean(input.acknowledgeRisk) }),
  });

  return approved;
}

export async function cancelProposalRevision(input: { userId: string; proposalId: string }): Promise<ProposalRecord> {
  const store = await getStore();
  const record = await store.proposals.get(input.proposalId, input.userId);
  if (!record) throw new ProposalError('This proposal was not found.', 404);
  if (record.status === 'cancelled') return record;
  if (record.status !== 'pending_approval' && record.status !== 'approved') {
    throw new ProposalError(`This proposal cannot be cancelled while it is ${record.status.replace(/_/g, ' ')}.`, 409);
  }
  const cancelled: ProposalRecord = { ...record, status: 'cancelled', updated_at: new Date().toISOString() };
  await store.proposals.update(cancelled);
  await store.audit.append({
    id: randomUUID(),
    event: 'proposal_cancelled',
    proposal_id: record.id,
    conversation_id: record.conversation_id,
    user_id: record.user_id,
    account_id: record.account_id,
    timestamp: new Date().toISOString(),
    details: JSON.stringify({ revision: record.revision }),
  });
  return cancelled;
}

/**
 * Safe expiry: only proposals still awaiting approval whose own expiry has
 * passed are expired. Returns the expired records so callers can record them.
 */
export async function expireStaleProposals(userId: string, conversationId: string): Promise<ProposalRecord[]> {
  const store = await getStore();
  const records = await store.proposals.listByConversation(conversationId, userId);
  const expired: ProposalRecord[] = [];
  for (const record of records) {
    if (record.status !== 'pending_approval' || !isExpired(record)) continue;
    const next = { ...record, status: 'expired' as const, updated_at: new Date().toISOString() };
    await store.proposals.update(next);
    expired.push(next);
  }
  return expired;
}
