/**
 * Auth middleware helpers for ISOLATED.TECH
 *
 * Server-side utilities for checking authentication in
 * Server Components and Route Handlers.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuth } from "@/lib/auth";
import { getEnv, type Env } from "@/lib/env";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  isAdmin: boolean;
  newsletterSubscribed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface SessionResult {
  session: Session | null;
  user: User | null;
}

/**
 * Get the current session and user from request headers
 * For use in API route handlers
 */
export async function getSessionFromHeaders(
  requestHeaders: Headers,
  env?: Env
): Promise<SessionResult> {
  try {
    const e = env || getEnv();
    const auth = createAuth(e);

    const session = await auth.api.getSession({
      headers: requestHeaders,
    });

    if (!session) {
      return { session: null, user: null };
    }

    return {
      session: {
        id: session.session.id,
        userId: session.session.userId,
        expiresAt: session.session.expiresAt,
      },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        isAdmin: (session.user as Record<string, unknown>).isAdmin === true,
        newsletterSubscribed:
          (session.user as Record<string, unknown>).newsletterSubscribed !== false,
        createdAt: session.user.createdAt,
        updatedAt: session.user.updatedAt,
      },
    };
  } catch (error) {
    console.error("Error getting session from headers:", error);
    return { session: null, user: null };
  }
}

/**
 * Get the current session and user
 * For use in Server Components (uses next/headers)
 */
export async function getCurrentSession(env?: Env): Promise<SessionResult> {
  try {
    const requestHeaders = await headers();
    return getSessionFromHeaders(requestHeaders, env);
  } catch (error) {
    console.error("Error getting current session:", error);
    return { session: null, user: null };
  }
}

/**
 * Get the current user (convenience wrapper)
 */
export async function getCurrentUser(env?: Env): Promise<User | null> {
  const { user } = await getCurrentSession(env);
  return user;
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(env?: Env): Promise<User> {
  const user = await getCurrentUser(env);

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

/**
 * Require admin authentication
 */
export async function requireAdmin(env?: Env): Promise<User> {
  const user = await requireAuth(env);

  if (!user.isAdmin) {
    redirect("/dashboard");
  }

  return user;
}

/**
 * Check if user is authenticated (for conditional rendering)
 */
export async function isAuthenticated(env?: Env): Promise<boolean> {
  const user = await getCurrentUser(env);
  return user !== null;
}

/**
 * Validate session from request (for API routes)
 * This is a compatibility wrapper for existing code
 */
export async function validateSessionFromRequest(
  request: Request,
  env?: Env
): Promise<SessionResult> {
  return getSessionFromHeaders(request.headers, env);
}
