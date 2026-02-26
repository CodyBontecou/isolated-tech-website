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

/**
 * Generate source code download email HTML
 * Includes one-time download link
 */
export function generateSourceCodeEmail(
  appName: string,
  amountCents: number,
  userName: string | null,
  downloadUrl: string,
  expiresInDays: number = 7
): { html: string; text: string } {
  const amount = amountCents === 0 ? "Free" : `$${(amountCents / 100).toFixed(2)}`;
  const greeting = userName ? `Hi ${userName},` : "Hi,";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Source Code Download</title>
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
                Thank you for your purchase! Here's your source code download.
              </p>
              
              <!-- Receipt Details -->
              <table width="100%" style="border-top: 1px solid #333; border-bottom: 1px solid #333; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px 0;">
                    <span style="color: #666; font-size: 11px; letter-spacing: 1px;">SOURCE CODE</span><br>
                    <span style="color: #f0f0f0; font-size: 16px; font-weight: bold;">${appName}</span>
                  </td>
                  <td align="right" style="padding: 15px 0;">
                    <span style="color: #666; font-size: 11px; letter-spacing: 1px;">AMOUNT</span><br>
                    <span style="color: #4ade80; font-size: 16px; font-weight: bold;">${amount}</span>
                  </td>
                </tr>
              </table>
              
              <!-- CTA -->
              <a href="${downloadUrl}" style="display: inline-block; background: #4ade80; color: #0a0a0a; padding: 14px 28px; font-size: 13px; font-weight: bold; text-decoration: none; letter-spacing: 1px;">
                ↓ DOWNLOAD SOURCE CODE
              </a>
              
              <!-- Warning -->
              <div style="margin-top: 25px; padding: 15px; background: #0a0a0a; border-left: 3px solid #f59e0b;">
                <p style="margin: 0; color: #f59e0b; font-size: 11px; letter-spacing: 0.5px;">
                  ⚠️ ONE-TIME LINK
                </p>
                <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">
                  This download link can only be used once and expires in ${expiresInDays} days.<br>
                  Save the file after downloading.
                </p>
              </div>
              
              <!-- What's included -->
              <div style="margin-top: 25px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 11px; letter-spacing: 1px;">
                  WHAT'S INCLUDED
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #999; font-size: 12px; line-height: 1.8;">
                  <li>Complete Xcode project</li>
                  <li>All source files and assets</li>
                  <li>Build instructions in README</li>
                </ul>
              </div>
              
              <!-- Footer -->
              <p style="margin: 40px 0 0 0; color: #666; font-size: 11px;">
                Need help? Reply to this email or contact support@isolated.tech
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

Thank you for your purchase! Here's your source code download.

SOURCE CODE: ${appName}
AMOUNT: ${amount}

DOWNLOAD: ${downloadUrl}

⚠️ ONE-TIME LINK
This download link can only be used once and expires in ${expiresInDays} days.
Save the file after downloading.

WHAT'S INCLUDED:
- Complete Xcode project
- All source files and assets
- Build instructions in README

Need help? Contact support@isolated.tech
`;

  return { html, text };
}
