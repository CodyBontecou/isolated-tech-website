-- ============================================================
-- DOWNLOAD TRACKING
-- Track all app downloads with user, version, and timestamp
-- ============================================================

CREATE TABLE downloads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES app_versions(id) ON DELETE CASCADE,
  
  -- Download context
  download_type TEXT NOT NULL,             -- 'authenticated' or 'token'
  download_token_id TEXT,                  -- References download_tokens.id if token-based
  
  -- Version snapshot (denormalized for historical queries)
  version_string TEXT NOT NULL,            -- e.g., '1.2.0'
  
  -- Client info
  ip_address TEXT,
  user_agent TEXT,
  country TEXT,                            -- From CF headers
  
  -- Timestamp
  downloaded_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_downloads_user ON downloads(user_id);
CREATE INDEX idx_downloads_app ON downloads(app_id);
CREATE INDEX idx_downloads_version ON downloads(version_id);
CREATE INDEX idx_downloads_date ON downloads(downloaded_at);
CREATE INDEX idx_downloads_app_date ON downloads(app_id, downloaded_at);
