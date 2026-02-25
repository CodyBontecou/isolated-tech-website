/**
 * GET /api/auth/github/callback
 *
 * GitHub OAuth callback handler.
 * Exchanges code for tokens, fetches user info, creates session.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import {
  createGitHubClient,
  verifyOAuthState,
  linkOAuthAccount,
  getUserByOAuth,
} from "@/lib/auth/oauth";
import { createSession, createSessionCookie } from "@/lib/auth/session";
import { createUser, getUserByEmail } from "@/lib/auth/user";

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.redirect(
        new URL("/auth/login?error=server_error", request.url)
      );
    }

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_request", request.url)
      );
    }

    // Verify state
    const validState = await verifyOAuthState(state, "github", env);
    if (!validState) {
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_state", request.url)
      );
    }

    const github = createGitHubClient(env, baseUrl);
    if (!github) {
      return NextResponse.redirect(
        new URL("/auth/login?error=oauth_not_configured", request.url)
      );
    }

    // Exchange code for tokens
    let tokens;
    try {
      tokens = await github.validateAuthorizationCode(code);
    } catch (err) {
      console.error("GitHub token exchange error:", err);
      return NextResponse.redirect(
        new URL("/auth/login?error=token_exchange_failed", request.url)
      );
    }

    // Fetch user info from GitHub
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
        Accept: "application/json",
        "User-Agent": "ISOLATED.TECH",
      },
    });

    if (!userResponse.ok) {
      console.error("GitHub user fetch error:", await userResponse.text());
      return NextResponse.redirect(
        new URL("/auth/login?error=user_fetch_failed", request.url)
      );
    }

    const githubUser: GitHubUser = await userResponse.json();

    // Get email (may need separate request if not public)
    let email = githubUser.email;

    if (!email) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
          Accept: "application/json",
          "User-Agent": "ISOLATED.TECH",
        },
      });

      if (emailsResponse.ok) {
        const emails: GitHubEmail[] = await emailsResponse.json();
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        email = primaryEmail?.email || emails[0]?.email || null;
      }
    }

    if (!email) {
      return NextResponse.redirect(
        new URL("/auth/login?error=email_required", request.url)
      );
    }

    // Check if OAuth account already linked
    let userId: string;
    const existingOAuth = await getUserByOAuth(
      "github",
      githubUser.id.toString(),
      env
    );

    if (existingOAuth) {
      // User already linked
      userId = existingOAuth.userId;
    } else {
      // Check if user with this email exists
      const existingUser = await getUserByEmail(email, env);

      if (existingUser) {
        // Link GitHub to existing user
        userId = existingUser.id;
        await linkOAuthAccount(userId, "github", githubUser.id.toString(), env);
      } else {
        // Create new user
        const newUser = await createUser(
          {
            email,
            name: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
          },
          env
        );
        userId = newUser.id;
        await linkOAuthAccount(userId, "github", githubUser.id.toString(), env);
      }
    }

    // Update avatar if changed
    if (githubUser.avatar_url) {
      await env.DB.prepare(
        `UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?`
      )
        .bind(githubUser.avatar_url, new Date().toISOString(), userId)
        .run();
    }

    // Create session
    const session = await createSession(userId, env);
    const cookie = createSessionCookie(session.id, session.expiresAt, url.hostname);

    // Redirect to dashboard
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error("GitHub OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=oauth_failed", request.url)
    );
  }
}
