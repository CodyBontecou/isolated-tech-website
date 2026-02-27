import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { nanoid, queryOne, execute, query } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const PAGE_SIZE = 20;

interface FeatureRequest {
  id: string;
  user_id: string;
  user_name: string | null;
  user_image: string | null;
  app_id: string | null;
  app_name: string | null;
  app_slug: string | null;
  app_icon: string | null;
  type: "feature" | "bug" | "improvement";
  title: string;
  body: string;
  status: "open" | "planned" | "in_progress" | "completed" | "closed";
  vote_count: number;
  comment_count: number;
  created_at: string;
  user_voted: number;
}

/**
 * GET /api/feedback - List feature requests with cursor-based pagination
 * Query params:
 *   - cursor: ID of last item from previous page
 *   - sort: 'votes' | 'newest' | 'comments' (default: votes)
 */
export async function GET(request: Request) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;
  const userId = user?.id || "";

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const sort = url.searchParams.get("sort") || "votes";

  try {
    // Build the ORDER BY clause based on sort
    let orderBy: string;
    let cursorCondition = "";
    const params: unknown[] = [userId];

    switch (sort) {
      case "newest":
        orderBy = "fr.created_at DESC, fr.id DESC";
        if (cursor) {
          // Get cursor item's created_at
          const cursorItem = await queryOne<{ created_at: string }>(
            `SELECT created_at FROM feature_requests WHERE id = ?`,
            [cursor],
            env
          );
          if (cursorItem) {
            cursorCondition = `AND (fr.created_at < ? OR (fr.created_at = ? AND fr.id < ?))`;
            params.push(cursorItem.created_at, cursorItem.created_at, cursor);
          }
        }
        break;
      case "comments":
        orderBy = "fr.comment_count DESC, fr.created_at DESC, fr.id DESC";
        if (cursor) {
          const cursorItem = await queryOne<{ comment_count: number; created_at: string }>(
            `SELECT comment_count, created_at FROM feature_requests WHERE id = ?`,
            [cursor],
            env
          );
          if (cursorItem) {
            cursorCondition = `AND (fr.comment_count < ? OR (fr.comment_count = ? AND fr.created_at < ?) OR (fr.comment_count = ? AND fr.created_at = ? AND fr.id < ?))`;
            params.push(
              cursorItem.comment_count,
              cursorItem.comment_count,
              cursorItem.created_at,
              cursorItem.comment_count,
              cursorItem.created_at,
              cursor
            );
          }
        }
        break;
      case "votes":
      default:
        orderBy = "fr.vote_count DESC, fr.created_at DESC, fr.id DESC";
        if (cursor) {
          const cursorItem = await queryOne<{ vote_count: number; created_at: string }>(
            `SELECT vote_count, created_at FROM feature_requests WHERE id = ?`,
            [cursor],
            env
          );
          if (cursorItem) {
            cursorCondition = `AND (fr.vote_count < ? OR (fr.vote_count = ? AND fr.created_at < ?) OR (fr.vote_count = ? AND fr.created_at = ? AND fr.id < ?))`;
            params.push(
              cursorItem.vote_count,
              cursorItem.vote_count,
              cursorItem.created_at,
              cursorItem.vote_count,
              cursorItem.created_at,
              cursor
            );
          }
        }
        break;
    }

    params.push(PAGE_SIZE + 1); // Fetch one extra to check if there's more

    const items = await query<FeatureRequest>(
      `SELECT 
         fr.id,
         fr.user_id,
         u.name as user_name,
         u.image as user_image,
         fr.app_id,
         a.name as app_name,
         a.slug as app_slug,
         a.icon_url as app_icon,
         fr.type,
         fr.title,
         fr.body,
         fr.status,
         fr.vote_count,
         fr.comment_count,
         fr.created_at,
         COALESCE((SELECT 1 FROM feature_votes fv WHERE fv.request_id = fr.id AND fv.user_id = ?), 0) as user_voted
       FROM feature_requests fr
       JOIN "user" u ON fr.user_id = u.id
       LEFT JOIN apps a ON fr.app_id = a.id
       WHERE fr.status != 'closed' ${cursorCondition}
       ORDER BY ${orderBy}
       LIMIT ?`,
      params,
      env
    );

    const hasMore = items.length > PAGE_SIZE;
    const results = hasMore ? items.slice(0, PAGE_SIZE) : items;
    const nextCursor = hasMore && results.length > 0 ? results[results.length - 1].id : null;

    return new Response(
      JSON.stringify({
        items: results,
        nextCursor,
        hasMore,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("List feedback error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch feedback" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

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
