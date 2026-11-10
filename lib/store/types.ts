/**
 * Storage contracts for the durable AI conversation, proposal and execution
 * system. Implementations must be server-authoritative: the browser is never
 * the source of truth for history, proposals or execution state.
 */

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

export interface ConversationRecord {
  id: string;
  user_id: string;
  account_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  seq: number;
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | null;
  tool_calls: string | null;
  tool_call_id: string | null;
  name: string | null;
  model: string | null;
  usage: string | null;
  created_at: string;
}

export interface ProposalRecord {
  id: string;
  user_id: string;
  conversation_id: string;
  account_id: string;
  revision: number;
  status: ProposalStatus;
  operation: string;
  payload: string;
  payload_hash: string;
  before_snapshot: string | null;
  supersedes_id: string | null;
  expires_at: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionRecord {
  idempotency_key: string;
  proposal_id: string;
  attempt: number;
  status: 'started' | 'succeeded' | 'failed' | 'executed_unverified';
  before: string | null;
  after: string | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface AuditEventRecord {
  id: string;
  event: string;
  proposal_id: string | null;
  conversation_id: string | null;
  user_id: string | null;
  account_id: string | null;
  timestamp: string;
  details: string | null;
}

export interface ConversationRepository {
  get(id: string, userId: string): Promise<ConversationRecord | undefined>;
  list(userId: string): Promise<ConversationRecord[]>;
  upsert(record: ConversationRecord): Promise<void>;
  delete(id: string, userId: string): Promise<void>;
}

export interface MessageRepository {
  list(conversationId: string, userId: string): Promise<MessageRecord[]>;
  append(record: MessageRecord): Promise<void>;
  nextSeq(conversationId: string): Promise<number>;
}

export interface ProposalRepository {
  create(record: ProposalRecord): Promise<void>;
  get(id: string, userId: string): Promise<ProposalRecord | undefined>;
  getLatest(conversationId: string, userId: string): Promise<ProposalRecord | undefined>;
  update(record: ProposalRecord): Promise<void>;
  /**
   * Atomically transition a proposal from `approved` to `executing`.
   * Returns the claimed record, or undefined when the compare-and-swap lost.
   */
  claim(
    id: string,
    userId: string,
    revision: number,
    payloadHash: string
  ): Promise<ProposalRecord | undefined>;
  /**
   * Atomically transition a proposal from `pending_approval` to `approved`.
   * Returns the approved record, or undefined when the compare-and-swap lost.
   */
  approve(
    id: string,
    userId: string,
    revision: number,
    payloadHash: string
  ): Promise<ProposalRecord | undefined>;
}

export interface ExecutionRepository {
  /** Insert an idempotency marker. Returns false when the key already exists. */
  begin(record: ExecutionRecord): Promise<boolean>;
  complete(idempotencyKey: string, patch: Partial<ExecutionRecord>): Promise<void>;
  get(idempotencyKey: string): Promise<ExecutionRecord | undefined>;
}

export interface AuditRepository {
  append(record: AuditEventRecord): Promise<void>;
  list(userId: string, limit?: number): Promise<AuditEventRecord[]>;
}

export interface Store {
  conversations: ConversationRepository;
  messages: MessageRepository;
  proposals: ProposalRepository;
  executions: ExecutionRepository;
  audit: AuditRepository;
}
