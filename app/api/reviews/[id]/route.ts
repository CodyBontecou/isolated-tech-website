/**
 * PUT /api/reviews/[id] - Update a review
 * DELETE /api/reviews/[id] - Delete a review
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionIdFromCookies, validateSession } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user owns this review
    const review = await env.DB.prepare(
      `SELECT id, user_id FROM reviews WHERE id = ?`
    )
      .bind(params.id)
      .first<{ id: string; user_id: string }>();

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.user_id !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own reviews" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { rating, title, body: reviewBody } = body;

    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];

    if (rating !== undefined) {
      if (typeof rating !== "number" || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "Rating must be between 1 and 5" },
          { status: 400 }
        );
      }
      updates.push("rating = ?");
      values.push(rating);
    }

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title?.trim().slice(0, 100) || null);
    }

    if (reviewBody !== undefined) {
      updates.push("body = ?");
      values.push(reviewBody?.trim().slice(0, 2000) || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(params.id);

    await env.DB.prepare(
      `UPDATE reviews SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update review error:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user owns this review (or is admin)
    const review = await env.DB.prepare(
      `SELECT id, user_id FROM reviews WHERE id = ?`
    )
      .bind(params.id)
      .first<{ id: string; user_id: string }>();

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.user_id !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { error: "You can only delete your own reviews" },
        { status: 403 }
      );
    }

    // Delete review
    await env.DB.prepare(`DELETE FROM reviews WHERE id = ?`)
      .bind(params.id)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete review error:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
