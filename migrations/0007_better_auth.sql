-- ============================================================
-- BETTER AUTH SCHEMA MIGRATION
-- ============================================================
-- This migration adds the tables required by Better Auth.
-- We keep the existing users, oauth_accounts, and sessions tables
-- for backward compatibility and data migration.
-- ============================================================

-- Better Auth user table
-- Note: We customize field names to match our existing schema
CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL DEFAULT 0,
  "image" TEXT,
  "isAdmin" INTEGER NOT NULL DEFAULT 0,
  "newsletterSubscribed" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user" ("email");

-- Better Auth session table
CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "session_token_idx" ON "session" ("token");

-- Better Auth account table (OAuth + credentials)
CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "accessTokenExpiresAt" TEXT,
  "refreshTokenExpiresAt" TEXT,
  "scope" TEXT,
  "idToken" TEXT,
  "password" TEXT,
  "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_accountId_idx" ON "account" ("providerId", "accountId");

-- Better Auth verification table (magic links, email verification, etc.)
CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
  "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

-- ============================================================
-- DATA MIGRATION
-- Migrate existing users and oauth_accounts to Better Auth tables
-- ============================================================

-- Migrate users
INSERT OR IGNORE INTO "user" ("id", "name", "email", "emailVerified", "image", "isAdmin", "newsletterSubscribed", "createdAt", "updatedAt")
SELECT 
  id,
  COALESCE(name, email),
  email,
  1, -- Existing users are verified
  avatar_url,
  is_admin,
  newsletter_subscribed,
  created_at,
  updated_at
FROM users;

-- Migrate OAuth accounts
INSERT OR IGNORE INTO "account" ("id", "userId", "accountId", "providerId", "createdAt", "updatedAt")
SELECT 
  id,
  user_id,
  provider_user_id,
  provider,
  created_at,
  created_at
FROM oauth_accounts;

-- ============================================================
-- UPDATE FOREIGN KEYS
-- Update purchases and reviews to reference the new user table
-- ============================================================

-- Note: SQLite doesn't support ALTER TABLE to modify foreign keys
-- The existing tables will continue to work as the user IDs are the same
