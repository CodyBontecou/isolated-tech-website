-- ============================================================
-- RATE LIMITING TABLE
-- ============================================================

CREATE TABLE rate_limits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_rate_limits_user_action ON rate_limits(user_id, action);
CREATE INDEX idx_rate_limits_created ON rate_limits(created_at);
