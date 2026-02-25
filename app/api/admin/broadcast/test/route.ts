/**
 * POST /api/admin/broadcast/test
 *
 * Send a test email to the admin's own email address.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionIdFromCookies, validateSession } from "@/lib/auth";

async function requireAdmin(request: NextRequest, env: Env) {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) return null;

  const { user } = await validateSession(sessionId, env);
  if (!user || !user.isAdmin) return null;

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const user = await requireAdmin(request, env);
    if (!user) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { subject, body: emailBody } = body;

    if (!subject?.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    if (!emailBody?.trim()) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    // Log test email (actual sending requires SES)
    console.log(`Test email to ${user.email}:`, {
      subject,
      bodyLength: emailBody.length,
    });

    // TODO: Send actual email via SES when credentials are available
    // await sendEmail({
    //   to: user.email,
    //   subject: `[TEST] ${subject}`,
    //   body: emailBody,
    // });

    return NextResponse.json({
      success: true,
      message: `Test email would be sent to ${user.email} (requires SES credentials)`,
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
