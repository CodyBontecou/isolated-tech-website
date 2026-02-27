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
  // Users (Better Auth 'user' table)
  getUserById: (id: string, env?: Env) =>
    queryOne("SELECT * FROM user WHERE id = ?", [id], env),

  getUserByEmail: (email: string, env?: Env) =>
    queryOne("SELECT * FROM user WHERE email = ?", [email], env),

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
    query<{
      id: string;
      user_id: string;
      app_id: string;
      rating: number;
      title: string | null;
      body: string | null;
      created_at: string;
      user_name: string | null;
      user_image: string | null;
    }>(
      `SELECT r.*, u.name as user_name, u.image as user_image 
       FROM reviews r 
       JOIN "user" u ON r.user_id = u.id 
       WHERE r.app_id = ? AND r.is_approved = 1
       ORDER BY r.created_at DESC`,
      [appId],
      env
    ),

  getAppReviewStats: (appId: string, env?: Env) =>
    queryOne<{
      avg_rating: number | null;
      review_count: number;
    }>(
      `SELECT 
         AVG(CAST(rating AS REAL)) as avg_rating, 
         COUNT(*) as review_count 
       FROM reviews 
       WHERE app_id = ? AND is_approved = 1`,
      [appId],
      env
    ),

  getAllAppReviewStats: (env?: Env) =>
    query<{
      app_id: string;
      avg_rating: number | null;
      review_count: number;
    }>(
      `SELECT 
         app_id,
         AVG(CAST(rating AS REAL)) as avg_rating, 
         COUNT(*) as review_count 
       FROM reviews 
       WHERE is_approved = 1
       GROUP BY app_id`,
      [],
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

  // App Store Reviews (synced from App Store Connect)
  getAppStoreReviews: (appId: string, env?: Env) =>
    query<{
      id: string;
      app_id: string;
      rating: number;
      title: string | null;
      body: string | null;
      reviewer_nickname: string;
      territory: string;
      app_store_version: string | null;
      review_created_at: string;
      synced_at: string;
    }>(
      `SELECT * FROM app_store_reviews
       WHERE app_id = ?
       ORDER BY review_created_at DESC`,
      [appId],
      env
    ),

  getAppStoreReviewStats: (appId: string, env?: Env) =>
    queryOne<{
      avg_rating: number | null;
      review_count: number;
    }>(
      `SELECT 
         AVG(CAST(rating AS REAL)) as avg_rating, 
         COUNT(*) as review_count 
       FROM app_store_reviews 
       WHERE app_id = ?`,
      [appId],
      env
    ),

  // Combined review stats (site + App Store)
  getCombinedReviewStats: (appId: string, env?: Env) =>
    queryOne<{
      avg_rating: number | null;
      review_count: number;
      site_count: number;
      app_store_count: number;
    }>(
      `SELECT 
         AVG(rating) as avg_rating,
         COUNT(*) as review_count,
         SUM(CASE WHEN source = 'site' THEN 1 ELSE 0 END) as site_count,
         SUM(CASE WHEN source = 'app_store' THEN 1 ELSE 0 END) as app_store_count
       FROM (
         SELECT rating, 'site' as source FROM reviews WHERE app_id = ? AND is_approved = 1
         UNION ALL
         SELECT rating, 'app_store' as source FROM app_store_reviews WHERE app_id = ?
       )`,
      [appId, appId],
      env
    ),

  // Combined stats for all apps (for homepage)
  getAllCombinedReviewStats: (env?: Env) =>
    query<{
      app_id: string;
      avg_rating: number | null;
      review_count: number;
    }>(
      `SELECT 
         app_id,
         AVG(rating) as avg_rating, 
         COUNT(*) as review_count 
       FROM (
         SELECT app_id, rating FROM reviews WHERE is_approved = 1
         UNION ALL
         SELECT app_id, rating FROM app_store_reviews
       )
       GROUP BY app_id`,
      [],
      env
    ),

  upsertAppStoreReview: async (
    review: {
      id: string;
      app_id: string;
      rating: number;
      title: string | null;
      body: string | null;
      reviewer_nickname: string;
      territory: string;
      app_store_version: string | null;
      review_created_at: string;
    },
    env?: Env
  ) =>
    execute(
      `INSERT INTO app_store_reviews (id, app_id, rating, title, body, reviewer_nickname, territory, app_store_version, review_created_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         rating = excluded.rating,
         title = excluded.title,
         body = excluded.body,
         reviewer_nickname = excluded.reviewer_nickname,
         territory = excluded.territory,
         app_store_version = excluded.app_store_version,
         synced_at = datetime('now')`,
      [
        review.id,
        review.app_id,
        review.rating,
        review.title,
        review.body,
        review.reviewer_nickname,
        review.territory,
        review.app_store_version,
        review.review_created_at,
      ],
      env
    ),

  updateAppStoreSyncLog: async (
    appId: string,
    reviewsFetched: number,
    errorMessage: string | null,
    env?: Env
  ) =>
    execute(
      `INSERT INTO app_store_sync_log (app_id, last_synced_at, reviews_fetched, error_message)
       VALUES (?, datetime('now'), ?, ?)
       ON CONFLICT(app_id) DO UPDATE SET
         last_synced_at = datetime('now'),
         reviews_fetched = excluded.reviews_fetched,
         error_message = excluded.error_message`,
      [appId, reviewsFetched, errorMessage],
      env
    ),
};
