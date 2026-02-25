import { getEnv, type Env } from "./env";

/**
 * Get D1 database instance
 */
export function getDb(env?: Env): D1Database {
  return env?.DB || getEnv().DB;
}

/**
 * Execute a query and return all results
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  env?: Env
): Promise<T[]> {
  const db = getDb(env);
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  const result = await bound.all<T>();
  return result.results;
}

/**
 * Execute a query and return the first result
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  env?: Env
): Promise<T | null> {
  const db = getDb(env);
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  const result = await bound.first<T>();
  return result;
}

/**
 * Execute a write query (INSERT, UPDATE, DELETE)
 */
export async function execute(
  sql: string,
  params: unknown[] = [],
  env?: Env
): Promise<D1Result> {
  const db = getDb(env);
  const stmt = db.prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  return bound.run();
}

/**
 * Execute multiple queries in a batch (pseudo-transaction)
 */
export async function batch(
  queries: { sql: string; params?: unknown[] }[],
  env?: Env
): Promise<D1Result[]> {
  const db = getDb(env);
  const statements = queries.map(({ sql, params }) => {
    const stmt = db.prepare(sql);
    return params?.length ? stmt.bind(...params) : stmt;
  });
  return db.batch(statements);
}

/**
 * Generate a nanoid for primary keys
 */
export function nanoid(size = 21): string {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let id = "";
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  for (let i = 0; i < size; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

/**
 * Common query helpers
 */
export const queries = {
  // Users
  getUserById: (id: string, env?: Env) =>
    queryOne("SELECT * FROM users WHERE id = ?", [id], env),

  getUserByEmail: (email: string, env?: Env) =>
    queryOne("SELECT * FROM users WHERE email = ?", [email], env),

  // Apps
  getAppBySlug: (slug: string, env?: Env) =>
    queryOne("SELECT * FROM apps WHERE slug = ? AND is_published = 1", [slug], env),

  getPublishedApps: (env?: Env) =>
    query("SELECT * FROM apps WHERE is_published = 1 ORDER BY created_at DESC", [], env),

  // App versions
  getLatestVersion: (appId: string, env?: Env) =>
    queryOne(
      "SELECT * FROM app_versions WHERE app_id = ? AND is_latest = 1",
      [appId],
      env
    ),

  // Purchases
  getPurchase: (userId: string, appId: string, env?: Env) =>
    queryOne(
      "SELECT * FROM purchases WHERE user_id = ? AND app_id = ? AND status = 'completed'",
      [userId, appId],
      env
    ),

  getUserPurchases: (userId: string, env?: Env) =>
    query(
      `SELECT p.*, a.name as app_name, a.slug as app_slug, a.icon_url 
       FROM purchases p 
       JOIN apps a ON p.app_id = a.id 
       WHERE p.user_id = ? AND p.status = 'completed'
       ORDER BY p.created_at DESC`,
      [userId],
      env
    ),

  // Reviews
  getAppReviews: (appId: string, env?: Env) =>
    query(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.app_id = ? AND r.is_approved = 1
       ORDER BY r.created_at DESC`,
      [appId],
      env
    ),

  // Discount codes
  getDiscountCode: (code: string, env?: Env) =>
    queryOne(
      `SELECT * FROM discount_codes 
       WHERE code = ? AND is_active = 1 
       AND (expires_at IS NULL OR expires_at > datetime('now'))
       AND (max_uses IS NULL OR times_used < max_uses)`,
      [code],
      env
    ),

  // App updates
  getLatestUpdates: (appId: string, env?: Env) =>
    query<{
      id: string;
      app_id: string;
      platform: string;
      version: string;
      build_number: number | null;
      release_notes: string | null;
      released_at: string;
    }>(
      `SELECT u.*
       FROM app_updates u
       INNER JOIN (
         SELECT platform, MAX(released_at) as max_released
         FROM app_updates
         WHERE app_id = ?
         GROUP BY platform
       ) latest ON u.platform = latest.platform AND u.released_at = latest.max_released
       WHERE u.app_id = ?`,
      [appId, appId],
      env
    ),

  getAppUpdates: (appId: string, env?: Env) =>
    query<{
      id: string;
      app_id: string;
      platform: string;
      version: string;
      build_number: number | null;
      release_notes: string | null;
      released_at: string;
      created_at: string;
    }>(
      `SELECT * FROM app_updates
       WHERE app_id = ?
       ORDER BY released_at DESC`,
      [appId],
      env
    ),

  getAppUpdatesByPlatform: (appId: string, platform: string, env?: Env) =>
    query<{
      id: string;
      app_id: string;
      platform: string;
      version: string;
      build_number: number | null;
      release_notes: string | null;
      released_at: string;
      created_at: string;
    }>(
      `SELECT * FROM app_updates
       WHERE app_id = ? AND platform = ?
       ORDER BY released_at DESC`,
      [appId, platform],
      env
    ),
};
