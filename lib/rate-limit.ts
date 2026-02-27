/**
 * Simple rate limiting using D1 database
 * Tracks action counts per user per day
 */

import type { Env } from "./env";
import { queryOne, execute, nanoid } from "./db";

interface RateLimitConfig {
  action: string;
  maxPerDay: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
}

/**
 * Check rate limit for a user action
 * Returns whether the action is allowed and remaining quota
 */
export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig,
  env: Env
): Promise<RateLimitResult> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const resetAt = `${today}T23:59:59Z`;

  // Count actions for this user today
  const result = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count 
     FROM rate_limits 
     WHERE user_id = ? AND action = ? AND date(created_at) = ?`,
    [userId, config.action, today],
    env
  );

  const count = result?.count || 0;
  const remaining = Math.max(0, config.maxPerDay - count);
  const allowed = count < config.maxPerDay;

  return { allowed, remaining, resetAt };
}

/**
 * Record an action for rate limiting
 * Call this after the action succeeds
 */
export async function recordRateLimitAction(
  userId: string,
  action: string,
  env: Env
): Promise<void> {
  await execute(
    `INSERT INTO rate_limits (id, user_id, action, created_at) VALUES (?, ?, ?, datetime('now'))`,
    [nanoid(), userId, action],
    env
  );
}

/**
 * Clean up old rate limit records (call periodically)
 */
export async function cleanupRateLimits(env: Env): Promise<void> {
  await execute(
    `DELETE FROM rate_limits WHERE date(created_at) < date('now', '-7 days')`,
    [],
    env
  );
}

// Common rate limit configs
export const RATE_LIMITS = {
  feedbackSubmission: { action: "feedback_submit", maxPerDay: 5 },
  feedbackComment: { action: "feedback_comment", maxPerDay: 20 },
} as const;
