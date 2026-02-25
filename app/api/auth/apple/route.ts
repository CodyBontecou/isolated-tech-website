/**
 * GET /api/auth/apple
 *
 * Initiate Apple Sign In flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { createAppleClient, generateState, storeOAuthState } from "@/lib/auth/oauth";

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

    const apple = createAppleClient(env, baseUrl);

    if (!apple) {
      return NextResponse.json(
        { error: "Apple Sign In not configured" },
        { status: 503 }
      );
    }

    // Generate and store state
    const state = generateState();
    await storeOAuthState(state, "apple", env);

    // Create authorization URL
    const authUrl = apple.createAuthorizationURL(state, ["email", "name"]);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Apple OAuth init error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=oauth_failed", request.url)
    );
  }
}
