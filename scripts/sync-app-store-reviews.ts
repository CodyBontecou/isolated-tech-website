#!/usr/bin/env npx tsx
/**
 * Sync App Store reviews using Apple's public RSS feed
 * 
 * Usage:
 *   npx tsx scripts/sync-app-store-reviews.ts
 *   
 * No authentication required - uses public RSS feed
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// Load .env.local manually
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(join(process.cwd(), ".env.local"));

interface AppConfig {
  id: string;
  slug: string;
  name: string;
  app_store_id: string;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  reviewerNickname: string;
  territory: string;
  createdDate: string;
}

interface RSSReviewEntry {
  id?: { label?: string };
  title?: { label?: string };
  content?: { label?: string };
  author?: { name?: { label?: string } };
  "im:rating"?: { label?: string };
  updated?: { label?: string };
}

/**
 * Fetch reviews from Apple RSS feed (public, no auth required)
 * Limited to ~50 most recent reviews per country
 */
async function fetchAppStoreReviewsRSS(appStoreId: string): Promise<Review[]> {
  const reviews: Review[] = [];
  
  // Fetch from multiple countries
  const countries = ["us", "gb", "ca", "au", "de", "fr", "jp"];
  
  for (const country of countries) {
    try {
      const url = `https://itunes.apple.com/${country}/rss/customerreviews/id=${appStoreId}/sortBy=mostRecent/json`;
      console.log(`  Fetching reviews from ${country.toUpperCase()}...`);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`    Skipped (${response.status})`);
        continue;
      }
      
      const data = await response.json() as { feed?: { entry?: RSSReviewEntry[] } };
      const entries = data.feed?.entry || [];
      
      // First entry is sometimes app info, skip if no rating
      const reviewEntries = entries.filter((e: RSSReviewEntry) => e["im:rating"]);
      
      for (const entry of reviewEntries) {
        const reviewId = entry.id?.label || `${appStoreId}-${country}-${Date.now()}-${Math.random()}`;
        
        // Skip if we already have this review
        if (reviews.some(r => r.id === reviewId)) continue;
        
        reviews.push({
          id: reviewId,
          rating: parseInt(entry["im:rating"]?.label || "0", 10),
          title: entry.title?.label || null,
          body: entry.content?.label || null,
          reviewerNickname: entry.author?.name?.label || "Anonymous",
          territory: country.toUpperCase(),
          createdDate: entry.updated?.label || new Date().toISOString(),
        });
      }
      
      console.log(`    Found ${reviewEntries.length} reviews`);
      
    } catch (e) {
      console.log(`    Error: ${e instanceof Error ? e.message : e}`);
    }
  }
  
  return reviews;
}

/**
 * Execute D1 query via wrangler CLI
 */
function executeD1Query(sql: string): string {
  const escaped = sql.replace(/'/g, "'\"'\"'");
  const cmd = `npx wrangler d1 execute isolated-tech-store --remote --command '${escaped}' --json 2>/dev/null`;
  
  try {
    const result = execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    return result;
  } catch (error) {
    console.error("D1 query failed");
    throw error;
  }
}

/**
 * Escape SQL string value
 */
function sqlEscape(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

async function main() {
  console.log("🍎 App Store Reviews Sync (RSS Feed)\n");

  // Get apps with app_store_id configured
  console.log("📱 Fetching apps with App Store IDs...\n");
  
  const appsResult = executeD1Query(
    `SELECT id, slug, name, custom_page_config FROM apps WHERE is_published = 1`
  );
  
  const appsData = JSON.parse(appsResult) as Array<{ results: Array<{ id: string; slug: string; name: string; custom_page_config: string | null }> }>;
  
  const apps: AppConfig[] = [];
  
  for (const row of appsData[0]?.results || []) {
    if (row.custom_page_config) {
      try {
        const config = JSON.parse(row.custom_page_config) as { app_store_id?: string };
        if (config.app_store_id) {
          apps.push({
            id: row.id,
            slug: row.slug,
            name: row.name,
            app_store_id: config.app_store_id,
          });
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  if (apps.length === 0) {
    console.log("⚠️  No apps with app_store_id configured.");
    process.exit(0);
  }

  console.log(`Found ${apps.length} app(s) with App Store IDs:\n`);

  let totalSynced = 0;

  for (const app of apps) {
    console.log(`\n📦 ${app.name} (${app.slug})`);
    console.log(`   App Store ID: ${app.app_store_id}`);

    try {
      // Fetch reviews from RSS feed
      const reviews = await fetchAppStoreReviewsRSS(app.app_store_id);
      console.log(`   Total unique reviews: ${reviews.length}`);

      if (reviews.length === 0) {
        continue;
      }

      // Upsert reviews to D1
      let synced = 0;
      for (const review of reviews) {
        const sql = `INSERT INTO app_store_reviews (id, app_id, rating, title, body, reviewer_nickname, territory, app_store_version, review_created_at, synced_at)
           VALUES (${sqlEscape(review.id)}, ${sqlEscape(app.id)}, ${review.rating}, ${sqlEscape(review.title)}, ${sqlEscape(review.body)}, ${sqlEscape(review.reviewerNickname)}, ${sqlEscape(review.territory)}, NULL, ${sqlEscape(review.createdDate)}, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET
             rating = excluded.rating,
             title = excluded.title,
             body = excluded.body,
             reviewer_nickname = excluded.reviewer_nickname,
             territory = excluded.territory,
             synced_at = datetime('now')`;
        
        try {
          executeD1Query(sql);
          synced++;
        } catch (e) {
          console.error(`   ⚠️  Failed to insert review ${review.id}`);
        }
      }

      // Update sync log
      executeD1Query(
        `INSERT INTO app_store_sync_log (app_id, last_synced_at, reviews_fetched, error_message)
         VALUES (${sqlEscape(app.id)}, datetime('now'), ${synced}, NULL)
         ON CONFLICT(app_id) DO UPDATE SET
           last_synced_at = datetime('now'),
           reviews_fetched = excluded.reviews_fetched,
           error_message = NULL`
      );

      console.log(`   ✓ Synced ${synced} reviews`);
      totalSynced += synced;

    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`\n✅ Done! Synced ${totalSynced} total reviews.`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
