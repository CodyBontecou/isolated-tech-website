/**
 * POST /api/admin/broadcast
 *
 * Send broadcast email to selected audience.
 * Requires admin authentication.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { nanoid } from "@/lib/db";
import { sendEmail, logEmail } from "@/lib/email";

async function requireAdmin(request: NextRequest, env: Env) {
  const { user } = await getSessionFromHeaders(request.headers, env);
  if (!user || !user.isAdmin) return null;
  return user;
}

interface BroadcastRequest {
  audience: "newsletter" | "app" | "all";
  appId?: string | null;
  subject: string;
  body: string;
}

/**
 * Convert markdown-style text to simple HTML
 */
function markdownToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

/**
 * Generate broadcast email HTML
 */
function generateBroadcastEmailHtml(
  subject: string,
  body: string,
  recipientName: string | null
): string {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Courier New', monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px;">
              <h1 style="margin: 0 0 30px 0; font-size: 14px; color: #666; letter-spacing: 2px;">
                ISOLATED<span style="color: #fff;">.</span>TECH
              </h1>
              
              <p style="margin: 0 0 20px 0; color: #f0f0f0; font-size: 14px;">
                ${greeting}
              </p>
              
              <div style="color: #ccc; font-size: 14px; line-height: 1.6;">
                ${markdownToHtml(body)}
              </div>
              
              <p style="margin: 40px 0 0 0; color: #666; font-size: 11px;">
                — The ISOLATED.TECH Team
              </p>
              
              <p style="margin: 20px 0 0 0; color: #444; font-size: 10px;">
                <a href="https://isolated.tech/unsubscribe" style="color: #444;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

// SES rate limit: ~14 emails/second for standard accounts
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB) {
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
        recipientQuery = `SELECT id, email, name FROM user WHERE newsletterSubscribed = 1`;
        break;
      case "app":
        recipientQuery = `
          SELECT DISTINCT u.id, u.email, u.name 
          FROM user u
          JOIN purchases p ON p.user_id = u.id
          WHERE p.app_id = ? AND p.status = 'completed'
        `;
        recipientParams = [appId];
        break;
      case "all":
        recipientQuery = `SELECT id, email, name FROM user`;
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

    const broadcastId = nanoid();
    const now = new Date().toISOString();

    console.log(`Starting broadcast ${broadcastId}:`, {
      subject,
      audience,
      appId,
      recipientCount: recipients.length,
      sentBy: user.email,
    });

    // Log the broadcast record
    await env.DB.prepare(
      `INSERT INTO email_log (id, user_id, event_type, subject, sent_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(broadcastId, user.id, `broadcast:${audience}`, subject, now)
      .run();

    // Send emails in batches with rate limiting
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      // Send batch concurrently
      const results = await Promise.all(
        batch.map(async (recipient) => {
          const html = generateBroadcastEmailHtml(subject, emailBody, recipient.name);
          const result = await sendEmail(
            {
              to: recipient.email,
              subject,
              html,
              text: emailBody,
            },
            env
          );

          if (result.messageId) {
            // Log successful send
            await logEmail(
              recipient.id,
              `broadcast:${audience}`,
              subject,
              result.messageId,
              env
            );
            return { success: true, email: recipient.email };
          } else {
            return { success: false, email: recipient.email, error: result.error };
          }
        })
      );

      // Count results
      for (const result of results) {
        if (result.success) {
          successCount++;
        } else {
          failCount++;
          if (errors.length < 5) {
            errors.push(`${result.email}: ${result.error}`);
          }
        }
      }

      // Rate limit delay between batches
      if (i + BATCH_SIZE < recipients.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(`Broadcast ${broadcastId} complete:`, {
      successCount,
      failCount,
    });

    return NextResponse.json({
      success: true,
      broadcast_id: broadcastId,
      sent_count: successCount,
      failed_count: failCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Broadcast sent to ${successCount} of ${recipients.length} recipients`,
    });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to send broadcast" },
      { status: 500 }
    );
  }
}
