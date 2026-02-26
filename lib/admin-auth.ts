/**
 * Admin authentication helpers
 *
 * Supports both session-based auth (cookies) and API key auth (X-API-Key header).
 */

import { NextRequest } from "next/server";
import type { Env } from "@/lib/env";
import { getSessionFromHeaders, type User } from "@/lib/auth/middleware";

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
  if (apiKey && env.ADMIN_API_KEY) {
    if (apiKey === env.ADMIN_API_KEY) {
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
