CREATE TABLE IF NOT EXISTS billing_customers (
  environment TEXT NOT NULL,
  user_id TEXT NOT NULL,
  customer_id TEXT,
  PRIMARY KEY (environment, user_id),
  UNIQUE (environment, customer_id)
);
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  environment TEXT NOT NULL,
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  status TEXT NOT NULL,
  period_end TEXT NOT NULL,
  cancel_at_period_end INTEGER NOT NULL,
  source_time TEXT NOT NULL,
  precedence INTEGER NOT NULL,
  PRIMARY KEY (environment, id)
);
CREATE INDEX IF NOT EXISTS idx_billing_subscription_user
  ON billing_subscriptions(environment, user_id, source_time DESC);
CREATE TABLE IF NOT EXISTS billing_events (
  environment TEXT NOT NULL,
  id TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  type TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (environment, id)
);
CREATE TABLE IF NOT EXISTS billing_payments (
  environment TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  subscription_id TEXT,
  status TEXT NOT NULL,
  source_time TEXT NOT NULL,
  PRIMARY KEY (environment, kind, id)
);
CREATE TABLE IF NOT EXISTS billing_rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_rate_expiry ON billing_rate_limits(expires_at);
CREATE TABLE IF NOT EXISTS app_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_session_expiry ON app_sessions(expires_at);
