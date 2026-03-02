-- ============================================================
-- API Keys: scope keys to specific users
-- ============================================================

-- Associate API keys with the user who owns them
ALTER TABLE api_keys ADD COLUMN user_id TEXT REFERENCES user(id) ON DELETE CASCADE;

-- Index for user-scoped key queries
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
