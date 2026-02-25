-- ============================================================
-- ISOLATED.TECH APP STORE — INITIAL SCHEMA
-- ============================================================

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY,                     -- nanoid
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_admin INTEGER DEFAULT 0,              -- 1 = admin
  newsletter_subscribed INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- OAuth accounts linked to users
CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                  -- 'apple', 'google', 'github'
  provider_user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_accounts_user ON oauth_accounts(user_id);

-- Sessions (stored in KV for speed, but backed by D1 for persistence)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                     -- session token
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================
-- APPS & VERSIONS
-- ============================================================

CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,               -- e.g., 'voxboard'
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,                        -- markdown
  icon_url TEXT,
  screenshots TEXT,                        -- JSON array of URLs
  platforms TEXT DEFAULT '["macos"]',      -- JSON array
  min_price_cents INTEGER DEFAULT 0,       -- 0 = free allowed
  suggested_price_cents INTEGER,
  is_published INTEGER DEFAULT 0,
  custom_page_config TEXT,                 -- JSON for per-app page customization
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_apps_slug ON apps(slug);
CREATE INDEX idx_apps_published ON apps(is_published);

CREATE TABLE app_versions (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version TEXT NOT NULL,                   -- e.g., '1.2.0'
  build_number INTEGER,
  release_notes TEXT,                      -- markdown
  r2_key TEXT NOT NULL,                    -- R2 object key for the binary
  file_size_bytes INTEGER,
  min_os_version TEXT,
  sparkle_signature TEXT,                  -- EdDSA signature for Sparkle
  is_latest INTEGER DEFAULT 0,
  released_at TEXT DEFAULT (datetime('now')),
  UNIQUE(app_id, version)
);

CREATE INDEX idx_app_versions_app ON app_versions(app_id);
CREATE INDEX idx_app_versions_latest ON app_versions(app_id, is_latest);

-- ============================================================
-- PURCHASES & PAYMENTS
-- ============================================================

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'completed',         -- completed, refunded
  refunded_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, app_id)
);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_app ON purchases(app_id);
CREATE INDEX idx_purchases_status ON purchases(status);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  is_approved INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, app_id)
);

CREATE INDEX idx_reviews_app ON reviews(app_id);
CREATE INDEX idx_reviews_approved ON reviews(app_id, is_approved);

-- ============================================================
-- DISCOUNT CODES
-- ============================================================

CREATE TABLE discount_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,               -- e.g., 'LAUNCH50'
  discount_type TEXT NOT NULL,             -- 'percent' or 'fixed'
  discount_value INTEGER NOT NULL,         -- 50 = 50% or 50 cents
  app_id TEXT REFERENCES apps(id),         -- null = all apps
  max_uses INTEGER,
  times_used INTEGER DEFAULT 0,
  expires_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_codes_active ON discount_codes(is_active);

-- ============================================================
-- EMAIL TRACKING
-- ============================================================

CREATE TABLE email_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,                -- 'receipt', 'magic_link', 'update', 'newsletter'
  subject TEXT,
  ses_message_id TEXT,
  sent_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_email_log_user ON email_log(user_id);
CREATE INDEX idx_email_log_type ON email_log(event_type);
