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
 * Minimal structural types for the Cloudflare D1 binding. Declaring them here
 * avoids depending on @cloudflare/workers-types in the Next.js type graph.
 */
export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  meta?: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export const D1_SCHEMA = `
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  title TEXT NOT NULL,
  model TEXT NOT NULL,
  task_state TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT,
  tool_calls TEXT,
  tool_call_id TEXT,
  name TEXT,
  model TEXT,
  usage TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_seq ON messages(conversation_id, seq);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  status TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  before_snapshot TEXT,
  supersedes_id TEXT,
  expires_at TEXT,
  result TEXT,
  meta TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proposals_conversation ON proposals(conversation_id, revision DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS executions (
  idempotency_key TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  attempt INTEGER NOT NULL,
  status TEXT NOT NULL,
  before TEXT,
  after TEXT,
  error TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  event TEXT NOT NULL,
  proposal_id TEXT,
  conversation_id TEXT,
  user_id TEXT,
  account_id TEXT,
  timestamp TEXT NOT NULL,
  details TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_events(user_id, timestamp DESC);
`;

export async function ensureD1Schema(db: D1Database): Promise<void> {
  const statements = D1_SCHEMA.split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await db.prepare(statement).run();
  }

  // Older databases were created before task_state and meta existed. CREATE
  // TABLE IF NOT EXISTS will not add columns, so apply them explicitly and
  // ignore the "duplicate column" error when they are already present.
  for (const statement of [
    'ALTER TABLE conversations ADD COLUMN task_state TEXT',
    'ALTER TABLE proposals ADD COLUMN meta TEXT',
  ]) {
    try {
      await db.prepare(statement).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate column|already exists/i.test(message)) {
        console.warn('[AI Store] column check:', message);
      }
    }
  }
}

function conversationRepository(db: D1Database): ConversationRepository {
  return {
    async get(id, userId) {
      return (
        (await db
          .prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
          .bind(id, userId)
          .first<ConversationRecord>()) || undefined
      );
    },
    async list(userId) {
      const result = await db
        .prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC')
        .bind(userId)
        .all<ConversationRecord>();
      return result.results || [];
    },
    async upsert(record) {
      await db
        .prepare(
          `INSERT INTO conversations (id, user_id, account_id, title, model, task_state, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             account_id = excluded.account_id,
             title = excluded.title,
             model = excluded.model,
             task_state = excluded.task_state,
             updated_at = excluded.updated_at`
        )
        .bind(
          record.id,
          record.user_id,
          record.account_id,
          record.title,
          record.model,
          record.task_state,
          record.created_at,
          record.updated_at
        )
        .run();
    },
    async delete(id, userId) {
      await db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').bind(id, userId).run();
    },
  };
}

function messageRepository(db: D1Database): MessageRepository {
  return {
    async list(conversationId, userId) {
      const result = await db
        .prepare('SELECT * FROM messages WHERE conversation_id = ? AND user_id = ? ORDER BY seq ASC')
        .bind(conversationId, userId)
        .all<MessageRecord>();
      return result.results || [];
    },
    async append(record) {
      await db
        .prepare(
          `INSERT INTO messages
             (id, conversation_id, user_id, seq, role, content, tool_calls, tool_call_id, name, model, usage, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          record.id,
          record.conversation_id,
          record.user_id,
          record.seq,
          record.role,
          record.content,
          record.tool_calls,
          record.tool_call_id,
          record.name,
          record.model,
          record.usage,
          record.created_at
        )
        .run();
    },
    async nextSeq(conversationId) {
      const row = await db
        .prepare('SELECT COALESCE(MAX(seq), 0) AS max_seq FROM messages WHERE conversation_id = ?')
        .bind(conversationId)
        .first<{ max_seq: number }>();
      return Number(row?.max_seq || 0) + 1;
    },
  };
}

function proposalRepository(db: D1Database): ProposalRepository {
  return {
    async create(record) {
      await db
        .prepare(
          `INSERT INTO proposals
             (id, user_id, conversation_id, account_id, revision, status, operation, payload,
              payload_hash, before_snapshot, supersedes_id, expires_at, result, meta, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          record.id,
          record.user_id,
          record.conversation_id,
          record.account_id,
          record.revision,
          record.status,
          record.operation,
          record.payload,
          record.payload_hash,
          record.before_snapshot,
          record.supersedes_id,
          record.expires_at,
          record.result,
          record.meta ?? null,
          record.created_at,
          record.updated_at
        )
        .run();
    },
    async get(id, userId) {
      return (
        (await db
          .prepare('SELECT * FROM proposals WHERE id = ? AND user_id = ?')
          .bind(id, userId)
          .first<ProposalRecord>()) || undefined
      );
    },
    async getLatest(conversationId, userId) {
      return (
        (await db
          .prepare(
            `SELECT * FROM proposals
             WHERE conversation_id = ? AND user_id = ?
               AND status NOT IN ('superseded', 'cancelled')
             ORDER BY created_at DESC, revision DESC LIMIT 1`
          )
          .bind(conversationId, userId)
          .first<ProposalRecord>()) || undefined
      );
    },
    async listByConversation(conversationId, userId) {
      const result = await db
        .prepare(
          `SELECT * FROM proposals WHERE conversation_id = ? AND user_id = ?
           ORDER BY created_at DESC, revision DESC LIMIT 200`
        )
        .bind(conversationId, userId)
        .all<ProposalRecord>();
      return result.results || [];
    },
    async update(record) {
      await db
        .prepare(
          `UPDATE proposals SET
             status = ?, payload = ?, payload_hash = ?, before_snapshot = ?,
             expires_at = ?, result = ?, updated_at = ?
           WHERE id = ? AND user_id = ?`
        )
        .bind(
          record.status,
          record.payload,
          record.payload_hash,
          record.before_snapshot,
          record.expires_at,
          record.result,
          record.updated_at,
          record.id,
          record.user_id
        )
        .run();
    },
    async claim(id, userId, revision, payloadHash) {
      const result = await db
        .prepare(
          `UPDATE proposals SET status = 'executing', updated_at = ?
           WHERE id = ? AND user_id = ? AND revision = ? AND payload_hash = ? AND status = 'approved'
           RETURNING *`
        )
        .bind(new Date().toISOString(), id, userId, revision, payloadHash)
        .all<ProposalRecord>();
      return result.results?.[0];
    },
    async approve(id, userId, revision, payloadHash) {
      const result = await db
        .prepare(
          `UPDATE proposals SET status = 'approved', updated_at = ?
           WHERE id = ? AND user_id = ? AND revision = ? AND payload_hash = ? AND status = 'pending_approval'
           RETURNING *`
        )
        .bind(new Date().toISOString(), id, userId, revision, payloadHash)
        .all<ProposalRecord>();
      return result.results?.[0];
    },
  };
}

function executionRepository(db: D1Database): ExecutionRepository {
  return {
    async begin(record) {
      const result = await db
        .prepare(
          `INSERT INTO executions
             (idempotency_key, proposal_id, attempt, status, before, after, error, started_at, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(idempotency_key) DO NOTHING
           RETURNING idempotency_key`
        )
        .bind(
          record.idempotency_key,
          record.proposal_id,
          record.attempt,
          record.status,
          record.before,
          record.after,
          record.error,
          record.started_at,
          record.completed_at
        )
        .all<{ idempotency_key: string }>();
      return Boolean(result.results?.length);
    },
    async complete(idempotencyKey, patch) {
      const current = await db
        .prepare('SELECT * FROM executions WHERE idempotency_key = ?')
        .bind(idempotencyKey)
        .first<ExecutionRecord>();
      if (!current) return;
      const next = { ...current, ...patch };
      await db
        .prepare(
          `UPDATE executions SET status = ?, before = ?, after = ?, error = ?, completed_at = ?
           WHERE idempotency_key = ?`
        )
        .bind(next.status, next.before, next.after, next.error, next.completed_at, idempotencyKey)
        .run();
    },
    async get(idempotencyKey) {
      return (
        (await db
          .prepare('SELECT * FROM executions WHERE idempotency_key = ?')
          .bind(idempotencyKey)
          .first<ExecutionRecord>()) || undefined
      );
    },
  };
}

function auditRepository(db: D1Database): AuditRepository {
  return {
    async append(record) {
      await db
        .prepare(
          `INSERT INTO audit_events
             (id, event, proposal_id, conversation_id, user_id, account_id, timestamp, details)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          record.id,
          record.event,
          record.proposal_id,
          record.conversation_id,
          record.user_id,
          record.account_id,
          record.timestamp,
          record.details
        )
        .run();
    },
    async list(userId, limit = 50) {
      const result = await db
        .prepare('SELECT * FROM audit_events WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?')
        .bind(userId, limit)
        .all<AuditEventRecord>();
      return result.results || [];
    },
  };
}

export function createD1Store(db: D1Database): Store {
  return {
    conversations: conversationRepository(db),
    messages: messageRepository(db),
    proposals: proposalRepository(db),
    executions: executionRepository(db),
    audit: auditRepository(db),
  };
}
