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
} from "@/lib/auth/oauth";

export async function GET(request: NextRequest) {
  try {
    const env = getEnv();

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const google = createGoogleClient(env, baseUrl);

    if (!google) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 503 }
      );
    }

    // Generate and store state
    const state = generateState();
    const codeVerifier = generateState(); // PKCE code verifier
    
    await env.AUTH_KV.put(
      `oauth_state:${state}`,
      JSON.stringify({ provider: "google", codeVerifier, createdAt: Date.now() }),
      { expirationTtl: 600 }
    );

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
