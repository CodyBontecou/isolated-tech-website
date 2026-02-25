/**
 * Session management for ISOLATED.TECH App Store
 *
 * Uses KV for fast session lookups, D1 for persistence.
 * Sessions are 30 days, refreshed when > 15 days old.
 */

import { nanoid } from "@/lib/db";
import type { Env } from "@/lib/env";

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  newsletterSubscribed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionValidationResult {
  session: Session | null;
  user: User | null;
}

// Session duration constants
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  env: Env
): Promise<Session> {
  const sessionId = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  const session: Session = {
    id: sessionId,
    userId,
    expiresAt,
    createdAt: now,
  };

  // Store in D1 (persistent)
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`
  )
    .bind(sessionId, userId, expiresAt.toISOString(), now.toISOString())
    .run();

  // Store in KV (fast lookups) with TTL
  const kvValue = JSON.stringify({ userId, expiresAt: expiresAt.toISOString() });
  const ttlSeconds = Math.floor(SESSION_DURATION_MS / 1000);
  await env.AUTH_KV.put(`session:${sessionId}`, kvValue, {
    expirationTtl: ttlSeconds,
  });

  return session;
}

/**
 * Validate a session and return the user
 */
export async function validateSession(
  sessionId: string,
  env: Env
): Promise<SessionValidationResult> {
  // Try KV first (fast path)
  const kvValue = await env.AUTH_KV.get(`session:${sessionId}`);

  let userId: string;
  let expiresAt: Date;

  if (kvValue) {
    const data = JSON.parse(kvValue);
    userId = data.userId;
    expiresAt = new Date(data.expiresAt);
  } else {
    // Fall back to D1
    const dbSession = await env.DB.prepare(
      `SELECT user_id, expires_at FROM sessions WHERE id = ?`
    )
      .bind(sessionId)
      .first<{ user_id: string; expires_at: string }>();

    if (!dbSession) {
      return { session: null, user: null };
    }

    userId = dbSession.user_id;
    expiresAt = new Date(dbSession.expires_at);

    // Re-populate KV cache
    const remainingMs = expiresAt.getTime() - Date.now();
    if (remainingMs > 0) {
      await env.AUTH_KV.put(
        `session:${sessionId}`,
        JSON.stringify({ userId, expiresAt: expiresAt.toISOString() }),
        { expirationTtl: Math.floor(remainingMs / 1000) }
      );
    }
  }

  // Check if expired
  if (Date.now() >= expiresAt.getTime()) {
    await invalidateSession(sessionId, env);
    return { session: null, user: null };
  }

  // Get user
  const user = await env.DB.prepare(
    `SELECT id, email, name, avatar_url, is_admin, newsletter_subscribed, created_at, updated_at
     FROM users WHERE id = ?`
  )
    .bind(userId)
    .first<{
      id: string;
      email: string;
      name: string | null;
      avatar_url: string | null;
      is_admin: number;
      newsletter_subscribed: number;
      created_at: string;
      updated_at: string;
    }>();

  if (!user) {
    await invalidateSession(sessionId, env);
    return { session: null, user: null };
  }

  const session: Session = {
    id: sessionId,
    userId,
    expiresAt,
    createdAt: new Date(), // Not stored in KV, approximate
  };

  // Refresh session if > 15 days old
  const shouldRefresh =
    expiresAt.getTime() - Date.now() < SESSION_REFRESH_THRESHOLD_MS;

  if (shouldRefresh) {
    const newExpiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    // Update D1
    await env.DB.prepare(`UPDATE sessions SET expires_at = ? WHERE id = ?`)
      .bind(newExpiresAt.toISOString(), sessionId)
      .run();

    // Update KV
    await env.AUTH_KV.put(
      `session:${sessionId}`,
      JSON.stringify({ userId, expiresAt: newExpiresAt.toISOString() }),
      { expirationTtl: Math.floor(SESSION_DURATION_MS / 1000) }
    );

    session.expiresAt = newExpiresAt;
  }

  return {
    session,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      isAdmin: user.is_admin === 1,
      newsletterSubscribed: user.newsletter_subscribed === 1,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  };
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateSession(
  sessionId: string,
  env: Env
): Promise<void> {
  // Delete from KV
  await env.AUTH_KV.delete(`session:${sessionId}`);

  // Delete from D1
  await env.DB.prepare(`DELETE FROM sessions WHERE id = ?`)
    .bind(sessionId)
    .run();
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions(
  userId: string,
  env: Env
): Promise<void> {
  // Get all session IDs for user
  const sessions = await env.DB.prepare(
    `SELECT id FROM sessions WHERE user_id = ?`
  )
    .bind(userId)
    .all<{ id: string }>();

  // Delete from KV
  await Promise.all(
    sessions.results.map((s) => env.AUTH_KV.delete(`session:${s.id}`))
  );

  // Delete from D1
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?`)
    .bind(userId)
    .run();
}

/**
 * Session cookie configuration
 */
export const SESSION_COOKIE_NAME = "session";

export function createSessionCookie(sessionId: string, expiresAt: Date): string {
  const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

  return [
    `${SESSION_COOKIE_NAME}=${sessionId}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAge}`,
    `Secure`,
  ].join("; ");
}

export function createBlankSessionCookie(): string {
  return [
    `${SESSION_COOKIE_NAME}=`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=0`,
    `Secure`,
  ].join("; ");
}

/**
 * Parse session ID from cookie header
 */
export function getSessionIdFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) =>
    c.startsWith(`${SESSION_COOKIE_NAME}=`)
  );

  if (!sessionCookie) return null;

  const sessionId = sessionCookie.split("=")[1];
  return sessionId || null;
}
