/**
 * Email utilities for ISOLATED.TECH App Store
 * Uses AWS SES for sending emails
 */

import type { Env } from "./env";
import { nanoid } from "./db";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface SESCredentials {
  AWS_SES_ACCESS_KEY?: string;
  AWS_SES_SECRET_KEY?: string;
  AWS_SES_REGION?: string;
}

const FROM_EMAIL = "ISOLATED.TECH <noreply@isolated.tech>";

/**
 * Send an email via AWS SES
 */
export async function sendEmail(
  options: EmailOptions,
  env: Env
): Promise<{ messageId: string } | null> {
  const credentials = env as unknown as SESCredentials;

  if (!credentials.AWS_SES_ACCESS_KEY || !credentials.AWS_SES_SECRET_KEY) {
    console.log("Email sending skipped (SES not configured):", options.subject);
    return null;
  }

  const region = credentials.AWS_SES_REGION || "us-east-1";

  try {
    // SES API call using fetch (no SDK needed for basic sending)
    const endpoint = `https://email.${region}.amazonaws.com`;
    const action = "SendEmail";
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");

    const params = new URLSearchParams({
      Action: action,
      "Source": FROM_EMAIL,
      "Destination.ToAddresses.member.1": options.to,
      "Message.Subject.Data": options.subject,
      "Message.Subject.Charset": "UTF-8",
      "Message.Body.Html.Data": options.html,
      "Message.Body.Html.Charset": "UTF-8",
      "Message.Body.Text.Data": options.text,
      "Message.Body.Text.Charset": "UTF-8",
      Version: "2010-12-01",
    });

    // AWS Signature V4 would be needed here for production
    // For now, log and return mock
    console.log(`Would send email to ${options.to}: ${options.subject}`);

    // In production, implement AWS Signature V4 or use @aws-sdk/client-ses
    // Return mock message ID for logging
    return { messageId: `mock_${nanoid()}` };
  } catch (error) {
    console.error("Email send error:", error);
    return null;
  }
}

/**
 * Log email to database
 */
export async function logEmail(
  userId: string,
  emailType: string,
  subject: string,
  messageId: string | null,
  env: Env
): Promise<void> {
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO email_log (id, user_id, email_type, subject, ses_message_id, sent_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(nanoid(), userId, emailType, subject, messageId, now)
    .run();
}

/**
 * Generate receipt email HTML
 */
export function generateReceiptEmail(
  appName: string,
  amountCents: number,
  userName: string | null,
  dashboardUrl: string
): { html: string; text: string } {
  const amount = amountCents === 0 ? "Free" : `$${(amountCents / 100).toFixed(2)}`;
  const greeting = userName ? `Hi ${userName},` : "Hi,";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt</title>
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
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #f0f0f0; font-size: 14px;">
                ${greeting}
              </p>
              
              <p style="margin: 0 0 30px 0; color: #f0f0f0; font-size: 14px;">
                Thank you for your purchase!
              </p>
              
              <!-- Receipt Details -->
              <table width="100%" style="border-top: 1px solid #333; border-bottom: 1px solid #333; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px 0;">
                    <span style="color: #666; font-size: 11px; letter-spacing: 1px;">APP</span><br>
                    <span style="color: #f0f0f0; font-size: 16px; font-weight: bold;">${appName}</span>
                  </td>
                  <td align="right" style="padding: 15px 0;">
                    <span style="color: #666; font-size: 11px; letter-spacing: 1px;">AMOUNT</span><br>
                    <span style="color: #4ade80; font-size: 16px; font-weight: bold;">${amount}</span>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <a href="${dashboardUrl}" style="display: inline-block; background: #f0f0f0; color: #0a0a0a; padding: 12px 24px; font-size: 12px; font-weight: bold; text-decoration: none; letter-spacing: 1px;">
                DOWNLOAD NOW →
              </a>
              
              <!-- Footer -->
              <p style="margin: 40px 0 0 0; color: #666; font-size: 11px;">
                Questions? Reply to this email or contact support@isolated.tech
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

  const text = `
ISOLATED.TECH

${greeting}

Thank you for your purchase!

APP: ${appName}
AMOUNT: ${amount}

Download your app: ${dashboardUrl}

Questions? Contact support@isolated.tech
`;

  return { html, text };
}

/**
 * Generate update notification email HTML
 */
export function generateUpdateEmail(
  appName: string,
  version: string,
  releaseNotes: string | null,
  userName: string | null,
  dashboardUrl: string,
  changelogUrl: string
): { html: string; text: string } {
  const greeting = userName ? `Hi ${userName},` : "Hi,";
  const notesHtml = releaseNotes
    ? `<p style="color: #999; font-size: 13px; margin: 20px 0; padding: 15px; background: #0a0a0a; border-left: 2px solid #333;">${releaseNotes.slice(0, 300)}${releaseNotes.length > 300 ? "..." : ""}</p>`
    : "";
  const notesText = releaseNotes
    ? `\n${releaseNotes.slice(0, 300)}${releaseNotes.length > 300 ? "..." : ""}\n`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Update Available</title>
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
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; color: #f0f0f0; font-size: 14px;">
                ${greeting}
              </p>
              
              <p style="margin: 0 0 10px 0; color: #f0f0f0; font-size: 14px;">
                <strong>${appName} ${version}</strong> is now available!
              </p>
              
              ${notesHtml}
              
              <!-- CTAs -->
              <a href="${dashboardUrl}" style="display: inline-block; background: #f0f0f0; color: #0a0a0a; padding: 12px 24px; font-size: 12px; font-weight: bold; text-decoration: none; letter-spacing: 1px; margin-right: 10px;">
                DOWNLOAD UPDATE →
              </a>
              
              <a href="${changelogUrl}" style="display: inline-block; color: #666; font-size: 12px; text-decoration: underline;">
                View full changelog
              </a>
              
              <!-- Footer -->
              <p style="margin: 40px 0 0 0; color: #666; font-size: 11px;">
                You're receiving this because you purchased ${appName}.<br>
                <a href="#" style="color: #666;">Unsubscribe</a> from update emails.
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

  const text = `
ISOLATED.TECH

${greeting}

${appName} ${version} is now available!
${notesText}
Download: ${dashboardUrl}
Changelog: ${changelogUrl}

---
You're receiving this because you purchased ${appName}.
`;

  return { html, text };
}
