/**
 * POST /api/auth/logout
 *
 * Logout the current user by invalidating their session.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSessionIdFromCookies,
  invalidateSession,
  createBlankSessionCookie,
} from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare-context";

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();
    const url = new URL(request.url);

    if (!env?.AUTH_KV || !env?.DB) {
      console.error("Missing Cloudflare bindings");
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // Get session from cookie
    const cookieHeader = request.headers.get("cookie");
    const sessionId = getSessionIdFromCookies(cookieHeader);

    if (sessionId) {
      // Invalidate session
      await invalidateSession(sessionId, env);
    }

    // Clear session cookie
    const response = NextResponse.json({ success: true });
    response.headers.set("Set-Cookie", createBlankSessionCookie(url.hostname));

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}

// Also support GET for simple logout links
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  
  try {
    const env = getEnv();

    if (!env?.AUTH_KV || !env?.DB) {
      const response = NextResponse.redirect(new URL("/", request.url));
      response.headers.set("Set-Cookie", createBlankSessionCookie(url.hostname));
      return response;
    }

    // Get session from cookie
    const cookieHeader = request.headers.get("cookie");
    const sessionId = getSessionIdFromCookies(cookieHeader);

    if (sessionId) {
      await invalidateSession(sessionId, env);
    }

    // Redirect to home with cleared cookie
    const response = NextResponse.redirect(new URL("/", request.url));
    response.headers.set("Set-Cookie", createBlankSessionCookie(url.hostname));

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    const response = NextResponse.redirect(new URL("/", request.url));
    response.headers.set("Set-Cookie", createBlankSessionCookie(url.hostname));
    return response;
  }
}
