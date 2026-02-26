/**
 * PUT /api/user/profile
 *
 * Update user profile (display name).
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
    const { name } = body;

    // Validate
    if (name !== undefined && typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    // Sanitize name (trim, limit length)
    const sanitizedName = name?.trim().slice(0, 100) || null;
    const now = new Date().toISOString();

    // Update user in Better Auth table
    await env.DB.prepare(
      'UPDATE "user" SET name = ?, "updatedAt" = ? WHERE id = ?'
    )
      .bind(sanitizedName, now, user.id)
      .run();

    // Also update old users table for compatibility
    await env.DB.prepare(
      "UPDATE users SET name = ?, updated_at = ? WHERE id = ?"
    )
      .bind(sanitizedName, now, user.id)
      .run();

    return NextResponse.json({
      success: true,
      user: { ...user, name: sanitizedName },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
