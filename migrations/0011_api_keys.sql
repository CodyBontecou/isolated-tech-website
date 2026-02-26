-- API keys with expiration support
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'default',
  key_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the key (we don't store plaintext)
  key_prefix TEXT NOT NULL,       -- First 8 chars for identification (e.g., "F1cXaFGl...")
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,       -- Expiration timestamp
  last_used_at TEXT,              -- Track usage
  is_revoked INTEGER NOT NULL DEFAULT 0
);

-- Index for fast lookups
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at);
