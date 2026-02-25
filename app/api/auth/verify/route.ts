/**
 * GET /api/auth/verify
 *
 * Verify a magic link token and create a session.
 */

import { NextRequest, NextResponse } from "next/server";
import { completeMagicLinkAuth } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare-context";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/login?error=missing_token", request.url)
    );
  }

  try {
    // Get env from request context
    const env = getEnv();

    if (!env?.AUTH_KV || !env?.DB) {
      console.error("Missing Cloudflare bindings");
      return NextResponse.redirect(
        new URL("/auth/verify?error=server_error", request.url)
      );
    }

    // Verify token and create session
    const result = await completeMagicLinkAuth(token, env);

    if (!result) {
      return NextResponse.redirect(
        new URL("/auth/verify?error=invalid_token", request.url)
      );
    }

    const { session, redirectTo } = result;

    // Build Set-Cookie header manually (vinext compatibility)
    const url = new URL(request.url);
    const maxAge = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    const isIsolatedTech =
      url.hostname === "isolated.tech" ||
      url.hostname.endsWith(".isolated.tech");

    const cookieHeaderParts = [
      `session=${session.id}`,
      "Path=/",
      "HttpOnly",
      "Secure",
      "SameSite=Lax",
      `Max-Age=${maxAge}`,
    ];

    if (isIsolatedTech) {
      cookieHeaderParts.push("Domain=.isolated.tech");
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: new URL(redirectTo, request.url).toString(),
        "Set-Cookie": cookieHeaderParts.join("; "),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(
      new URL("/auth/verify?error=server_error", request.url)
    );
  }
}
