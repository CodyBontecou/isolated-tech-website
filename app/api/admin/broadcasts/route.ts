/**
 * POST /api/admin/broadcasts
 *
 * Create and optionally send an email broadcast
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { nanoid, query } from "@/lib/db";
import { sendEmail } from "@/lib/email";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
}

function generateBroadcastHtml(body: string): string {
  const html = body
    .split("\n\n")
    .map((p) => `<p style="margin: 0 0 1em 0; color: #f0f0f0; font-size: 14px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              ${html}
              <p style="margin: 40px 0 0 0; color: #666; font-size: 11px;">
                You're receiving this because you're subscribed to ISOLATED.TECH updates.<br>
                <a href="https://isolated.tech/unsubscribe" style="color: #666;">Unsubscribe</a>
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

function generateBroadcastText(body: string): string {
  return `ISOLATED.TECH

${body}

---
You're receiving this because you're subscribed to ISOLATED.TECH updates.
Unsubscribe: https://isolated.tech/unsubscribe
`;
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

    const { subject, body, status, sendNow } = await request.json();

    if (!subject || !body) {
      return NextResponse.json(
        { error: "Subject and body are required" },
        { status: 400 }
      );
    }

    const broadcastId = nanoid();
    const htmlContent = generateBroadcastHtml(body);
    const textContent = generateBroadcastText(body);

    // Get active subscribers
    const subscribers = await query<Subscriber>(
      `SELECT id, email, name FROM subscribers WHERE is_active = 1`,
      [],
      env
    );

    // Create broadcast record
    await env.DB.prepare(
      `INSERT INTO broadcasts (id, subject, html_content, text_content, sent_by, recipient_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        broadcastId,
        subject,
        htmlContent,
        textContent,
        user.id,
        sendNow ? subscribers.length : 0,
        sendNow ? "sending" : "draft"
      )
      .run();

    // Send emails if requested
    if (sendNow && subscribers.length > 0) {
      let sentCount = 0;
      let failedCount = 0;

      // Send to all subscribers (in production, you'd batch this)
      for (const subscriber of subscribers) {
        try {
          const result = await sendEmail(
            {
              to: subscriber.email,
              subject,
              html: htmlContent,
              text: textContent,
            },
            env
          );

          if (result.messageId) {
            sentCount++;
            
            // Log the email
            await env.DB.prepare(
              `INSERT INTO email_log (id, user_id, email, event_type, subject, ses_message_id)
               VALUES (?, ?, ?, 'broadcast', ?, ?)`
            )
              .bind(nanoid(), null, subscriber.email, subject, result.messageId)
              .run();
          } else {
            failedCount++;
            console.error(`Failed to send to ${subscriber.email}:`, result.error);
          }
        } catch (err) {
          failedCount++;
          console.error(`Error sending to ${subscriber.email}:`, err);
        }

        // Rate limiting: small delay between emails to avoid SES throttling
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Update broadcast status
      const finalStatus = failedCount === subscribers.length ? "failed" : "sent";
      await env.DB.prepare(
        `UPDATE broadcasts SET status = ?, sent_at = datetime('now'), recipient_count = ?
         WHERE id = ?`
      )
        .bind(finalStatus, sentCount, broadcastId)
        .run();

      return NextResponse.json({
        id: broadcastId,
        status: finalStatus,
        sent: sentCount,
        failed: failedCount,
      });
    }

    return NextResponse.json({
      id: broadcastId,
      status: "draft",
    });
  } catch (error) {
    console.error("Broadcast error:", error);
    return NextResponse.json(
      { error: "Failed to create broadcast" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/broadcasts
 *
 * List all broadcasts
 */
export async function GET(request: NextRequest) {
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

    const broadcasts = await query(
      `SELECT id, subject, recipient_count, status, sent_at, created_at
       FROM broadcasts
       ORDER BY created_at DESC`,
      [],
      env
    );

    return NextResponse.json({ broadcasts });
  } catch (error) {
    console.error("List broadcasts error:", error);
    return NextResponse.json(
      { error: "Failed to list broadcasts" },
      { status: 500 }
    );
  }
}
