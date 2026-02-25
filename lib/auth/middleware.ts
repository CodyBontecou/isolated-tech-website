/**
 * Auth middleware helpers for ISOLATED.TECH App Store
 */

import { cookies } from "next/headers";
import type { Env } from "@/lib/env";
import {
  SESSION_COOKIE_NAME,
  validateSession,
  type User,
  type Session,
} from "./session";

/**
 * Get the current user from the session cookie
 * Call this in Server Components or Route Handlers
 */
export async function getCurrentUser(env: Env): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return null;
    }

    const { user } = await validateSession(sessionId, env);
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Get the current session and user
 */
export async function getCurrentSession(
  env: Env
): Promise<{ session: Session | null; user: User | null }> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return { session: null, user: null };
    }

    return validateSession(sessionId, env);
  } catch (error) {
    console.error("Error getting current session:", error);
    return { session: null, user: null };
  }
}

/**
 * Require authentication - throws redirect if not authenticated
 */
export async function requireAuth(env: Env): Promise<User> {
  const user = await getCurrentUser(env);

  if (!user) {
    // Import redirect dynamically to avoid issues
    const { redirect } = await import("next/navigation");
    redirect("/auth/login");
  }

  return user;
}

/**
 * Require admin authentication
 */
export async function requireAdmin(env: Env): Promise<User> {
  const user = await requireAuth(env);

  if (!user.isAdmin) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  return user;
}

/**
 * Check if user is authenticated (for conditional rendering)
 */
export async function isAuthenticated(env: Env): Promise<boolean> {
  const user = await getCurrentUser(env);
  return user !== null;
}
