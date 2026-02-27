-- CLI Device Code Authentication
-- Used for "isolated login" device code flow

CREATE TABLE IF NOT EXISTS cli_device_codes (
  id TEXT PRIMARY KEY,
  device_code TEXT NOT NULL UNIQUE,      -- Secret code held by CLI
  user_code TEXT NOT NULL UNIQUE,        -- Short code shown to user
  user_id TEXT,                          -- Set when user approves
  status TEXT NOT NULL DEFAULT 'pending', -- pending, complete, expired
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cli_device_codes_device_code ON cli_device_codes(device_code);
CREATE INDEX idx_cli_device_codes_user_code ON cli_device_codes(user_code);
CREATE INDEX idx_cli_device_codes_expires ON cli_device_codes(expires_at);
