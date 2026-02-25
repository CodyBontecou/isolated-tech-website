/**
 * GET /api/auth/apple
 *
 * Initiate Apple Sign In flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { createAppleClient, generateState, storeOAuthState } from "@/lib/auth/oauth";
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

    const apple = createAppleClient(env, baseUrl);

    if (!apple) {
      return NextResponse.json(
        { error: "Apple Sign In not configured" },
        { status: 503 }
      );
    }

    const redirectTo = sanitizeRedirectPath(
      request.nextUrl.searchParams.get("redirect")
    );

    // Generate and store state
    const state = generateState();
    await storeOAuthState(state, "apple", env, {
      redirectTo,
    });

    // Create authorization URL
    // Apple requires response_mode=form_post when requesting name/email scopes.
    const authUrl = apple.createAuthorizationURL(state, ["email", "name"]);
    authUrl.searchParams.set("response_mode", "form_post");

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Apple OAuth init error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=oauth_failed", request.url)
    );
  }
}
