/**
 * GET /api/seller/notifications
 * 
 * Get notifications for a seller (sales, refunds, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { query, execute } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Authenticate user
    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in" },
        { status: 401 }
      );
    }

    // Get limit from query params
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "20", 10),
      100
    );

    // Get notifications
    const notifications = await query<{
      id: string;
      type: string;
      purchase_id: string | null;
      message: string | null;
      sent_at: string;
      read_at: string | null;
    }>(
      `SELECT id, type, purchase_id, message, sent_at, read_at 
       FROM seller_notifications 
       WHERE seller_id = ?
       ORDER BY sent_at DESC
       LIMIT ?`,
      [user.id, limit],
      env
    );

    // Get unread count
    const unreadResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM seller_notifications WHERE seller_id = ? AND read_at IS NULL`,
      [user.id],
      env
    );

    return NextResponse.json({
      notifications,
      unreadCount: unreadResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: "Failed to get notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seller/notifications/read
 * 
 * Mark notifications as read
 */
export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Authenticate user
    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationIds } = body;

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      const placeholders = notificationIds.map(() => "?").join(", ");
      await execute(
        `UPDATE seller_notifications 
         SET read_at = datetime('now') 
         WHERE seller_id = ? AND id IN (${placeholders}) AND read_at IS NULL`,
        [user.id, ...notificationIds],
        env
      );
    } else {
      // Mark all as read
      await execute(
        `UPDATE seller_notifications SET read_at = datetime('now') WHERE seller_id = ? AND read_at IS NULL`,
        [user.id],
        env
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark notifications read error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
