/**
 * Magic link authentication for ISOLATED.TECH App Store
 *
 * Flow:
 * 1. User enters email
 * 2. Generate token, store in KV with 15min TTL
 * 3. Send email with link
 * 4. User clicks link, verify token
 * 5. Create/get user, create session
 */

import type { Env } from "@/lib/env";
import { createUser, getUserByEmail } from "./user";
import { createSession, type Session, type User } from "./session";
import { sanitizeRedirectPath } from "./redirect";

const MAGIC_LINK_TTL_SECONDS = 15 * 60; // 15 minutes
const MAGIC_LINK_PREFIX = "magic_link:";

interface MagicLinkData {
  email: string;
  createdAt: string;
  redirectTo?: string;
}

interface VerifiedMagicLinkData {
  email: string;
  redirectTo: string;
}

/**
 * Generate a magic link token
 */
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create a magic link token for an email
 */
export async function createMagicLinkToken(
  email: string,
  env: Env,
  options?: { redirectTo?: string }
): Promise<string> {
  const token = generateToken();
  const data: MagicLinkData = {
    email: email.toLowerCase().trim(),
    createdAt: new Date().toISOString(),
    ...(options?.redirectTo
      ? { redirectTo: sanitizeRedirectPath(options.redirectTo) }
      : {}),
  };

  await env.AUTH_KV.put(`${MAGIC_LINK_PREFIX}${token}`, JSON.stringify(data), {
    expirationTtl: MAGIC_LINK_TTL_SECONDS,
  });

  return token;
}

/**
 * Verify a magic link token and return auth context
 */
export async function verifyMagicLinkToken(
  token: string,
  env: Env
): Promise<VerifiedMagicLinkData | null> {
  const key = `${MAGIC_LINK_PREFIX}${token}`;
  const value = await env.AUTH_KV.get(key);

  if (!value) {
    return null;
  }

  // Delete token (one-time use)
  await env.AUTH_KV.delete(key);

  const data = JSON.parse(value) as MagicLinkData;
  return {
    email: data.email,
    redirectTo: sanitizeRedirectPath(data.redirectTo),
  };
}

/**
 * Complete magic link authentication
 * Returns session and user
 */
export async function completeMagicLinkAuth(
  token: string,
  env: Env
): Promise<{ session: Session; user: User; redirectTo: string } | null> {
  const verifiedData = await verifyMagicLinkToken(token, env);

  if (!verifiedData) {
    return null;
  }

  // Get or create user
  let user = await getUserByEmail(verifiedData.email, env);

  if (!user) {
    user = await createUser({ email: verifiedData.email }, env);
  }

  // Create session
  const session = await createSession(user.id, env);

  return { session, user, redirectTo: verifiedData.redirectTo };
}

/**
 * Generate the magic link URL
 */
export function getMagicLinkUrl(token: string, baseUrl: string): string {
  return `${baseUrl}/auth/verify?token=${token}`;
}

/**
 * Rate limiting key for magic link requests
 */
export async function checkMagicLinkRateLimit(
  email: string,
  env: Env
): Promise<boolean> {
  const key = `rate_limit:magic_link:${email.toLowerCase().trim()}`;
  const existing = await env.AUTH_KV.get(key);

  if (existing) {
    return false; // Rate limited
  }

  // Allow one magic link per minute per email
  await env.AUTH_KV.put(key, "1", { expirationTtl: 60 });
  return true;
}
