-- ============================================================
-- DOWNLOAD TOKENS
-- One-time use tokens for source code downloads
-- ============================================================

CREATE TABLE download_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  purchase_id TEXT REFERENCES purchases(id) ON DELETE CASCADE,
  
  -- Token state
  used_at TEXT,                           -- NULL until used
  expires_at TEXT NOT NULL,               -- Token expiration (e.g., 7 days)
  
  -- Metadata
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_download_tokens_token ON download_tokens(token);
CREATE INDEX idx_download_tokens_user ON download_tokens(user_id);
CREATE INDEX idx_download_tokens_app ON download_tokens(app_id);
CREATE INDEX idx_download_tokens_expires ON download_tokens(expires_at);
