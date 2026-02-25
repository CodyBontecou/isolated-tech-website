/**
 * User management for ISOLATED.TECH App Store
 */

import { nanoid } from "@/lib/db";
import type { Env } from "@/lib/env";
import type { User } from "./session";

export interface CreateUserInput {
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface OAuthAccountInput {
  provider: "apple" | "google" | "github";
  providerUserId: string;
}

/**
 * Create a new user
 */
export async function createUser(
  input: CreateUserInput,
  env: Env
): Promise<User> {
  const id = nanoid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO users (id, email, name, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, input.email, input.name || null, input.avatarUrl || null, now, now)
    .run();

  return {
    id,
    email: input.email,
    name: input.name || null,
    avatarUrl: input.avatarUrl || null,
    isAdmin: false,
    newsletterSubscribed: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get user by email
 */
export async function getUserByEmail(
  email: string,
  env: Env
): Promise<User | null> {
  const row = await env.DB.prepare(`SELECT * FROM users WHERE email = ?`)
    .bind(email)
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

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    isAdmin: row.is_admin === 1,
    newsletterSubscribed: row.newsletter_subscribed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(
  id: string,
  env: Env
): Promise<User | null> {
  const row = await env.DB.prepare(`SELECT * FROM users WHERE id = ?`)
    .bind(id)
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

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    isAdmin: row.is_admin === 1,
    newsletterSubscribed: row.newsletter_subscribed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update user profile
 */
export async function updateUser(
  id: string,
  updates: Partial<Pick<User, "name" | "avatarUrl" | "newsletterSubscribed">>,
  env: Env
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) {
    sets.push("name = ?");
    values.push(updates.name);
  }
  if (updates.avatarUrl !== undefined) {
    sets.push("avatar_url = ?");
    values.push(updates.avatarUrl);
  }
  if (updates.newsletterSubscribed !== undefined) {
    sets.push("newsletter_subscribed = ?");
    values.push(updates.newsletterSubscribed ? 1 : 0);
  }

  if (sets.length === 0) return;

  sets.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  await env.DB.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

/**
 * Get or create user from OAuth
 */
export async function getOrCreateUserFromOAuth(
  oauth: OAuthAccountInput,
  profile: CreateUserInput,
  env: Env
): Promise<User> {
  // Check if OAuth account exists
  const existing = await env.DB.prepare(
    `SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?`
  )
    .bind(oauth.provider, oauth.providerUserId)
    .first<{ user_id: string }>();

  if (existing) {
    const user = await getUserById(existing.user_id, env);
    if (user) {
      // Update profile info from OAuth
      await updateUser(
        user.id,
        {
          name: profile.name || user.name || undefined,
          avatarUrl: profile.avatarUrl || user.avatarUrl || undefined,
        },
        env
      );
      return { ...user, name: profile.name || user.name, avatarUrl: profile.avatarUrl || user.avatarUrl };
    }
  }

  // Check if user exists by email
  let user = await getUserByEmail(profile.email, env);

  if (!user) {
    // Create new user
    user = await createUser(profile, env);
  }

  // Link OAuth account
  const oauthId = nanoid();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO oauth_accounts (id, user_id, provider, provider_user_id, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(oauthId, user.id, oauth.provider, oauth.providerUserId, new Date().toISOString())
    .run();

  return user;
}

/**
 * Get linked OAuth providers for a user
 */
export async function getUserOAuthProviders(
  userId: string,
  env: Env
): Promise<string[]> {
  const rows = await env.DB.prepare(
    `SELECT provider FROM oauth_accounts WHERE user_id = ?`
  )
    .bind(userId)
    .all<{ provider: string }>();

  return rows.results.map((r) => r.provider);
}
