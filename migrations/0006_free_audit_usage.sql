CREATE TABLE IF NOT EXISTS free_audit_runs (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL,
  user_hash TEXT NOT NULL,
  period TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'completed')),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_free_audit_user_period
  ON free_audit_runs(environment, user_hash, period, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_free_audit_expiry ON free_audit_runs(expires_at);
