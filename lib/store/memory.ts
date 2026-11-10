import type {
  AuditEventRecord,
  AuditRepository,
  ConversationRecord,
  ConversationRepository,
  ExecutionRecord,
  ExecutionRepository,
  MessageRecord,
  MessageRepository,
  ProposalRecord,
  ProposalRepository,
  Store,
} from './types';

/**
 * In-memory store used by unit tests and by `next dev` when no D1 binding is
 * available. It implements the same compare-and-swap semantics as the D1
 * implementation so behaviour does not diverge between environments.
 */

const conversations = new Map<string, ConversationRecord>();
const messages = new Map<string, MessageRecord[]>();
const proposals = new Map<string, ProposalRecord>();
const executions = new Map<string, ExecutionRecord>();
const auditEvents: AuditEventRecord[] = [];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function resetMemoryStore(): void {
  conversations.clear();
  messages.clear();
  proposals.clear();
  executions.clear();
  auditEvents.length = 0;
}

const conversationRepository: ConversationRepository = {
  async get(id, userId) {
    const record = conversations.get(id);
    return record && record.user_id === userId ? clone(record) : undefined;
  },
  async list(userId) {
    return [...conversations.values()]
      .filter((record) => record.user_id === userId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .map(clone);
  },
  async upsert(record) {
    conversations.set(record.id, clone(record));
  },
  async delete(id, userId) {
    const record = conversations.get(id);
    if (record && record.user_id === userId) conversations.delete(id);
  },
};

const messageRepository: MessageRepository = {
  async list(conversationId, userId) {
    return (messages.get(conversationId) || [])
      .filter((record) => record.user_id === userId)
      .sort((left, right) => left.seq - right.seq)
      .map(clone);
  },
  async append(record) {
    const bucket = messages.get(record.conversation_id) || [];
    bucket.push(clone(record));
    messages.set(record.conversation_id, bucket);
  },
  async nextSeq(conversationId) {
    const bucket = messages.get(conversationId) || [];
    return bucket.reduce((max, record) => Math.max(max, record.seq), 0) + 1;
  },
};

const proposalRepository: ProposalRepository = {
  async create(record) {
    proposals.set(record.id, clone(record));
  },
  async get(id, userId) {
    const record = proposals.get(id);
    return record && record.user_id === userId ? clone(record) : undefined;
  },
  async getLatest(conversationId, userId) {
    const latest = [...proposals.values()]
      .filter(
        (record) =>
          record.conversation_id === conversationId &&
          record.user_id === userId &&
          record.status !== 'superseded' &&
          record.status !== 'cancelled'
      )
      .sort((left, right) => right.revision - left.revision)[0];
    return latest ? clone(latest) : undefined;
  },
  async update(record) {
    proposals.set(record.id, clone(record));
  },
  async claim(id, userId, revision, payloadHash) {
    const record = proposals.get(id);
    if (
      !record ||
      record.user_id !== userId ||
      record.revision !== revision ||
      record.payload_hash !== payloadHash ||
      record.status !== 'approved'
    ) {
      return undefined;
    }
    const claimed: ProposalRecord = {
      ...record,
      status: 'executing',
      updated_at: new Date().toISOString(),
    };
    proposals.set(id, claimed);
    return clone(claimed);
  },
  async approve(id, userId, revision, payloadHash) {
    const record = proposals.get(id);
    if (
      !record ||
      record.user_id !== userId ||
      record.revision !== revision ||
      record.payload_hash !== payloadHash ||
      record.status !== 'pending_approval'
    ) {
      return undefined;
    }
    const approved: ProposalRecord = {
      ...record,
      status: 'approved',
      updated_at: new Date().toISOString(),
    };
    proposals.set(id, approved);
    return clone(approved);
  },
};

const executionRepository: ExecutionRepository = {
  async begin(record) {
    if (executions.has(record.idempotency_key)) return false;
    executions.set(record.idempotency_key, clone(record));
    return true;
  },
  async complete(idempotencyKey, patch) {
    const record = executions.get(idempotencyKey);
    if (!record) return;
    executions.set(idempotencyKey, { ...record, ...clone(patch) });
  },
  async get(idempotencyKey) {
    const record = executions.get(idempotencyKey);
    return record ? clone(record) : undefined;
  },
};

const auditRepository: AuditRepository = {
  async append(record) {
    auditEvents.push(clone(record));
  },
  async list(userId, limit = 50) {
    return auditEvents
      .filter((record) => record.user_id === userId)
      .slice(-limit)
      .reverse()
      .map(clone);
  },
};

export const memoryStore: Store = {
  conversations: conversationRepository,
  messages: messageRepository,
  proposals: proposalRepository,
  executions: executionRepository,
  audit: auditRepository,
};
