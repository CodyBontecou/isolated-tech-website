/**
 * Legacy Purchase & Subscriber Claiming
 * 
 * Auto-links Gumroad purchases and subscribers when users sign up
 */

import type { Env } from "./env";

/**
 * Claim legacy purchases and link subscriber records when a user signs up
 * Call this after user creation or on first login
 */
export async function claimLegacyData(userId: string, email: string, env: Env) {
  const now = new Date().toISOString();
  const emailLower = email.toLowerCase();

  try {
    // Link subscriber record if exists
    await env.DB.prepare(
      `UPDATE subscribers SET user_id = ?, metadata = json_set(COALESCE(metadata, '{}'), '$.linkedAt', ?)
       WHERE email = ? AND user_id IS NULL`
    )
      .bind(userId, now, emailLower)
      .run();

    // Claim legacy purchases
    const legacyPurchases = await env.DB.prepare(
      `SELECT id, product_name, app_id FROM legacy_purchases
       WHERE email = ? AND user_id IS NULL`
    )
      .bind(emailLower)
      .all<{ id: string; product_name: string; app_id: string | null }>();

    if (legacyPurchases.results.length > 0) {
      // Mark as claimed
      await env.DB.prepare(
        `UPDATE legacy_purchases SET user_id = ?, claimed_at = ?
         WHERE email = ? AND user_id IS NULL`
      )
        .bind(userId, now, emailLower)
        .run();

      // Create actual purchase records for claimed items with app_id
      for (const legacy of legacyPurchases.results) {
        if (legacy.app_id) {
          // Check if purchase already exists
          const existing = await env.DB.prepare(
            `SELECT id FROM purchases WHERE user_id = ? AND app_id = ?`
          )
            .bind(userId, legacy.app_id)
            .first();

          if (!existing) {
            // Create purchase record (free, since they already paid on Gumroad)
            const purchaseId = crypto.randomUUID().replace(/-/g, "").slice(0, 21);
            await env.DB.prepare(
              `INSERT INTO purchases (id, user_id, app_id, amount_cents, currency, status, created_at)
               VALUES (?, ?, ?, 0, 'usd', 'completed', ?)`
            )
              .bind(purchaseId, userId, legacy.app_id, now)
              .run();

            console.log(`[LEGACY CLAIM] Created purchase for ${email}: ${legacy.product_name} (${legacy.app_id})`);
          }
        }
      }

      console.log(`[LEGACY CLAIM] Claimed ${legacyPurchases.results.length} purchases for ${email}`);
    }

    return {
      subscriberLinked: true,
      purchasesClaimed: legacyPurchases.results.length,
    };
  } catch (error) {
    console.error(`[LEGACY CLAIM ERROR] ${email}:`, error);
    return {
      subscriberLinked: false,
      purchasesClaimed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if an email has legacy purchases waiting to be claimed
 */
export async function hasUnclaimedPurchases(email: string, env: Env): Promise<boolean> {
  const result = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM legacy_purchases
     WHERE email = ? AND user_id IS NULL`
  )
    .bind(email.toLowerCase())
    .first<{ count: number }>();

  return (result?.count || 0) > 0;
}
