/**
 * GET /api/auth/github
 *
 * Initiate GitHub OAuth flow.
 * Redirects to GitHub authorization page.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import {
  createGitHubClient,
  generateState,
  storeOAuthState,
} from "@/lib/auth/oauth";

export async function GET(request: NextRequest) {
  try {
    const env = getEnv();

    // Use canonical production origin to avoid host mismatches between
    // apex/www/workers.dev during OAuth callback.
    const baseUrl = "https://isolated.tech";

    const github = createGitHubClient(env, baseUrl);

    if (!github) {
      return NextResponse.json(
        { error: "GitHub OAuth not configured" },
        { status: 503 }
      );
    }

    // Generate and store state
    const state = generateState();
    await storeOAuthState(state, "github", env);

    // Create authorization URL
    const authUrl = github.createAuthorizationURL(state, ["user:email"]);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("GitHub OAuth init error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=oauth_failed", request.url)
    );
  }
}
