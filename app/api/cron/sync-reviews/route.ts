/**
 * Cron endpoint to sync App Store reviews
 * 
 * Called by Cloudflare Cron Triggers or external scheduler.
 * Protected by a secret token.
 * 
 * Usage:
 *   POST /api/cron/sync-reviews
 *   Authorization: Bearer <CRON_SECRET>
 */

import { getEnv } from "@/lib/cloudflare-context";
import { getAppStoreConnectClient } from "@/lib/app-store-connect";
import { queries, nanoid } from "@/lib/db";

export async function POST(request: Request) {
  const env = getEnv();
  
  if (!env) {
    return Response.json({ error: "Environment not available" }, { status: 500 });
  }

  // Verify cron secret
  const authHeader = request.headers.get("Authorization");
  const cronSecret = (env as unknown as { CRON_SECRET?: string }).CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get App Store Connect client
    const client = getAppStoreConnectClient(env as unknown as {
      APP_STORE_CONNECT_KEY_ID?: string;
      APP_STORE_CONNECT_ISSUER_ID?: string;
      APP_STORE_CONNECT_PRIVATE_KEY?: string;
    });

    // Get all apps with app_store_id configured
    const apps = await env.DB.prepare(
      `SELECT id, slug, name, custom_page_config FROM apps WHERE is_published = 1`
    ).all<{ id: string; slug: string; name: string; custom_page_config: string | null }>();

    const results: Array<{ app: string; reviews: number; error?: string }> = [];

    for (const app of apps.results || []) {
      if (!app.custom_page_config) continue;

      let config: { app_store_id?: string };
      try {
        config = JSON.parse(app.custom_page_config);
      } catch {
        continue;
      }

      if (!config.app_store_id) continue;

      try {
        // Fetch reviews from App Store Connect
        const reviews = await client.getReviews(config.app_store_id, {
          limit: 100,
          sortBy: "-createdDate",
          maxPages: 10,
        });

        // Upsert each review
        let synced = 0;
        for (const review of reviews) {
          await queries.upsertAppStoreReview(
            {
              id: review.id,
              app_id: app.id,
              rating: review.rating,
              title: review.title,
              body: review.body,
              reviewer_nickname: review.reviewerNickname,
              territory: review.territory,
              app_store_version: null,
              review_created_at: review.createdDate,
            },
            env
          );
          synced++;
        }

        // Update sync log
        await queries.updateAppStoreSyncLog(app.id, synced, null, env);
        
        results.push({ app: app.slug, reviews: synced });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await queries.updateAppStoreSyncLog(app.id, 0, errorMessage, env);
        results.push({ app: app.slug, reviews: 0, error: errorMessage });
      }
    }

    return Response.json({
      success: true,
      synced_at: new Date().toISOString(),
      results,
    });

  } catch (error) {
    console.error("Review sync error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Support GET for easy testing (but still requires auth)
export async function GET(request: Request) {
  return POST(request);
}
