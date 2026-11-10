import { createHash, randomUUID } from 'crypto';
import { getStore } from '@/lib/store';
import type { ProposalRecord, ProposalStatus } from '@/lib/store/types';
import { getOperation } from '@/lib/google-ads/catalog';
import type { PreparedProposal } from '@/lib/mcp/google-ads-server';

/**
 * Durable proposal lifecycle.
 *
 * A proposal is the only thing that can authorise a mutation. It is stored
 * server-side, bound to the user and account, versioned by revision, and
 * claimed with a compare-and-swap so a change can never be applied twice.
 */

export const PROPOSAL_EXPIRATION_MINUTES = Number(
  process.env.AI_PROPOSAL_EXPIRATION_MINUTES || 60
);

export function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashPayload(payload: Record<string, unknown>): string {
  return createHash('sha256').update(stableSerialize(payload)).digest('hex');
}

export function idempotencyKey(proposalId: string, revision: number, payloadHash: string): string {
  return createHash('sha256')
    .update(`${proposalId}:${revision}:${payloadHash}`)
    .digest('hex');
}

export interface CreateProposalInput {
  userId: string;
  conversationId: string;
  accountId: string;
  prepared: PreparedProposal;
  supersedesId?: string;
  revision?: number;
}

export async function createProposal(input: CreateProposalInput): Promise<ProposalRecord> {
  const store = await getStore();
  const now = new Date();
  const payload = { ...input.prepared.args };
  const payloadHash = hashPayload(payload);

  let revision = input.revision || 1;
  let supersedesId = input.supersedesId;

  if (!supersedesId) {
    const latest = await store.proposals.getLatest(input.conversationId, input.userId);
    if (latest && latest.status === 'pending_approval') {
      supersedesId = latest.id;
      revision = latest.revision + 1;
    }
  }

  const record: ProposalRecord = {
    id: randomUUID(),
    user_id: input.userId,
    conversation_id: input.conversationId,
    account_id: input.accountId,
    revision,
    status: 'pending_approval',
    operation: input.prepared.operation,
    payload: JSON.stringify(payload),
    payload_hash: payloadHash,
    before_snapshot: JSON.stringify(input.prepared.beforeSnapshot),
    supersedes_id: supersedesId || null,
    expires_at: new Date(
      now.getTime() + PROPOSAL_EXPIRATION_MINUTES * 60 * 1000
    ).toISOString(),
    result: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  await store.proposals.create(record);

  if (supersedesId) {
    const previous = await store.proposals.get(supersedesId, input.userId);
    if (previous && previous.status === 'pending_approval') {
      await store.proposals.update({
        ...previous,
        status: 'superseded',
        updated_at: now.toISOString(),
      });
    }
  }

  await store.audit.append({
    id: randomUUID(),
    event: supersedesId ? 'proposal_revised' : 'proposal_created',
    proposal_id: record.id,
    conversation_id: record.conversation_id,
    user_id: record.user_id,
    account_id: record.account_id,
    timestamp: now.toISOString(),
    details: JSON.stringify({
      operation: record.operation,
      revision: record.revision,
      supersedes_id: supersedesId || null,
    }),
  });

  return record;
}

export interface ProposalView {
  proposalId: string;
  revision: number;
  status: ProposalStatus;
  operation: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  summary: string;
  campaignId?: string;
  campaignName?: string;
  beforeSnapshot: Record<string, unknown>;
  expiresAt: string | null;
  result: unknown;
}

export function toProposalView(record: ProposalRecord): ProposalView {
  const payload = safeParse(record.payload) as Record<string, unknown>;
  const beforeSnapshot = (safeParse(record.before_snapshot) || {}) as Record<string, unknown>;
  const operation = getOperation(record.operation);

  let summary = record.operation;
  if (operation) {
    try {
      summary = operation.summarize(payload, {
        customerId: record.account_id,
        campaign: {
          campaignId: String(payload.campaignId || ''),
          name: String(beforeSnapshot.name || ''),
          status: String(beforeSnapshot.status || ''),
          budgetDaily: beforeSnapshot.budgetDaily as number | undefined,
        },
      });
    } catch {
      summary = operation.description;
    }
  }

  return {
    proposalId: record.id,
    revision: record.revision,
    status: record.status,
    operation: record.operation,
    payload,
    payloadHash: record.payload_hash,
    summary,
    campaignId: payload.campaignId ? String(payload.campaignId) : undefined,
    campaignName: beforeSnapshot.name ? String(beforeSnapshot.name) : undefined,
    beforeSnapshot,
    expiresAt: record.expires_at,
    result: safeParse(record.result),
  };
}

function safeParse(value: string | null): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function isExpired(record: ProposalRecord, now = Date.now()): boolean {
  if (!record.expires_at) return false;
  return now >= new Date(record.expires_at).getTime();
}

export class ProposalError extends Error {
  readonly status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.name = 'ProposalError';
    this.status = status;
  }
}

/**
 * Approve the exact revision the user is looking at.
 *
 * The compare-and-swap in the store guarantees that a stale revision, a
 * superseded proposal, or a second click cannot approve anything.
 */
export async function approveProposalRevision(input: {
  userId: string;
  proposalId: string;
  revision: number;
  payloadHash: string;
}): Promise<ProposalRecord> {
  const store = await getStore();
  const record = await store.proposals.get(input.proposalId, input.userId);
  if (!record) throw new ProposalError('This proposal was not found.', 404);

  if (record.revision !== input.revision || record.payload_hash !== input.payloadHash) {
    throw new ProposalError(
      'This proposal has been revised. Approve the latest version shown in the conversation.',
      409
    );
  }

  if (isExpired(record)) {
    if (record.status === 'pending_approval') {
      await store.proposals.update({
        ...record,
        status: 'expired',
        updated_at: new Date().toISOString(),
      });
    }
    throw new ProposalError('This proposal has expired. Ask for the change again.', 409);
  }

  if (record.status === 'approved') return record;
  if (record.status !== 'pending_approval') {
    throw new ProposalError(
      `This proposal cannot be approved while it is ${record.status.replace(/_/g, ' ')}.`,
      409
    );
  }

  const approved = await store.proposals.approve(
    input.proposalId,
    input.userId,
    input.revision,
    input.payloadHash
  );
  if (!approved) {
    throw new ProposalError(
      'This proposal changed while it was being approved. Review the latest version.',
      409
    );
  }

  await store.audit.append({
    id: randomUUID(),
    event: 'proposal_approved',
    proposal_id: approved.id,
    conversation_id: approved.conversation_id,
    user_id: approved.user_id,
    account_id: approved.account_id,
    timestamp: new Date().toISOString(),
    details: JSON.stringify({ revision: approved.revision, operation: approved.operation }),
  });

  return approved;
}

export async function cancelProposalRevision(input: {
  userId: string;
  proposalId: string;
}): Promise<void> {
  const store = await getStore();
  const record = await store.proposals.get(input.proposalId, input.userId);
  if (!record) throw new ProposalError('This proposal was not found.', 404);
  if (record.status !== 'pending_approval') {
    throw new ProposalError(
      `This proposal cannot be cancelled while it is ${record.status.replace(/_/g, ' ')}.`,
      409
    );
  }
  await store.proposals.update({
    ...record,
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  });
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
}

/**
 * Safe expiry: only proposals that are still awaiting approval and whose own
 * expiry timestamp has passed are expired. Nothing is expired on deployment.
 */
export async function expireStaleProposals(userId: string, conversationId: string): Promise<number> {
  const store = await getStore();
  const latest = await store.proposals.getLatest(conversationId, userId);
  if (!latest || latest.status !== 'pending_approval' || !isExpired(latest)) return 0;
  await store.proposals.update({
    ...latest,
    status: 'expired',
    updated_at: new Date().toISOString(),
  });
  return 1;
}
