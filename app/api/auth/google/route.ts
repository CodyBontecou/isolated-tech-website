/**
 * GET /api/auth/google
 *
 * Initiate Google OAuth flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import {
  createGoogleClient,
  generateState,
  storeOAuthState,
} from "@/lib/auth/oauth";
import { sanitizeRedirectPath } from "@/lib/auth/redirect";

export async function GET(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const google = createGoogleClient(env, baseUrl);

    if (!google) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 503 }
      );
    }

    const redirectTo = sanitizeRedirectPath(
      request.nextUrl.searchParams.get("redirect")
    );

    // Generate and store state
    const state = generateState();
    const codeVerifier = generateState(); // PKCE code verifier

    await storeOAuthState(state, "google", env, {
      codeVerifier,
      redirectTo,
    });

    // Create authorization URL with PKCE
    const authUrl = google.createAuthorizationURL(state, codeVerifier, [
      "openid",
      "email",
      "profile",
    ]);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Google OAuth init error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=oauth_failed", request.url)
    );
  }
}
