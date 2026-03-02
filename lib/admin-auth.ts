/**
 * Admin authentication helpers
 *
 * Supports both session-based auth (cookies) and API key auth (X-API-Key header).
 * API keys can be:
 * - Legacy static key (ADMIN_API_KEY env var) - no expiration
 * - Database-backed keys with 30-day expiration, scoped to a specific user
 *
 * Also supports seller authentication for marketplace functionality.
 */

import { NextRequest } from "next/server";
import type { Env } from "@/lib/env";
import { getSessionFromHeaders, type User } from "@/lib/auth/middleware";
import { queryOne, execute, nanoid } from "@/lib/db";

// Default superuser email (fallback if env var not set)
const DEFAULT_SUPERUSER_EMAIL = "codybontecou@gmail.com";

/**
 * Get superuser emails from environment or use default
 */
function getSuperuserEmails(env: Env): string[] {
  const envEmails = (env as unknown as { SUPERUSER_EMAILS?: string }).SUPERUSER_EMAILS;
  if (envEmails) {
    return envEmails
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  return [DEFAULT_SUPERUSER_EMAIL];
}

/**
 * Extended user with seller info
 */
export interface AdminUser extends User {
  isSuperuser: boolean;
  isSeller: boolean;
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
}

/**
 * Virtual admin user for legacy/global API key access
 */
const API_KEY_ADMIN_USER: AdminUser = {
  id: "api-key-admin",
  email: "api@isolated.tech",
  name: "API Key Admin",
  image: null,
  isAdmin: true,
  newsletterSubscribed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  isSuperuser: true,
  isSeller: false,
  stripeAccountId: null,
  stripeOnboarded: false,
};

/**
 * Hash an API key using SHA-256
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if an email is a superuser
 */
export function isSuperuser(email: string, env: Env): boolean {
  const superuserEmails = getSuperuserEmails(env);
  return superuserEmails.includes(email.toLowerCase());
}

/**
 * Generate a new API key with 30-day expiration
 */
export async function generateApiKey(
  env: Env,
  name: string = "default",
  userId?: string
): Promise<{ key: string; expiresAt: Date }> {
  // Generate a secure random key
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = Array.from(keyBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const keyHash = await hashApiKey(key);
  const keyPrefix = key.substring(0, 8);

  // 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const id = nanoid();

  await execute(
    `INSERT INTO api_keys (id, name, key_hash, key_prefix, expires_at, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, keyHash, keyPrefix, expiresAt.toISOString(), userId || null],
    env
  );

  return { key, expiresAt };
}

/**
 * Revoke an API key by its prefix
 */
export async function revokeApiKey(
  env: Env,
  keyPrefix: string,
  options?: { userId?: string; isSuperuser?: boolean }
): Promise<boolean> {
  const isRoot = options?.isSuperuser === true;

  const result = isRoot
    ? await execute(
        `UPDATE api_keys SET is_revoked = 1 WHERE key_prefix = ?`,
        [keyPrefix],
        env
      )
    : await execute(
        `UPDATE api_keys SET is_revoked = 1 WHERE key_prefix = ? AND user_id = ?`,
        [keyPrefix, options?.userId || ""],
        env
      );

  return (result.meta?.changes ?? 0) > 0;
}

/**
 * Resolve an API key to an admin/seller user
 */
async function getUserFromDatabaseApiKey(
  key: string,
  env: Env
): Promise<AdminUser | null> {
  const keyHash = await hashApiKey(key);

  const record = await queryOne<{
    id: string;
    expires_at: string;
    is_revoked: number;
    user_id: string | null;
  }>(
    `SELECT id, expires_at, is_revoked, user_id FROM api_keys WHERE key_hash = ?`,
    [keyHash],
    env
  );

  if (!record || record.is_revoked) {
    return null;
  }

  // Check expiration
  const expiresAt = new Date(record.expires_at);
  if (expiresAt < new Date()) {
    return null;
  }

  // Update last_used_at (best effort)
  await execute(
    `UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`,
    [record.id],
    env
  ).catch(() => {});

  // Legacy keys without user scope are treated as superuser
  if (!record.user_id) {
    return API_KEY_ADMIN_USER;
  }

  const dbUser = await queryOne<{
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    is_admin: number;
    newsletter_subscribed: number;
    created_at: string;
    updated_at: string;
    is_seller: number;
    stripe_account_id: string | null;
    stripe_onboarded: number;
  }>(
    `SELECT
      id,
      email,
      name,
      image,
      "isAdmin" as is_admin,
      "newsletterSubscribed" as newsletter_subscribed,
      "createdAt" as created_at,
      "updatedAt" as updated_at,
      COALESCE(is_seller, 0) as is_seller,
      stripe_account_id,
      COALESCE(stripe_onboarded, 0) as stripe_onboarded
     FROM user
     WHERE id = ?`,
    [record.user_id],
    env
  );

  if (!dbUser) {
    return null;
  }

  const userIsSuperuser = isSuperuser(dbUser.email, env);
  const userIsSeller = dbUser.is_seller === 1;
  const userIsAdmin = dbUser.is_admin === 1;

  // Must be admin, superuser, or seller
  if (!userIsAdmin && !userIsSuperuser && !userIsSeller) {
    return null;
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    image: dbUser.image,
    isAdmin: userIsAdmin,
    newsletterSubscribed: dbUser.newsletter_subscribed !== 0,
    createdAt: new Date(dbUser.created_at),
    updatedAt: new Date(dbUser.updated_at),
    isSuperuser: userIsSuperuser,
    isSeller: userIsSeller,
    stripeAccountId: dbUser.stripe_account_id,
    stripeOnboarded: dbUser.stripe_onboarded === 1,
  };
}

/**
 * Require admin authentication via session cookie or API key
 *
 * Returns the admin user if authenticated, null otherwise.
 * For sellers, returns seller info as well.
 */
export async function requireAdmin(
  request: NextRequest,
  env: Env
): Promise<AdminUser | null> {
  // 1. Check API key first (for CLI access)
  const apiKey = request.headers.get("X-API-Key");
  if (apiKey) {
    // Try legacy static key first
    if (env.ADMIN_API_KEY && apiKey === env.ADMIN_API_KEY) {
      return API_KEY_ADMIN_USER;
    }

    // Try database-backed scoped key
    const userFromKey = await getUserFromDatabaseApiKey(apiKey, env);
    if (userFromKey) {
      return userFromKey;
    }

    // Invalid API key - don't fall through to session auth
    return null;
  }

  // 2. Fall back to session-based auth using Better Auth
  const { user } = await getSessionFromHeaders(request.headers, env);

  if (!user) {
    return null;
  }

  // Get seller info from database
  const sellerInfo = await queryOne<{
    is_seller: number;
    stripe_account_id: string | null;
    stripe_onboarded: number;
  }>(
    `SELECT COALESCE(is_seller, 0) as is_seller, stripe_account_id, COALESCE(stripe_onboarded, 0) as stripe_onboarded
     FROM user
     WHERE id = ?`,
    [user.id],
    env
  );

  const userIsSuperuser = isSuperuser(user.email, env);
  const userIsSeller = sellerInfo?.is_seller === 1;

  // Must be either admin, superuser, or seller to access admin routes
  if (!user.isAdmin && !userIsSuperuser && !userIsSeller) {
    return null;
  }

  return {
    ...user,
    isSuperuser: userIsSuperuser,
    isSeller: userIsSeller,
    stripeAccountId: sellerInfo?.stripe_account_id || null,
    stripeOnboarded: sellerInfo?.stripe_onboarded === 1,
  };
}

/**
 * Check if user can manage a specific app
 * Superusers can manage all apps, sellers can only manage their own
 */
export async function canManageApp(
  user: AdminUser,
  appId: string,
  env: Env
): Promise<boolean> {
  // Superusers can manage any app
  if (user.isSuperuser) {
    return true;
  }

  // Sellers/admins can only manage their own apps
  const app = await queryOne<{ owner_id: string | null }>(
    `SELECT owner_id FROM apps WHERE id = ?`,
    [appId],
    env
  );

  return app?.owner_id === user.id;
}

/**
 * Get the app filter clause for SQL queries
 * Superusers see all apps, sellers/admins see only their own
 */
export function getAppFilterClause(user: AdminUser): {
  where: string;
  params: string[];
} {
  if (user.isSuperuser) {
    return { where: "1=1", params: [] };
  }

  return { where: "owner_id = ?", params: [user.id] };
}
