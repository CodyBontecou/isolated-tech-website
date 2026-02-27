-- ============================================================
-- EMAIL SUBSCRIBERS & LEGACY PURCHASES
-- ============================================================
-- Supports email broadcasting and Gumroad migration

-- Email subscribers (for newsletters/broadcasts, doesn't require account)
CREATE TABLE subscribers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  source TEXT NOT NULL,                    -- 'gumroad', 'website', 'import', 'api'
  user_id TEXT REFERENCES "user"(id),      -- linked if they create account
  is_active INTEGER DEFAULT 1,             -- 0 = unsubscribed
  unsubscribed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  metadata TEXT                            -- JSON for extra data (gumroad product, etc)
);

CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_active ON subscribers(is_active);
CREATE INDEX idx_subscribers_source ON subscribers(source);
CREATE INDEX idx_subscribers_user ON subscribers(user_id);

-- Legacy purchases from Gumroad (auto-claimed when user signs up with matching email)
CREATE TABLE legacy_purchases (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  product_name TEXT NOT NULL,              -- e.g., 'Ikigai'
  app_id TEXT REFERENCES apps(id),         -- linked to our app if applicable
  user_id TEXT REFERENCES "user"(id),      -- set when claimed
  claimed_at TEXT,                         -- when user signed up and claimed
  source TEXT DEFAULT 'gumroad',           -- 'gumroad', 'other'
  purchase_date TEXT,                      -- original Gumroad purchase date
  amount_cents INTEGER,                    -- what they paid
  created_at TEXT DEFAULT (datetime('now')),
  metadata TEXT                            -- JSON for extra Gumroad data
);

CREATE INDEX idx_legacy_purchases_email ON legacy_purchases(email);
CREATE INDEX idx_legacy_purchases_user ON legacy_purchases(user_id);
CREATE INDEX idx_legacy_purchases_app ON legacy_purchases(app_id);

-- Email broadcasts log
CREATE TABLE broadcasts (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  sent_by TEXT NOT NULL REFERENCES "user"(id),
  recipient_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',             -- 'draft', 'sending', 'sent', 'failed'
  sent_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_broadcasts_status ON broadcasts(status);
CREATE INDEX idx_broadcasts_sent ON broadcasts(sent_at);
