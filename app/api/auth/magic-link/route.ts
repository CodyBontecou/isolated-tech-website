/**
 * POST /api/auth/magic-link
 *
 * Send a magic link email for passwordless authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createMagicLinkToken,
  checkMagicLinkRateLimit,
  getMagicLinkUrl,
} from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare-context";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    // Get env from request context (vinext/Cloudflare Workers pattern)
    const env = getEnv();

    if (!env?.AUTH_KV || !env?.DB) {
      console.error("Missing Cloudflare bindings");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const email = body.email?.toLowerCase()?.trim();

    // Validate email
    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Check rate limit
    const allowed = await checkMagicLinkRateLimit(email, env);
    if (!allowed) {
      return NextResponse.json(
        { error: "Please wait before requesting another magic link." },
        { status: 429 }
      );
    }

    // Generate token
    const token = await createMagicLinkToken(email, env);

    // Get base URL
    const baseUrl = env.APP_URL || new URL(request.url).origin;
    const magicLinkUrl = getMagicLinkUrl(token, baseUrl);

    // TODO: Send email via AWS SES
    // For now, log the magic link (development mode)
    console.log(`[MAGIC LINK] ${email}: ${magicLinkUrl}`);

    // In production, send email
    // await sendMagicLinkEmail(email, magicLinkUrl, env);

    return NextResponse.json({
      success: true,
      message: "Magic link sent. Check your email.",
      // Include link in dev mode for testing
      ...(process.env.NODE_ENV === "development" && { link: magicLinkUrl }),
    });
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json(
      { error: "Failed to send magic link. Please try again." },
      { status: 500 }
    );
  }
}
