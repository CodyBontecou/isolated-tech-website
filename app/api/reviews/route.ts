/**
 * POST /api/reviews
 *
 * Create a new review for an app.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionIdFromCookies, validateSession } from "@/lib/auth";
import { nanoid } from "@/lib/db";

export async function POST(request: NextRequest) {
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
    const { appId, rating, title, body: reviewBody } = body;

    // Validate
    if (!appId || typeof appId !== "string") {
      return NextResponse.json({ error: "App ID is required" }, { status: 400 });
    }

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if user has purchased this app
    const purchase = await env.DB.prepare(
      `SELECT id FROM purchases 
       WHERE user_id = ? AND app_id = ? AND status = 'completed'`
    )
      .bind(user.id, appId)
      .first<{ id: string }>();

    if (!purchase) {
      return NextResponse.json(
        { error: "You must purchase this app before reviewing it" },
        { status: 403 }
      );
    }

    // Check if user already reviewed this app
    const existingReview = await env.DB.prepare(
      `SELECT id FROM reviews WHERE user_id = ? AND app_id = ?`
    )
      .bind(user.id, appId)
      .first<{ id: string }>();

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this app" },
        { status: 400 }
      );
    }

    // Create review
    const reviewId = nanoid();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO reviews (id, user_id, app_id, purchase_id, rating, title, body, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        reviewId,
        user.id,
        appId,
        purchase.id,
        rating,
        title?.trim().slice(0, 100) || null,
        reviewBody?.trim().slice(0, 2000) || null,
        now,
        now
      )
      .run();

    return NextResponse.json({
      success: true,
      review: {
        id: reviewId,
        rating,
        title,
        body: reviewBody,
        created_at: now,
      },
    });
  } catch (error) {
    console.error("Create review error:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
