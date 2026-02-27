import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { nanoid, queryOne, execute } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { appId, appVersion, type, subject, feedbackBody } = body;

    // Validate required fields
    if (!appId || !subject || !feedbackBody) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate type
    const feedbackType = type === "bug" ? "bug" : "feedback";

    // Verify user owns this app
    const purchase = await queryOne(
      `SELECT p.id FROM purchases p
       WHERE p.user_id = ? AND p.app_id = ? AND p.status = 'completed'`,
      [user.id, appId],
      env
    );

    if (!purchase) {
      return new Response(
        JSON.stringify({ error: "You don't own this app" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get app info for the email
    const app = await queryOne<{ name: string; slug: string }>(
      `SELECT name, slug FROM apps WHERE id = ?`,
      [appId],
      env
    );

    if (!app) {
      return new Response(JSON.stringify({ error: "App not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create feedback record
    const feedbackId = nanoid();
    await execute(
      `INSERT INTO feedback (id, user_id, app_id, app_version, type, subject, body, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
      [feedbackId, user.id, appId, appVersion || null, feedbackType, subject, feedbackBody],
      env
    );

    // Send email notification to admin
    const typeLabel = feedbackType === "bug" ? "🐛 Bug Report" : "💬 Feedback";
    const versionInfo = appVersion ? ` (v${appVersion})` : "";
    
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeLabel}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Courier New', monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; border: 1px solid #333;">
          <tr>
            <td style="padding: 30px;">
              <!-- Header -->
              <h1 style="margin: 0 0 30px 0; font-size: 14px; color: #666; letter-spacing: 2px;">
                ISOLATED<span style="color: #fff;">.</span>TECH
              </h1>
              
              <h2 style="margin: 0 0 20px 0; color: ${feedbackType === "bug" ? "#f87171" : "#60a5fa"}; font-size: 16px;">
                ${typeLabel}
              </h2>
              
              <!-- Details -->
              <table width="100%" style="border-top: 1px solid #333; border-bottom: 1px solid #333; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 15px 0;">
                    <span style="color: #666; font-size: 11px; letter-spacing: 1px;">APP</span><br>
                    <span style="color: #f0f0f0; font-size: 14px;">${app.name}${versionInfo}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 15px 0;">
                    <span style="color: #666; font-size: 11px; letter-spacing: 1px;">FROM</span><br>
                    <span style="color: #f0f0f0; font-size: 14px;">${user.name || "Anonymous"} &lt;${user.email}&gt;</span>
                  </td>
                </tr>
              </table>
              
              <!-- Subject -->
              <p style="margin: 0 0 10px 0; color: #666; font-size: 11px; letter-spacing: 1px;">SUBJECT</p>
              <p style="margin: 0 0 20px 0; color: #f0f0f0; font-size: 14px; font-weight: bold;">${subject}</p>
              
              <!-- Body -->
              <p style="margin: 0 0 10px 0; color: #666; font-size: 11px; letter-spacing: 1px;">MESSAGE</p>
              <div style="color: #ccc; font-size: 13px; line-height: 1.6; padding: 15px; background: #0a0a0a; border-left: 2px solid ${feedbackType === "bug" ? "#f87171" : "#60a5fa"};">
                ${feedbackBody.replace(/\n/g, "<br>")}
              </div>
              
              <!-- CTA -->
              <a href="https://isolated.tech/admin/feedback" style="display: inline-block; background: #f0f0f0; color: #0a0a0a; padding: 12px 24px; font-size: 12px; font-weight: bold; text-decoration: none; letter-spacing: 1px; margin-top: 25px;">
                VIEW IN ADMIN →
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const emailText = `
${typeLabel}

APP: ${app.name}${versionInfo}
FROM: ${user.name || "Anonymous"} <${user.email}>

SUBJECT: ${subject}

MESSAGE:
${feedbackBody}

---
View in admin: https://isolated.tech/admin/feedback
`;

    // Send email to admin
    await sendEmail(
      {
        to: "cody@isolated.tech",
        subject: `${typeLabel}: ${subject} — ${app.name}`,
        html: emailHtml,
        text: emailText,
      },
      env
    );

    return new Response(
      JSON.stringify({ success: true, id: feedbackId }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Feedback submission error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to submit feedback" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
