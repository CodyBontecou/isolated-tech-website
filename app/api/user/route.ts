/**
 * DELETE /api/user
 *
 * Delete the current user's account.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";

export async function DELETE(request: NextRequest) {
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

    // Don't allow admin to delete themselves via this route
    if (user.isAdmin) {
      return NextResponse.json(
        { error: "Admin accounts cannot be deleted via this route" },
        { status: 403 }
      );
    }

    // Delete Better Auth sessions for this user
    await env.DB.prepare('DELETE FROM "session" WHERE "userId" = ?')
      .bind(user.id)
      .run();

    // Delete Better Auth accounts for this user
    await env.DB.prepare('DELETE FROM "account" WHERE "userId" = ?')
      .bind(user.id)
      .run();

    // Delete reviews
    await env.DB.prepare("DELETE FROM reviews WHERE user_id = ?")
      .bind(user.id)
      .run();

    // Delete from old oauth_accounts table (if still exists)
    await env.DB.prepare("DELETE FROM oauth_accounts WHERE user_id = ?")
      .bind(user.id)
      .run();

    // Anonymize purchases (keep for tax/legal records)
    await env.DB.prepare(
      "UPDATE purchases SET user_id = 'deleted_user' WHERE user_id = ?"
    )
      .bind(user.id)
      .run();

    // Delete from old users table
    await env.DB.prepare("DELETE FROM users WHERE id = ?")
      .bind(user.id)
      .run();

    // Delete the Better Auth user
    await env.DB.prepare('DELETE FROM "user" WHERE id = ?')
      .bind(user.id)
      .run();

    // Create response with cleared cookie
    const response = NextResponse.json({ success: true });
    
    // Clear the session cookie
    response.headers.set(
      "Set-Cookie",
      "isolated.session_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    );

    return response;
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
