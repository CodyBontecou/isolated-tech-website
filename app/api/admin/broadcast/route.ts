/**
 * POST /api/admin/broadcast
 *
 * Send broadcast email to selected audience.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionIdFromCookies, validateSession } from "@/lib/auth";
import { nanoid } from "@/lib/db";

async function requireAdmin(request: NextRequest, env: Env) {
  const cookieHeader = request.headers.get("cookie");
  const sessionId = getSessionIdFromCookies(cookieHeader);

  if (!sessionId) return null;

  const { user } = await validateSession(sessionId, env);
  if (!user || !user.isAdmin) return null;

  return user;
}

interface BroadcastRequest {
  audience: "newsletter" | "app" | "all";
  appId?: string | null;
  subject: string;
  body: string;
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

    const body: BroadcastRequest = await request.json();
    const { audience, appId, subject, body: emailBody } = body;

    // Validate
    if (!subject?.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    if (!emailBody?.trim()) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    if (!["newsletter", "app", "all"].includes(audience)) {
      return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    }

    if (audience === "app" && !appId) {
      return NextResponse.json({ error: "App ID required for app audience" }, { status: 400 });
    }

    // Get recipients based on audience
    let recipientQuery: string;
    let recipientParams: unknown[] = [];

    switch (audience) {
      case "newsletter":
        recipientQuery = `SELECT id, email, name FROM users WHERE newsletter_subscribed = 1`;
        break;
      case "app":
        recipientQuery = `
          SELECT DISTINCT u.id, u.email, u.name 
          FROM users u
          JOIN purchases p ON p.user_id = u.id
          WHERE p.app_id = ? AND p.status = 'completed'
        `;
        recipientParams = [appId];
        break;
      case "all":
        recipientQuery = `SELECT id, email, name FROM users`;
        break;
      default:
        return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    }

    const { results: recipients } = await env.DB.prepare(recipientQuery)
      .bind(...recipientParams)
      .all<{ id: string; email: string; name: string | null }>();

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients found for this audience" },
        { status: 400 }
      );
    }

    // Log broadcast (email sending requires SES credentials)
    const broadcastId = nanoid();
    const now = new Date().toISOString();

    // For now, we just log the broadcast - actual sending requires SES
    // In production, this would queue emails for background sending
    console.log(`Broadcast ${broadcastId}:`, {
      subject,
      audience,
      appId,
      recipientCount: recipients.length,
      sentBy: user.email,
    });

    // Log to email_log table (as a record of the broadcast)
    await env.DB.prepare(
      `INSERT INTO email_log (id, user_id, email_type, subject, sent_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(broadcastId, user.id, `broadcast:${audience}`, subject, now)
      .run();

    // TODO: Integrate with AWS SES when credentials are available
    // For each recipient:
    // - Send email via SES
    // - Log individual send in email_log
    // - Handle rate limiting (batch with delays)

    return NextResponse.json({
      success: true,
      broadcast_id: broadcastId,
      sent_count: recipients.length,
      message: `Broadcast queued for ${recipients.length} recipients (email sending requires SES credentials)`,
    });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to send broadcast" },
      { status: 500 }
    );
  }
}
