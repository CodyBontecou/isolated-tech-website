/**
 * Admin authentication helpers
 *
 * Supports both session-based auth (cookies) and API key auth (X-API-Key header).
 * API keys can be:
 * - Legacy static key (ADMIN_API_KEY env var) - no expiration
 * - Database-backed keys with 30-day expiration
 */

import { NextRequest } from "next/server";
import type { Env } from "@/lib/env";
import { getSessionFromHeaders, type User } from "@/lib/auth/middleware";
import { queryOne, execute, nanoid } from "@/lib/db";

/**
 * Virtual admin user for API key access
 */
const API_KEY_ADMIN_USER: User = {
  id: "api-key-admin",
  email: "api@isolated.tech",
  name: "API Key Admin",
  image: null,
  isAdmin: true,
  newsletterSubscribed: false,
  createdAt: new Date(),
  updatedAt: new Date(),
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
 * Generate a new API key with 30-day expiration
 */
export async function generateApiKey(
  env: Env,
  name: string = "default"
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
    `INSERT INTO api_keys (id, name, key_hash, key_prefix, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, name, keyHash, keyPrefix, expiresAt.toISOString()],
    env
  );

  return { key, expiresAt };
}

/**
 * Revoke an API key by its prefix
 */
export async function revokeApiKey(
  env: Env,
  keyPrefix: string
): Promise<boolean> {
  const result = await execute(
    `UPDATE api_keys SET is_revoked = 1 WHERE key_prefix = ?`,
    [keyPrefix],
    env
  );
  return (result.meta?.changes ?? 0) > 0;
}

/**
 * Validate an API key against the database
 * Returns true if valid and not expired
 */
async function validateDatabaseApiKey(
  key: string,
  env: Env
): Promise<boolean> {
  const keyHash = await hashApiKey(key);

  const record = await queryOne<{
    id: string;
    expires_at: string;
    is_revoked: number;
  }>(
    `SELECT id, expires_at, is_revoked FROM api_keys WHERE key_hash = ?`,
    [keyHash],
    env
  );

  if (!record) {
    return false;
  }

  // Check if revoked
  if (record.is_revoked) {
    return false;
  }

  // Check expiration
  const expiresAt = new Date(record.expires_at);
  if (expiresAt < new Date()) {
    return false;
  }

  // Update last_used_at
  await execute(
    `UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`,
    [record.id],
    env
  ).catch(() => {}); // Non-blocking, ignore errors

  return true;
}

/**
 * Require admin authentication via session cookie or API key
 *
 * Returns the admin user if authenticated, null otherwise.
 */
export async function requireAdmin(
  request: NextRequest,
  env: Env
): Promise<User | null> {
  // 1. Check API key first (for CLI access)
  const apiKey = request.headers.get("X-API-Key");
  if (apiKey) {
    // Try legacy static key first
    if (env.ADMIN_API_KEY && apiKey === env.ADMIN_API_KEY) {
      return API_KEY_ADMIN_USER;
    }

    // Try database-backed expiring key
    const isValid = await validateDatabaseApiKey(apiKey, env);
    if (isValid) {
      return API_KEY_ADMIN_USER;
    }

    // Invalid API key - don't fall through to session auth
    return null;
  }

  // 2. Fall back to session-based auth using Better Auth
  const { user } = await getSessionFromHeaders(request.headers, env);

  if (!user || !user.isAdmin) {
    return null;
  }

  return user;
}
