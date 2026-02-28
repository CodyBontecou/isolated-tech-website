import { queries } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/middleware";
import type { App, AppPageConfig, AppPageUser, Review, ReviewStats } from "@/components/app-page/types";
import { getPlatforms, hasIOS, hasMacOS } from "@/lib/platform";

export type { App, AppPageConfig, AppPageUser, Review, ReviewStats };

// Re-export getPlatforms for backwards compatibility
export { getPlatforms } from "@/lib/platform";

/**
 * Parse custom page config JSON
 */
export function getPageConfig(configJson: string | null): AppPageConfig | null {
  if (!configJson) return null;
  try {
    return JSON.parse(configJson) as AppPageConfig;
  } catch {
    return null;
  }
}

/**
 * Check if app is free (no price)
 */
export function isFreeApp(app: App): boolean {
  return app.min_price_cents === 0 && (!app.suggested_price_cents || app.suggested_price_cents === 0);
}

/**
 * Fetch app by slug from database
 */
export async function getAppBySlug(slug: string, db: D1Database | undefined): Promise<App | null> {
  if (!db) return null;
  
  const app = await db.prepare(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, min_price_cents, suggested_price_cents, custom_page_config, is_published
     FROM apps WHERE slug = ? AND is_published = 1`
  )
    .bind(slug)
    .first<App>();
  
  return app || null;
}

/**
 * Fetch all app page data in parallel
 */
export async function getAppPageData(slug: string, env: { DB?: D1Database } | null) {
  const db = env?.DB;
  
  // Get app first (needed for other queries)
  const app = await getAppBySlug(slug, db);
  if (!app) {
    return { app: null, user: null, hasPurchased: false, reviews: [], reviewStats: null };
  }
  
  // Get user
  const user = env ? await getCurrentUser(env as any) : null;
  
  // Parallel fetch: purchase status, reviews, review stats
  const [purchase, reviews, reviewStats] = await Promise.all([
    user ? queries.getPurchase(user.id, app.id, env as any) : null,
    queries.getAppReviews(app.id, env as any) as Promise<Review[]>,
    queries.getAppReviewStats(app.id, env as any) as Promise<ReviewStats | null>,
  ]);
  
  return {
    app,
    user: user as AppPageUser | null,
    hasPurchased: !!purchase,
    reviews,
    reviewStats,
  };
}

/**
 * Get purchase card props from app data
 */
export function getPurchaseCardProps(
  app: App,
  user: AppPageUser | null,
  hasPurchased: boolean,
  configOverrides?: Partial<AppPageConfig>
) {
  const platforms = getPlatforms(app.platforms);
  const pageConfig = getPageConfig(app.custom_page_config);
  const isFree = isFreeApp(app);
  
  return {
    appId: app.id,
    appSlug: app.slug,
    appName: app.name,
    minPriceCents: app.min_price_cents,
    suggestedPriceCents: app.suggested_price_cents,
    isFree,
    isAuthenticated: !!user,
    hasPurchased,
    iosAppStoreUrl: configOverrides?.ios_app_store_url?.trim() || pageConfig?.ios_app_store_url?.trim() || null,
    iosAppStoreLabel: configOverrides?.ios_app_store_label?.trim() || pageConfig?.ios_app_store_label?.trim() || "DOWNLOAD ON APP STORE (iOS)",
    hasMacOS: hasMacOS(platforms),
    hasIOS: hasIOS(platforms),
  };
}
