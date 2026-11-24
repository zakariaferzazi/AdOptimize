CREATE TABLE IF NOT EXISTS google_ads_tokens (
  user_id TEXT PRIMARY KEY,
  refresh_cipher TEXT NOT NULL,
  access_cipher TEXT,
  access_expires_at INTEGER,
  scope TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS google_ads_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  verifier_cipher TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_google_ads_state_expiry ON google_ads_oauth_states(expires_at);
