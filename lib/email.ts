/**
 * Email utilities for ISOLATED.TECH App Store
 * Uses AWS SES for sending emails with proper Signature V4 authentication
 */

import type { Env } from "./env";
import { nanoid } from "./db";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const FROM_EMAIL = "ISOLATED.TECH <noreply@isolated.tech>";
const SES_REGION = "us-east-1";

/**
 * Create HMAC-SHA256 signature using Web Crypto API
 */
async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
}

/**
 * Create SHA-256 hash
 */
async function sha256(message: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert ArrayBuffer to hex string
 */
function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Get AWS Signature V4 signing key
 */
async function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

/**
 * Send an email via AWS SES using Signature V4
 */
export async function sendEmail(
  options: EmailOptions,
  env: Env
): Promise<{ messageId: string; error?: undefined } | { error: string; messageId?: undefined }> {
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.error("Email sending skipped - AWS credentials not configured");
    console.error("Missing:", !accessKeyId ? "AWS_ACCESS_KEY_ID" : "", !secretAccessKey ? "AWS_SECRET_ACCESS_KEY" : "");
    return { error: "AWS credentials not configured" };
  }

  const service = "ses";
  const host = `email.${SES_REGION}.amazonaws.com`;
  const endpoint = `https://${host}`;

  // Build the request body
  const params = new URLSearchParams({
    Action: "SendEmail",
    Source: FROM_EMAIL,
    "Destination.ToAddresses.member.1": options.to,
    "Message.Subject.Data": options.subject,
    "Message.Subject.Charset": "UTF-8",
    "Message.Body.Html.Data": options.html,
    "Message.Body.Html.Charset": "UTF-8",
    "Message.Body.Text.Data": options.text,
    "Message.Body.Text.Charset": "UTF-8",
    Version: "2010-12-01",
  });

  const body = params.toString();
  const method = "POST";
  const contentType = "application/x-www-form-urlencoded; charset=utf-8";

  // Create date strings
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  // Create canonical request
  const canonicalUri = "/";
  const canonicalQuerystring = "";
  const payloadHash = await sha256(body);
  
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
  ].join("\n") + "\n";
  
  const signedHeaders = "content-type;host;x-amz-date";

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // Create string to sign
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${SES_REGION}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    await sha256(canonicalRequest),
  ].join("\n");

  // Create signature
  const signingKey = await getSigningKey(secretAccessKey, dateStamp, SES_REGION, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  // Create authorization header
  const authorizationHeader = [
    `${algorithm} Credential=${accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  try {
    console.log(`Sending email to ${options.to}: ${options.subject}`);
    
    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": contentType,
        "X-Amz-Date": amzDate,
        Authorization: authorizationHeader,
      },
      body,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("SES API error:", response.status, responseText);
      // Parse SES error message from XML
      const errorMatch = responseText.match(/<Message>([^<]+)<\/Message>/);
      const errorMessage = errorMatch ? errorMatch[1] : `SES error ${response.status}`;
      return { error: errorMessage };
    }

    // Parse message ID from XML response
    const messageIdMatch = responseText.match(/<MessageId>([^<]+)<\/MessageId>/);
    const messageId = messageIdMatch ? messageIdMatch[1] : `ses_${nanoid()}`;

    console.log(`Email sent successfully. MessageId: ${messageId}`);
    return { messageId };
  } catch (error) {
    console.error("Email send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown email error";
    return { error: errorMessage };
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
    `INSERT INTO email_log (id, user_id, event_type, subject, ses_message_id, sent_at)
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
/**
 * Generate feedback status change email HTML
 */
export function generateFeedbackStatusEmail(
  requestTitle: string,
  oldStatus: string,
  newStatus: string,
  adminResponse: string | null,
  userName: string | null,
  feedbackUrl: string
): { html: string; text: string } {
  const greeting = userName ? `Hi ${userName},` : "Hi,";
  const statusLabel = newStatus.replace("_", " ").toUpperCase();
  const statusColors: Record<string, string> = {
    open: "#3b82f6",
    planned: "#f59e0b",
    in_progress: "#8b5cf6",
    completed: "#22c55e",
    closed: "#6b7280",
  };
  const statusColor = statusColors[newStatus] || "#3b82f6";

  const responseHtml = adminResponse
    ? `<div style="margin: 20px 0; padding: 15px; background: #0a0a0a; border-left: 2px solid ${statusColor};">
        <p style="margin: 0 0 8px 0; color: #666; font-size: 11px; letter-spacing: 1px;">OFFICIAL RESPONSE</p>
        <p style="margin: 0; color: #f0f0f0; font-size: 13px; line-height: 1.6;">${adminResponse.replace(/\n/g, "<br>")}</p>
      </div>`
    : "";

  const responseText = adminResponse ? `\nOfficial Response:\n${adminResponse}\n` : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Status Update</title>
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
              
              <p style="margin: 0 0 20px 0; color: #f0f0f0; font-size: 14px;">${greeting}</p>
              
              <p style="margin: 0 0 20px 0; color: #f0f0f0; font-size: 14px;">
                Your feedback request has been updated:
              </p>
              
              <table width="100%" style="border-top: 1px solid #333; border-bottom: 1px solid #333; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 15px 0;">
                    <span style="color: #666; font-size: 11px; letter-spacing: 1px;">REQUEST</span><br>
                    <span style="color: #f0f0f0; font-size: 14px; font-weight: bold;">${requestTitle}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 0 15px 0;">
                    <span style="color: #666; font-size: 11px; letter-spacing: 1px;">STATUS</span><br>
                    <span style="color: ${statusColor}; font-size: 14px; font-weight: bold;">${statusLabel}</span>
                  </td>
                </tr>
              </table>
              
              ${responseHtml}
              
              <a href="${feedbackUrl}" style="display: inline-block; background: #f0f0f0; color: #0a0a0a; padding: 12px 24px; font-size: 12px; font-weight: bold; text-decoration: none; letter-spacing: 1px; margin-top: 15px;">
                VIEW REQUEST →
              </a>
              
              <p style="margin: 40px 0 0 0; color: #666; font-size: 11px;">
                You're receiving this because you submitted this feedback request.
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

Your feedback request has been updated:

REQUEST: ${requestTitle}
STATUS: ${statusLabel}
${responseText}
View request: ${feedbackUrl}

---
You're receiving this because you submitted this feedback request.
`;

  return { html, text };
}

/**
 * Generate new comment notification email HTML
 */
export function generateCommentNotificationEmail(
  requestTitle: string,
  commenterName: string,
  commentBody: string,
  isAdminReply: boolean,
  userName: string | null,
  feedbackUrl: string
): { html: string; text: string } {
  const greeting = userName ? `Hi ${userName},` : "Hi,";
  const replyLabel = isAdminReply ? "TEAM RESPONSE" : "NEW COMMENT";
  const replyColor = isAdminReply ? "#22c55e" : "#60a5fa";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${replyLabel}</title>
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
              
              <p style="margin: 0 0 20px 0; color: #f0f0f0; font-size: 14px;">${greeting}</p>
              
              <p style="margin: 0 0 20px 0; color: #f0f0f0; font-size: 14px;">
                ${isAdminReply ? "The team responded to" : `${commenterName} commented on`} your feedback request:
              </p>
              
              <table width="100%" style="border-top: 1px solid #333; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 15px 0;">
                    <span style="color: #666; font-size: 11px; letter-spacing: 1px;">REQUEST</span><br>
                    <span style="color: #f0f0f0; font-size: 14px; font-weight: bold;">${requestTitle}</span>
                  </td>
                </tr>
              </table>
              
              <div style="margin: 0 0 20px 0; padding: 15px; background: #0a0a0a; border-left: 2px solid ${replyColor};">
                <p style="margin: 0 0 8px 0; color: ${replyColor}; font-size: 11px; letter-spacing: 1px; font-weight: 600;">
                  ${isAdminReply ? "🏷️ " : ""}${commenterName.toUpperCase()}
                </p>
                <p style="margin: 0; color: #ccc; font-size: 13px; line-height: 1.6;">${commentBody.replace(/\n/g, "<br>")}</p>
              </div>
              
              <a href="${feedbackUrl}" style="display: inline-block; background: #f0f0f0; color: #0a0a0a; padding: 12px 24px; font-size: 12px; font-weight: bold; text-decoration: none; letter-spacing: 1px;">
                VIEW DISCUSSION →
              </a>
              
              <p style="margin: 40px 0 0 0; color: #666; font-size: 11px;">
                You're receiving this because you submitted this feedback request.
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

${isAdminReply ? "The team responded to" : `${commenterName} commented on`} your feedback request:

REQUEST: ${requestTitle}

${commenterName}:
${commentBody}

View discussion: ${feedbackUrl}

---
You're receiving this because you submitted this feedback request.
`;

  return { html, text };
}

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


