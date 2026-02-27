import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { nanoid, queryOne, execute } from "@/lib/db";
import { sendEmail, generateCommentNotificationEmail } from "@/lib/email";
import { checkRateLimit, recordRateLimitAction, RATE_LIMITS } from "@/lib/rate-limit";

interface FeatureRequestWithAuthor {
  id: string;
  user_id: string;
  title: string;
  author_email: string;
  author_name: string | null;
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
    const { requestId, body } = await request.json();

    // Validate
    if (!requestId || !body?.trim()) {
      return new Response(
        JSON.stringify({ error: "Request ID and comment body are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check rate limit (admins exempt)
    if (!user.isAdmin) {
      const rateLimit = await checkRateLimit(user.id, RATE_LIMITS.feedbackComment, env);
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({
            error: `You've reached the daily comment limit (${RATE_LIMITS.feedbackComment.maxPerDay}). Try again tomorrow.`,
            rateLimited: true,
            remaining: rateLimit.remaining,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Check if feature request exists and get author info
    const featureRequest = await queryOne<FeatureRequestWithAuthor>(
      `SELECT fr.id, fr.user_id, fr.title, u.email as author_email, u.name as author_name
       FROM feature_requests fr
       JOIN "user" u ON fr.user_id = u.id
       WHERE fr.id = ?`,
      [requestId],
      env
    );

    if (!featureRequest) {
      return new Response(
        JSON.stringify({ error: "Feature request not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create the comment
    const commentId = nanoid();
    const isAdminReply = user.isAdmin ? 1 : 0;

    await execute(
      `INSERT INTO feature_comments (id, request_id, user_id, body, is_admin_reply)
       VALUES (?, ?, ?, ?, ?)`,
      [commentId, requestId, user.id, body.trim(), isAdminReply],
      env
    );

    // Update comment count
    await execute(
      `UPDATE feature_requests SET comment_count = comment_count + 1, updated_at = datetime('now') WHERE id = ?`,
      [requestId],
      env
    );

    // Record rate limit action (admins exempt)
    if (!user.isAdmin) {
      await recordRateLimitAction(user.id, RATE_LIMITS.feedbackComment.action, env);
    }

    // Send email notification to author (if not commenting on own post)
    if (featureRequest.user_id !== user.id) {
      const feedbackUrl = `https://isolated.tech/feedback/${requestId}`;
      const { html, text } = generateCommentNotificationEmail(
        featureRequest.title,
        user.name || "Someone",
        body.trim(),
        isAdminReply === 1,
        featureRequest.author_name,
        feedbackUrl
      );

      // Send email in the background (don't await)
      sendEmail(
        {
          to: featureRequest.author_email,
          subject: isAdminReply
            ? `Team response on: ${featureRequest.title}`
            : `New comment on: ${featureRequest.title}`,
          html,
          text,
        },
        env
      ).catch((err) => console.error("Failed to send comment notification:", err));
    }

    // Return the new comment with user info
    const newComment = {
      id: commentId,
      user_id: user.id,
      user_name: user.name,
      user_image: user.image,
      body: body.trim(),
      is_admin_reply: isAdminReply,
      created_at: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({ success: true, comment: newComment }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Comment error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to post comment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
