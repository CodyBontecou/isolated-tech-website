/**
 * GET /api/auth/google/callback
 *
 * Google OAuth callback handler.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { createGoogleClient, linkOAuthAccount, getUserByOAuth } from "@/lib/auth/oauth";
import { createSession } from "@/lib/auth/session";
import { createUser, getUserByEmail } from "@/lib/auth/user";
import { decodeIdToken } from "arctic";

interface GoogleIdToken {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
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

    // Get and verify state
    const stateKey = `oauth_state:${state}`;
    const stateValue = await env.AUTH_KV.get(stateKey);

    if (!stateValue) {
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_state", request.url)
      );
    }

    await env.AUTH_KV.delete(stateKey);

    const stateData = JSON.parse(stateValue);
    if (stateData.provider !== "google") {
      return NextResponse.redirect(
        new URL("/auth/login?error=invalid_state", request.url)
      );
    }

    const google = createGoogleClient(env, baseUrl);
    if (!google) {
      return NextResponse.redirect(
        new URL("/auth/login?error=oauth_not_configured", request.url)
      );
    }

    // Exchange code for tokens
    let tokens;
    try {
      tokens = await google.validateAuthorizationCode(code, stateData.codeVerifier);
    } catch (err) {
      console.error("Google token exchange error:", err);
      return NextResponse.redirect(
        new URL("/auth/login?error=token_exchange_failed", request.url)
      );
    }

    // Decode ID token
    const idToken = tokens.idToken();
    const claims = decodeIdToken(idToken) as GoogleIdToken;

    if (!claims.email) {
      return NextResponse.redirect(
        new URL("/auth/login?error=email_required", request.url)
      );
    }

    // Check if OAuth account already linked
    let userId: string;
    const existingOAuth = await getUserByOAuth("google", claims.sub, env);

    if (existingOAuth) {
      userId = existingOAuth.userId;
    } else {
      const existingUser = await getUserByEmail(claims.email, env);

      if (existingUser) {
        userId = existingUser.id;
        await linkOAuthAccount(userId, "google", claims.sub, env);
      } else {
        const newUser = await createUser(
          {
            email: claims.email,
            name: claims.name || null,
            avatarUrl: claims.picture || null,
          },
          env
        );
        userId = newUser.id;
        await linkOAuthAccount(userId, "google", claims.sub, env);
      }
    }

    // Update avatar if changed
    if (claims.picture) {
      await env.DB.prepare(
        `UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?`
      )
        .bind(claims.picture, new Date().toISOString(), userId)
        .run();
    }

    // Create session
    const session = await createSession(userId, env);
    
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    
    // Set session cookie using Next.js cookies API
    const maxAge = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    const isIsolatedTech = url.hostname === "isolated.tech" || url.hostname.endsWith(".isolated.tech");
    
    response.cookies.set({
      name: "session",
      value: session.id,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge,
      path: "/",
      ...(isIsolatedTech && { domain: ".isolated.tech" }),
    });

    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/auth/login?error=oauth_failed", request.url)
    );
  }
}
