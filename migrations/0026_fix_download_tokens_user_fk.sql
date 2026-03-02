-- ============================================================
-- FIX DOWNLOAD TOKENS USER FK
-- ============================================================
-- 0006_download_tokens.sql referenced legacy users(id).
-- After 0020_consolidate_better_auth.sql, canonical auth table is user(id).
-- Rebuild download_tokens so user_id correctly references user(id).

CREATE TABLE download_tokens_new (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  purchase_id TEXT REFERENCES purchases(id) ON DELETE CASCADE,
  used_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO download_tokens_new (
  id,
  token,
  user_id,
  app_id,
  purchase_id,
  used_at,
  expires_at,
  created_at
)
SELECT
  id,
  token,
  user_id,
  app_id,
  purchase_id,
  used_at,
  expires_at,
  created_at
FROM download_tokens;

DROP TABLE download_tokens;
ALTER TABLE download_tokens_new RENAME TO download_tokens;

CREATE INDEX idx_download_tokens_token ON download_tokens(token);
CREATE INDEX idx_download_tokens_user ON download_tokens(user_id);
CREATE INDEX idx_download_tokens_app ON download_tokens(app_id);
CREATE INDEX idx_download_tokens_expires ON download_tokens(expires_at);
