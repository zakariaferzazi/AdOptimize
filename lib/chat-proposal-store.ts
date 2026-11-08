import { createHash, randomUUID } from 'crypto';
import { GOOGLE_ADS_OPERATION_REGISTRY } from '@/lib/google-ads-tools';
import { ProposedAccountChange } from '@/types/adoptimize';
import { recordProposalState } from '@/lib/conversation-state';

export type ProposalStatus =
  | 'pending_approval'
  | 'approved'
  | 'executing'
  | 'succeeded'
  | 'failed'
  | 'executed_unverified'
  | 'superseded'
  | 'cancelled'
  | 'expired';

export interface ProposalRecord {
  id: string;
  conversation_id: string;
  revision: number;
  status: ProposalStatus;
  operation: string;
  payload: Record<string, any>;
  before_snapshot: Record<string, any>;
  payload_hash: string;
  supersedes_id?: string;
  created_at: string;
  updated_at: string;
  proposal: ProposedAccountChange;
  user_id?: string;
  account_id?: string;
  result?: ProposalExecutionResult;
}

export interface ProposalExecutionResult {
  status: 'succeeded' | 'executed_unverified' | 'failed';
  operation: string;
  real_ids?: Record<string, string>;
  before?: Record<string, any>;
  after?: Record<string, any>;
  error?: {
    type: string;
    message: string;
    next_step: string;
  };
  user_message: string;
  completed_at: string;
}

export interface ProposalRegistrationMetadata {
  userId?: string;
  accountId?: string;
  beforeSnapshot?: Record<string, any>;
}

interface ProposalAuditEvent {
  event:
    | 'proposal_created'
    | 'proposal_revised'
    | 'proposal_approved'
    | 'execution_started'
    | 'verified'
    | 'failed';
  proposal_id: string;
  conversation_id: string;
  user_id?: string;
  account_id?: string;
  timestamp: string;
  details?: Record<string, any>;
}

// Server-side proposal storage must not import the Firebase client SDK. That SDK
// depends on protobufjs, which uses `new Function` for runtime code generation,
// and Cloudflare Workers reject dynamic code generation with an EvalError at
// module load. This process-local store keeps the same proposal lifecycle API.
type ConversationProposals = Map<string, ProposalRecord>;
type ProposalStore = Map<string, ConversationProposals>;

const globalForProposals = globalThis as typeof globalThis & {
  __adoptimizeProposalStore?: ProposalStore;
};

const proposalStore: ProposalStore =
  globalForProposals.__adoptimizeProposalStore ?? new Map();

if (!globalForProposals.__adoptimizeProposalStore) {
  globalForProposals.__adoptimizeProposalStore = proposalStore;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function conversationProposals(conversationId: string): ConversationProposals {
  let bucket = proposalStore.get(conversationId);
  if (!bucket) {
    bucket = new Map();
    proposalStore.set(conversationId, bucket);
  }
  return bucket;
}

function addAuditEvent(event: ProposalAuditEvent) {
  console.info('[AI Chat Audit]', JSON.stringify(event));
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashProposalPayload(payload: Record<string, any>): string {
  return createHash('sha256').update(stableSerialize(payload)).digest('hex');
}

function toClientProposal(record: ProposalRecord): ProposedAccountChange {
  return {
    ...record.proposal,
    id: record.id,
    revision: record.revision,
    proposalId: record.id,
    payloadHash: record.payload_hash,
    conversationId: record.conversation_id,
    status:
      record.status === 'pending_approval'
        ? 'PENDING_APPROVAL'
        : record.status === 'succeeded'
        ? 'EXECUTED'
        : record.status === 'superseded'
        ? 'SUPERSEDED'
        : record.status === 'cancelled' || record.status === 'expired' || record.status === 'failed'
        ? 'FAILED'
        : 'APPROVED',
  };
}

export async function registerChatProposal(
  proposal: ProposedAccountChange,
  conversationId: string,
  supersedesId?: string,
  metadata: ProposalRegistrationMetadata = {}
): Promise<ProposedAccountChange> {
  const operationNameByAction: Record<string, string> = {
    UPDATE_BUDGET: 'update_campaign_budget',
    PAUSE_CAMPAIGN: 'pause_campaign',
    ENABLE_CAMPAIGN: 'enable_campaign',
    CREATE_CAMPAIGN: 'create_campaign',
  };
  const operation = GOOGLE_ADS_OPERATION_REGISTRY.find(
    (entry) => entry.name === (operationNameByAction[proposal.actionType] || proposal.actionType.toLowerCase())
  );
  const operationName = operation?.name || proposal.actionType;
  const payload = {
    ...(proposal.payload || {}),
    ...(proposal.actionType !== 'CREATE_CAMPAIGN' && proposal.campaignId
      ? { campaignId: proposal.campaignId, campaignNameOrId: proposal.campaignId }
      : {}),
  };
  const proposalId = randomUUID();
  const now = new Date().toISOString();
  const storedProposal = clone({ ...proposal, id: proposalId });
  const record: ProposalRecord = {
    id: proposalId,
    conversation_id: conversationId,
    revision: proposal.revision || 1,
    status: 'pending_approval',
    operation: operationName,
    payload,
    before_snapshot: metadata.beforeSnapshot || {
      campaignId: proposal.campaignId,
      campaignName: proposal.campaignName,
      currentSettings: proposal.currentSettings,
    },
    payload_hash: hashProposalPayload(payload),
    created_at: now,
    updated_at: now,
    proposal: storedProposal,
    ...(metadata.userId ? { user_id: metadata.userId } : {}),
    ...(metadata.accountId ? { account_id: metadata.accountId } : {}),
    ...(supersedesId ? { supersedes_id: supersedesId } : {}),
  };

  const bucket = conversationProposals(conversationId);
  if (supersedesId) {
    const old = bucket.get(supersedesId);
    if (old && old.status === 'pending_approval') {
      bucket.set(supersedesId, { ...old, status: 'superseded', updated_at: now });
      addAuditEvent({
        event: 'proposal_revised',
        proposal_id: proposalId,
        conversation_id: conversationId,
        user_id: metadata.userId,
        account_id: metadata.accountId,
        timestamp: now,
        details: { supersedes_id: supersedesId, previous_revision: old.revision },
      });
    }
  }
  bucket.set(proposalId, clone(record));
  addAuditEvent({
    event: 'proposal_created',
    proposal_id: proposalId,
    conversation_id: conversationId,
    user_id: metadata.userId,
    account_id: metadata.accountId,
    timestamp: now,
    details: { revision: record.revision, operation: record.operation },
  });

  await recordProposalState(
    conversationId,
    metadata.accountId || 'unknown',
    proposalId,
    proposal.campaignId && !proposal.campaignId.startsWith('draft-')
      ? { id: proposal.campaignId, name: proposal.campaignName }
      : proposal.actionType === 'CREATE_CAMPAIGN'
      ? { id: proposalId, name: proposal.campaignName }
      : undefined,
    proposal.proposedChanges
  );

  return toClientProposal(record);
}

export async function getProposalRecord(
  conversationId: string,
  proposalId: string
): Promise<ProposalRecord | undefined> {
  const record = conversationProposals(conversationId).get(proposalId);
  return record ? clone(record) : undefined;
}

export async function getLatestProposal(conversationId: string): Promise<ProposalRecord | undefined> {
  const latest = [...conversationProposals(conversationId).values()]
    .filter((record) => record.status === 'pending_approval')
    .sort((left, right) => right.revision - left.revision)[0];
  return latest ? clone(latest) : undefined;
}

export function proposalRecordToClientProposal(record: ProposalRecord): ProposedAccountChange {
  return toClientProposal(record);
}

export async function approveProposal(
  conversationId: string,
  proposalId: string,
  revision: number,
  payloadHash: string,
  expirationMinutes = 60
): Promise<{ status: 'approved' | 'already_approved'; proposal: ProposedAccountChange }> {
  const bucket = conversationProposals(conversationId);
  const record = bucket.get(proposalId);
  if (!record) throw new Error('Proposal was not found.');
  if (record.revision !== revision || record.payload_hash !== payloadHash) {
    throw new Error('This proposal revision is stale.');
  }
  const now = new Date().toISOString();
  if (Date.now() >= proposalExpiresAt(record, expirationMinutes)) {
    bucket.set(proposalId, { ...record, status: 'expired', updated_at: now });
    throw new Error('This proposal has expired and cannot be approved.');
  }
  if (record.status === 'approved') {
    return { status: 'already_approved', proposal: toClientProposal(record) };
  }
  if (record.status !== 'pending_approval') {
    throw new Error(`Proposal cannot be approved while it is ${record.status}.`);
  }
  const approved: ProposalRecord = { ...record, status: 'approved', updated_at: now };
  bucket.set(proposalId, approved);
  addAuditEvent({
    event: 'proposal_approved',
    proposal_id: record.id,
    conversation_id: record.conversation_id,
    user_id: record.user_id,
    account_id: record.account_id,
    timestamp: now,
    details: { revision: record.revision, operation: record.operation },
  });
  return { status: 'approved', proposal: toClientProposal(approved) };
}

export async function claimProposalForExecution(
  conversationId: string,
  proposalId: string,
  revision: number,
  payloadHash: string
): Promise<ProposalRecord> {
  const bucket = conversationProposals(conversationId);
  const record = bucket.get(proposalId);
  if (!record) throw new Error('Proposal was not found.');
  if (record.revision !== revision || record.payload_hash !== payloadHash) {
    throw new Error('This proposal revision is stale.');
  }
  if (record.status !== 'approved') {
    throw new Error(`Proposal is not ready for execution; current status is ${record.status}.`);
  }
  const now = new Date().toISOString();
  const claimed: ProposalRecord = { ...record, status: 'executing', updated_at: now };
  bucket.set(proposalId, claimed);
  addAuditEvent({
    event: 'execution_started',
    proposal_id: record.id,
    conversation_id: record.conversation_id,
    user_id: record.user_id,
    account_id: record.account_id,
    timestamp: now,
    details: { revision: record.revision, operation: record.operation },
  });
  return clone(claimed);
}

export async function updateProposalStatus(
  conversationId: string,
  proposalId: string,
  status: ProposalStatus,
  result?: ProposalExecutionResult
): Promise<void> {
  const bucket = conversationProposals(conversationId);
  const record = bucket.get(proposalId);
  if (!record) throw new Error('Proposal was not found.');
  const now = new Date().toISOString();
  const update: Record<string, any> = { ...record, status, updated_at: now };
  if (result) update.result = result;
  bucket.set(proposalId, update as ProposalRecord);
  if (status === 'succeeded' || status === 'executed_unverified' || status === 'failed') {
    addAuditEvent({
      event: status === 'succeeded' ? 'verified' : 'failed',
      proposal_id: record.id,
      conversation_id: record.conversation_id,
      user_id: record.user_id,
      account_id: record.account_id,
      timestamp: now,
      details: result || {},
    });
  }
}

export async function cancelProposal(
  conversationId: string,
  proposalId: string
): Promise<void> {
  const bucket = conversationProposals(conversationId);
  const record = bucket.get(proposalId);
  if (!record) throw new Error('Proposal was not found.');
  if (record.status !== 'pending_approval') {
    throw new Error(`Proposal cannot be cancelled while it is ${record.status}.`);
  }
  const now = new Date().toISOString();
  bucket.set(proposalId, { ...record, status: 'cancelled', updated_at: now });
  addAuditEvent({
    event: 'failed',
    proposal_id: record.id,
    conversation_id: record.conversation_id,
    user_id: record.user_id,
    account_id: record.account_id,
    timestamp: now,
    details: { reason: 'cancelled_by_user' },
  });
}

export function proposalExpiresAt(record: ProposalRecord, expirationMinutes = 60): number {
  return new Date(record.created_at).getTime() + expirationMinutes * 60 * 1000;
}
