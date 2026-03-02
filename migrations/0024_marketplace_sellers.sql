-- ============================================================
-- MARKETPLACE: Multi-tenant seller support
-- ============================================================

-- Add Stripe Connect fields to users
ALTER TABLE user ADD COLUMN stripe_account_id TEXT;           -- Stripe Connect account ID (acct_xxx)
ALTER TABLE user ADD COLUMN stripe_onboarded INTEGER DEFAULT 0; -- 1 = completed onboarding
ALTER TABLE user ADD COLUMN is_seller INTEGER DEFAULT 0;       -- 1 = approved seller

-- Add owner to apps (null = platform-owned, for backwards compatibility)
ALTER TABLE apps ADD COLUMN owner_id TEXT REFERENCES user(id);

-- Track platform fees on purchases
ALTER TABLE purchases ADD COLUMN platform_fee_cents INTEGER DEFAULT 0;
ALTER TABLE purchases ADD COLUMN seller_amount_cents INTEGER DEFAULT 0;

-- Seller payout tracking (for reporting)
CREATE TABLE seller_payouts (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  stripe_transfer_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',           -- pending, paid, failed
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE INDEX idx_seller_payouts_seller ON seller_payouts(seller_id);
CREATE INDEX idx_seller_payouts_status ON seller_payouts(status);

-- Seller notifications log
CREATE TABLE seller_notifications (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                      -- 'sale', 'refund', 'payout'
  purchase_id TEXT REFERENCES purchases(id),
  message TEXT,
  sent_at TEXT DEFAULT (datetime('now')),
  read_at TEXT
);

CREATE INDEX idx_seller_notifications_seller ON seller_notifications(seller_id);
CREATE INDEX idx_seller_notifications_read ON seller_notifications(seller_id, read_at);

-- Index for querying apps by owner
CREATE INDEX idx_apps_owner ON apps(owner_id);
