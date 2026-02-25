/**
 * PUT /api/user/profile
 *
 * Update user profile (display name).
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
    const { name } = body;

    // Validate
    if (name !== undefined && typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    // Sanitize name (trim, limit length)
    const sanitizedName = name?.trim().slice(0, 100) || null;

    // Update user
    await updateUser(user.id, { name: sanitizedName }, env);

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
