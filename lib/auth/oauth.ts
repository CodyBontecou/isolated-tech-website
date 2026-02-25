/**
 * OAuth utilities for ISOLATED.TECH App Store
 */

import { GitHub, Google, Apple } from "arctic";
import type { Env } from "@/lib/env";

interface OAuthStateData {
  provider: string;
  createdAt: number;
  redirectTo?: string;
  codeVerifier?: string;
}

/**
 * Generate a cryptographically secure state parameter
 */
export function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Store OAuth state in KV for CSRF protection
 */
export async function storeOAuthState(
  state: string,
  provider: string,
  env: Env,
  options?: { redirectTo?: string; codeVerifier?: string }
): Promise<void> {
  const data: OAuthStateData = {
    provider,
    createdAt: Date.now(),
    ...(options?.redirectTo ? { redirectTo: options.redirectTo } : {}),
    ...(options?.codeVerifier ? { codeVerifier: options.codeVerifier } : {}),
  };

  await env.AUTH_KV.put(
    `oauth_state:${state}`,
    JSON.stringify(data),
    { expirationTtl: 600 } // 10 minutes
  );
}

/**
 * Consume and verify OAuth state
 */
export async function consumeOAuthState(
  state: string,
  expectedProvider: string,
  env: Env
): Promise<OAuthStateData | null> {
  const key = `oauth_state:${state}`;
  const value = await env.AUTH_KV.get(key);

  if (!value) {
    return null;
  }

  // Delete state (one-time use)
  await env.AUTH_KV.delete(key);

  const data = JSON.parse(value) as OAuthStateData;
  if (data.provider !== expectedProvider) {
    return null;
  }

  return data;
}

/**
 * Verify and consume OAuth state
 */
export async function verifyOAuthState(
  state: string,
  expectedProvider: string,
  env: Env
): Promise<boolean> {
  const data = await consumeOAuthState(state, expectedProvider, env);
  return !!data;
}

/**
 * Create GitHub OAuth client
 */
export function createGitHubClient(env: Env, baseUrl: string): GitHub | null {
  const clientId = (env as unknown as { GITHUB_CLIENT_ID?: string }).GITHUB_CLIENT_ID;
  const clientSecret = (env as unknown as { GITHUB_CLIENT_SECRET?: string }).GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new GitHub(clientId, clientSecret, `${baseUrl}/api/auth/github/callback`);
}

/**
 * Create Google OAuth client
 */
export function createGoogleClient(env: Env, baseUrl: string): Google | null {
  const clientId = (env as unknown as { GOOGLE_CLIENT_ID?: string }).GOOGLE_CLIENT_ID;
  const clientSecret = (env as unknown as { GOOGLE_CLIENT_SECRET?: string }).GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new Google(clientId, clientSecret, `${baseUrl}/api/auth/google/callback`);
}

/**
 * Create Apple OAuth client
 */
export function createAppleClient(env: Env, baseUrl: string): Apple | null {
  const clientId = (env as unknown as { APPLE_CLIENT_ID?: string }).APPLE_CLIENT_ID;
  const clientSecret = (env as unknown as { APPLE_CLIENT_SECRET?: string }).APPLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new Apple(clientId, clientSecret, `${baseUrl}/api/auth/apple/callback`);
}

/**
 * Link an OAuth account to a user
 */
export async function linkOAuthAccount(
  userId: string,
  provider: string,
  providerUserId: string,
  env: Env
): Promise<void> {
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT OR REPLACE INTO oauth_accounts (user_id, provider, provider_user_id, created_at)
     VALUES (?, ?, ?, ?)`
  )
    .bind(userId, provider, providerUserId, now)
    .run();
}

/**
 * Get user by OAuth account
 */
export async function getUserByOAuth(
  provider: string,
  providerUserId: string,
  env: Env
): Promise<{ userId: string } | null> {
  const result = await env.DB.prepare(
    `SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?`
  )
    .bind(provider, providerUserId)
    .first<{ user_id: string }>();

  return result ? { userId: result.user_id } : null;
}
