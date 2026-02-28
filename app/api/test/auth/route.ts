/**
 * Test Authentication Endpoint
 * 
 * ONLY AVAILABLE IN DEVELOPMENT MODE
 * Creates authenticated sessions for E2E testing without requiring magic links
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { createAuth } from "@/lib/auth";

// Only allow in development/test mode
const IS_TEST_ENV = process.env.NODE_ENV !== "production";

export async function POST(request: NextRequest): Promise<Response> {
  // Security: Block in production
  if (!IS_TEST_ENV) {
    return NextResponse.json(
      { error: "Test endpoints are not available in production" },
      { status: 403 }
    );
  }

  const env = getEnv();
  if (!env?.DB) {
    return NextResponse.json({ error: "Database not available" }, { status: 500 });
  }

  try {
    const { email, isAdmin } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists, create if not
    let user = await env.DB.prepare(
      `SELECT id, email, name, isAdmin FROM "user" WHERE email = ?`
    ).bind(email).first<{ id: string; email: string; name: string | null; isAdmin: number }>();

    if (!user) {
      const userId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await env.DB.prepare(
        `INSERT INTO "user" (id, email, name, emailVerified, isAdmin, createdAt, updatedAt)
         VALUES (?, ?, ?, 1, ?, datetime('now'), datetime('now'))`
      ).bind(userId, email, email.split("@")[0], isAdmin ? 1 : 0).run();

      user = { id: userId, email, name: email.split("@")[0], isAdmin: isAdmin ? 1 : 0 };
    } else if (isAdmin && !user.isAdmin) {
      // Promote to admin if requested
      await env.DB.prepare(
        `UPDATE "user" SET isAdmin = 1 WHERE id = ?`
      ).bind(user.id).run();
      user.isAdmin = 1;
    }

    // Create a session directly using Better Auth
    const auth = createAuth(env);
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Insert session into Better Auth session table
    await env.DB.prepare(
      `INSERT INTO "session" (id, userId, token, expiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      crypto.randomUUID(),
      user.id,
      sessionToken,
      expiresAt.toISOString()
    ).run();

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin === 1,
      },
    });

    // Set the session cookie (Better Auth uses "isolated.session_token")
    response.cookies.set("isolated.session_token", sessionToken, {
      httpOnly: true,
      secure: false, // Allow in development
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Test auth error:", error);
    return NextResponse.json(
      { error: "Failed to create test session" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  if (!IS_TEST_ENV) {
    return NextResponse.json(
      { error: "Test endpoints are not available in production" },
      { status: 403 }
    );
  }

  // Clear the session cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set("isolated.session_token", "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
