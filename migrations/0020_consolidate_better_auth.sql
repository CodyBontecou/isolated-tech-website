-- Migration: Consolidate to Better Auth 'user' table
-- Removes legacy 'users', 'oauth_accounts', 'sessions' tables
-- Updates 'purchases' foreign key to reference 'user' table

-- Step 1: Create new purchases table with FK to 'user' (Better Auth table)
CREATE TABLE purchases_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'completed',
  refunded_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  discount_code_id TEXT REFERENCES discount_codes(id),
  UNIQUE(user_id, app_id)
);

-- Step 2: Copy all purchases
INSERT INTO purchases_new SELECT * FROM purchases;

-- Step 3: Drop old purchases table and rename new one
DROP TABLE purchases;
ALTER TABLE purchases_new RENAME TO purchases;

-- Step 4: Drop legacy tables (replaced by Better Auth tables)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS oauth_accounts;
DROP TABLE IF EXISTS sessions;

-- Better Auth tables remain:
-- - user (replaces users)
-- - session (replaces sessions)
-- - account (replaces oauth_accounts)
-- - verification
