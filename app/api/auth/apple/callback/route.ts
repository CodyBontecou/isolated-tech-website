/**
 * POST /api/auth/apple/callback
 *
 * Apple Sign In callback handler.
 * Note: Apple uses POST, not GET for the callback!
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { createAppleClient, verifyOAuthState, linkOAuthAccount, getUserByOAuth } from "@/lib/auth/oauth";
import { createSession, createSessionCookie } from "@/lib/auth/session";
import { createUser, getUserByEmail } from "@/lib/auth/user";
import { decodeIdToken } from "arctic";

interface AppleIdToken {
  sub: string;
  email: string;
  email_verified: string | boolean;
}

interface AppleUser {
  name?: {
    firstName?: string;
    lastName?: string;
  };
  email?: string;
}

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.redirect(
        new URL("/auth/login?error=server_error", request.url)
      );
    }

    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Apple sends form data
    const formData = await request.formData();
    const code = formData.get("code") as string | null;
    const state = formData.get("state") as string | null;
    const userStr = formData.get("user") as string | null; // Only on first auth

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_request", request.url)
      );
    }

    // Verify state
    const validState = await verifyOAuthState(state, "apple", env);
    if (!validState) {
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_state", request.url)
      );
    }

    const apple = createAppleClient(env, baseUrl);
    if (!apple) {
      return NextResponse.redirect(
        new URL("/auth/login?error=oauth_not_configured", request.url)
      );
    }

    // Exchange code for tokens
    let tokens;
    try {
      tokens = await apple.validateAuthorizationCode(code);
    } catch (err) {
      console.error("Apple token exchange error:", err);
      return NextResponse.redirect(
        new URL("/auth/login?error=token_exchange_failed", request.url)
      );
    }

    // Decode ID token
    const idToken = tokens.idToken();
    const claims = decodeIdToken(idToken) as AppleIdToken;

    if (!claims.email) {
      return NextResponse.redirect(
        new URL("/auth/login?error=email_required", request.url)
      );
    }

    // Parse user info (only provided on first auth)
    let userName: string | null = null;
    if (userStr) {
      try {
        const user: AppleUser = JSON.parse(userStr);
        if (user.name) {
          userName = [user.name.firstName, user.name.lastName]
            .filter(Boolean)
            .join(" ") || null;
        }
      } catch (e) {
        console.warn("Failed to parse Apple user data:", e);
      }
    }

    // Check if OAuth account already linked
    let userId: string;
    const existingOAuth = await getUserByOAuth("apple", claims.sub, env);

    if (existingOAuth) {
      userId = existingOAuth.userId;
    } else {
      const existingUser = await getUserByEmail(claims.email, env);

      if (existingUser) {
        userId = existingUser.id;
        await linkOAuthAccount(userId, "apple", claims.sub, env);

        // Update name if we got it and user doesn't have one
        if (userName && !existingUser.name) {
          await env.DB.prepare(
            `UPDATE users SET name = ?, updated_at = ? WHERE id = ?`
          )
            .bind(userName, new Date().toISOString(), userId)
            .run();
        }
      } else {
        const newUser = await createUser(
          {
            email: claims.email,
            name: userName,
          },
          env
        );
        userId = newUser.id;
        await linkOAuthAccount(userId, "apple", claims.sub, env);
      }
    }

    // Create session
    const session = await createSession(userId, env);
    const cookie = createSessionCookie(session.id, session.expiresAt, url.hostname);

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.headers.set("Set-Cookie", cookie);

    return response;
  } catch (error) {
    console.error("Apple OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=oauth_failed", request.url)
    );
  }
}
