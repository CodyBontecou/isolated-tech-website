/**
 * POST /api/admin/broadcast/test
 *
 * Send a test email to the admin's own email address.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { sendEmail } from "@/lib/email";

async function requireAdmin(request: NextRequest, env: Env) {
  const { user } = await getSessionFromHeaders(request.headers, env);
  if (!user || !user.isAdmin) return null;
  return user;
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
function generateBroadcastEmailHtml(subject: string, body: string): string {
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
              
              <h2 style="margin: 0 0 20px 0; color: #f0f0f0; font-size: 18px;">
                ${subject}
              </h2>
              
              <div style="color: #ccc; font-size: 14px; line-height: 1.6;">
                ${markdownToHtml(body)}
              </div>
              
              <p style="margin: 40px 0 0 0; color: #666; font-size: 11px;">
                — The ISOLATED.TECH Team
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

    const body = await request.json();
    const { subject, body: emailBody } = body;

    if (!subject?.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    if (!emailBody?.trim()) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    // Send test email via SES to the admin test address
    const testEmail = "cody@isolated.tech";
    const result = await sendEmail(
      {
        to: testEmail,
        subject: `[TEST] ${subject}`,
        html: generateBroadcastEmailHtml(subject, emailBody),
        text: emailBody,
      },
      env
    );

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}
