-- AdOptimize AI agent durable storage.
-- Server-authoritative conversations, proposals, executions and audit records.

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  title TEXT NOT NULL,
  model TEXT NOT NULL,
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
