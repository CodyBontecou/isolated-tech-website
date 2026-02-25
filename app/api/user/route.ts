/**
 * DELETE /api/user
 *
 * Delete the current user's account.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import {
  getSessionIdFromCookies,
  validateSession,
  invalidateAllUserSessions,
  createBlankSessionCookie,
} from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  try {
    const env = getEnv();
    const url = new URL(request.url);

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

    // Don't allow admin to delete themselves via this route
    if (user.isAdmin) {
      return NextResponse.json(
        { error: "Admin accounts cannot be deleted via this route" },
        { status: 403 }
      );
    }

    // Invalidate all sessions first
    await invalidateAllUserSessions(user.id, env);

    // Delete in order (respect foreign key constraints):
    // 1. Reviews
    await env.DB.prepare("DELETE FROM reviews WHERE user_id = ?")
      .bind(user.id)
      .run();

    // 2. OAuth accounts
    await env.DB.prepare("DELETE FROM oauth_accounts WHERE user_id = ?")
      .bind(user.id)
      .run();

    // 3. Email log entries (optional - keep for audit trail)
    // await env.DB.prepare("DELETE FROM email_log WHERE user_id = ?")
    //   .bind(user.id)
    //   .run();

    // 4. Anonymize purchases (keep for tax/legal records)
    // We keep the purchase but remove the user association
    await env.DB.prepare(
      "UPDATE purchases SET user_id = 'deleted_user' WHERE user_id = ?"
    )
      .bind(user.id)
      .run();

    // 5. Delete the user
    await env.DB.prepare("DELETE FROM users WHERE id = ?")
      .bind(user.id)
      .run();

    // Clear session cookie
    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", createBlankSessionCookie(url.hostname));

    return response;
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
