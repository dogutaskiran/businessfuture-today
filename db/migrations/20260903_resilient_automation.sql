CREATE TABLE IF NOT EXISTS automation_generation_queue (
  cluster_id UUID PRIMARY KEY REFERENCES clusters(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','retry_wait','completed','dead')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS automation_generation_queue_due_idx ON automation_generation_queue (status,next_attempt_at,updated_at);
CREATE TABLE IF NOT EXISTS automation_provider_state (
  provider TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'healthy',
  cooldown_until TIMESTAMPTZ,
  last_error_code TEXT,
  last_error TEXT,
  last_success_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS automation_scheduler_tokens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON automation_generation_queue TO business_future_today_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON automation_provider_state TO business_future_today_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON automation_scheduler_tokens TO business_future_today_app;
GRANT USAGE,SELECT ON SEQUENCE automation_scheduler_tokens_id_seq TO business_future_today_app;
