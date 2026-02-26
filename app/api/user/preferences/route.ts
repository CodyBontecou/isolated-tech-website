/**
 * PUT /api/user/preferences
 *
 * Update user email preferences.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";

export async function PUT(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get current user
    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { newsletter_subscribed } = body;

    // Validate
    if (newsletter_subscribed !== undefined && typeof newsletter_subscribed !== "boolean") {
      return NextResponse.json({ error: "Invalid preference value" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const newsletterValue = newsletter_subscribed ? 1 : 0;

    // Update user in Better Auth table
    await env.DB.prepare(
      'UPDATE "user" SET "newsletterSubscribed" = ?, "updatedAt" = ? WHERE id = ?'
    )
      .bind(newsletterValue, now, user.id)
      .run();

    // Also update old users table for compatibility
    await env.DB.prepare(
      "UPDATE users SET newsletter_subscribed = ?, updated_at = ? WHERE id = ?"
    )
      .bind(newsletterValue, now, user.id)
      .run();

    return NextResponse.json({
      success: true,
      preferences: {
        newsletter_subscribed: newsletter_subscribed ?? user.newsletterSubscribed,
      },
    });
  } catch (error) {
    console.error("Preferences update error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
