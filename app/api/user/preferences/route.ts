/**
 * PUT /api/user/preferences
 *
 * Update user email preferences.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionIdFromCookies, validateSession, updateUser } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Get current user
    const cookieHeader = request.headers.get("cookie");
    const sessionId = getSessionIdFromCookies(cookieHeader);

    if (!sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { user } = await validateSession(sessionId, env);

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

    // Update user preferences
    await updateUser(
      user.id,
      { newsletterSubscribed: newsletter_subscribed },
      env
    );

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
