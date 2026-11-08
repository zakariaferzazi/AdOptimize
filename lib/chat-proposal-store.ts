import { createHash } from 'crypto';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

function proposalsCollection(conversationId: string) {
  return collection(db, 'chat_conversations', conversationId, 'proposals');
}

function auditLogCollection() {
  return collection(db, 'audit_log');
}

function auditLogRef() {
  return doc(auditLogCollection());
}

function addAuditEvent(
  transaction: Parameters<Parameters<typeof runTransaction>[1]>[0],
  event: ProposalAuditEvent
) {
  transaction.set(auditLogRef(), event);
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
  const proposalId = crypto.randomUUID();
  const now = new Date().toISOString();
  const storedProposal = JSON.parse(JSON.stringify({ ...proposal, id: proposalId }));
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

  await runTransaction(db, async (transaction) => {
    const auditTimestamp = new Date().toISOString();
    if (supersedesId) {
      const oldRef = doc(proposalsCollection(conversationId), supersedesId);
      const oldSnapshot = await transaction.get(oldRef);
      if (oldSnapshot.exists()) {
        const old = oldSnapshot.data() as ProposalRecord;
        if (old.status === 'pending_approval') {
          transaction.update(oldRef, { status: 'superseded', updated_at: now });
          addAuditEvent(transaction, {
            event: 'proposal_revised',
            proposal_id: proposalId,
            conversation_id: conversationId,
            user_id: metadata.userId,
            account_id: metadata.accountId,
            timestamp: auditTimestamp,
            details: { supersedes_id: supersedesId, previous_revision: old.revision },
          });
        }
      }
    }
    transaction.set(doc(proposalsCollection(conversationId), proposalId), record);
    addAuditEvent(transaction, {
      event: 'proposal_created',
      proposal_id: proposalId,
      conversation_id: conversationId,
      user_id: metadata.userId,
      account_id: metadata.accountId,
      timestamp: auditTimestamp,
      details: { revision: record.revision, operation: record.operation },
    });
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
  const snapshot = await getDoc(doc(proposalsCollection(conversationId), proposalId));
  return snapshot.exists() ? (snapshot.data() as ProposalRecord) : undefined;
}

export async function getLatestProposal(conversationId: string): Promise<ProposalRecord | undefined> {
  const snapshot = await getDocs(
    query(
      proposalsCollection(conversationId),
      where('status', '==', 'pending_approval'),
    )
  );
  const latest = snapshot.docs
    .map((item) => item.data() as ProposalRecord)
    .sort((left, right) => right.revision - left.revision)[0];
  return latest;
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
  const ref = doc(proposalsCollection(conversationId), proposalId);
  const now = new Date().toISOString();
  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Proposal was not found.');
    const record = snapshot.data() as ProposalRecord;
    if (record.revision !== revision || record.payload_hash !== payloadHash) {
      throw new Error('This proposal revision is stale.');
    }
    if (Date.now() >= proposalExpiresAt(record, expirationMinutes)) {
      transaction.update(ref, { status: 'expired', updated_at: now });
      throw new Error('This proposal has expired and cannot be approved.');
    }
    if (record.status === 'approved') {
      return { status: 'already_approved' as const, record };
    }
    if (record.status !== 'pending_approval') {
      throw new Error(`Proposal cannot be approved while it is ${record.status}.`);
    }
    transaction.update(ref, { status: 'approved', updated_at: now });
    addAuditEvent(transaction, {
      event: 'proposal_approved',
      proposal_id: record.id,
      conversation_id: record.conversation_id,
      user_id: record.user_id,
      account_id: record.account_id,
      timestamp: now,
      details: { revision: record.revision, operation: record.operation },
    });
    return { status: 'approved' as const, record: { ...record, status: 'approved' as const, updated_at: now } };
  });
  return { status: result.status, proposal: toClientProposal(result.record) };
}

export async function claimProposalForExecution(
  conversationId: string,
  proposalId: string,
  revision: number,
  payloadHash: string
): Promise<ProposalRecord> {
  const ref = doc(proposalsCollection(conversationId), proposalId);
  const now = new Date().toISOString();
  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Proposal was not found.');
    const record = snapshot.data() as ProposalRecord;
    if (record.revision !== revision || record.payload_hash !== payloadHash) {
      throw new Error('This proposal revision is stale.');
    }
    if (record.status !== 'approved') {
      throw new Error(`Proposal is not ready for execution; current status is ${record.status}.`);
    }
    transaction.update(ref, { status: 'executing', updated_at: now });
    addAuditEvent(transaction, {
      event: 'execution_started',
      proposal_id: record.id,
      conversation_id: record.conversation_id,
      user_id: record.user_id,
      account_id: record.account_id,
      timestamp: now,
      details: { revision: record.revision, operation: record.operation },
    });
    return { ...record, status: 'executing' as const, updated_at: now };
  });
  return result;
}

export async function updateProposalStatus(
  conversationId: string,
  proposalId: string,
  status: ProposalStatus,
  result?: ProposalExecutionResult
): Promise<void> {
  const ref = doc(proposalsCollection(conversationId), proposalId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Proposal was not found.');
    const record = snapshot.data() as ProposalRecord;
    const now = new Date().toISOString();
    const update: Record<string, any> = { status, updated_at: now };
    if (result) update.result = result;
    transaction.update(ref, update);
    if (status === 'succeeded' || status === 'executed_unverified' || status === 'failed') {
      addAuditEvent(transaction, {
        event: status === 'succeeded' ? 'verified' : 'failed',
        proposal_id: record.id,
        conversation_id: record.conversation_id,
        user_id: record.user_id,
        account_id: record.account_id,
        timestamp: now,
        details: result || {},
      });
    }

  });
}

export async function cancelProposal(
  conversationId: string,
  proposalId: string
): Promise<void> {
  const ref = doc(proposalsCollection(conversationId), proposalId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('Proposal was not found.');
    const record = snapshot.data() as ProposalRecord;
    if (record.status !== 'pending_approval') {
      throw new Error(`Proposal cannot be cancelled while it is ${record.status}.`);
    }
    const now = new Date().toISOString();
    transaction.update(ref, { status: 'cancelled', updated_at: now });
    addAuditEvent(transaction, {
      event: 'failed',
      proposal_id: record.id,
      conversation_id: record.conversation_id,
      user_id: record.user_id,
      account_id: record.account_id,
      timestamp: now,
      details: { reason: 'cancelled_by_user' },
    });
  });
}

export function proposalExpiresAt(record: ProposalRecord, expirationMinutes = 60): number {
  return new Date(record.created_at).getTime() + expirationMinutes * 60 * 1000;
}
