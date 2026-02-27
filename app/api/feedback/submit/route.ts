import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { nanoid, queryOne, execute } from "@/lib/db";
import { checkRateLimit, recordRateLimitAction, RATE_LIMITS } from "@/lib/rate-limit";

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
    const { type, appId, title, body } = await request.json();

    // Validate required fields
    if (!title?.trim() || !body?.trim()) {
      return new Response(
        JSON.stringify({ error: "Title and description are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check rate limit (admins exempt)
    if (!user.isAdmin) {
      const rateLimit = await checkRateLimit(user.id, RATE_LIMITS.feedbackSubmission, env);
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({
            error: `You've reached the daily submission limit (${RATE_LIMITS.feedbackSubmission.maxPerDay}). Try again tomorrow.`,
            rateLimited: true,
            remaining: rateLimit.remaining,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Validate type
    const validTypes = ["feature", "bug", "improvement"];
    const feedbackType = validTypes.includes(type) ? type : "feature";

    // Validate title length
    if (title.trim().length > 200) {
      return new Response(
        JSON.stringify({ error: "Title must be 200 characters or less" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // If appId provided, verify it exists
    if (appId) {
      const app = await queryOne<{ id: string }>(
        `SELECT id FROM apps WHERE id = ? AND is_published = 1`,
        [appId],
        env
      );

      if (!app) {
        return new Response(
          JSON.stringify({ error: "App not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Create the feature request
    const requestId = nanoid();
    await execute(
      `INSERT INTO feature_requests (id, user_id, app_id, type, title, body, status, vote_count, comment_count)
       VALUES (?, ?, ?, ?, ?, ?, 'open', 1, 0)`,
      [requestId, user.id, appId || null, feedbackType, title.trim(), body.trim()],
      env
    );

    // Auto-upvote by the creator
    const voteId = nanoid();
    await execute(
      `INSERT INTO feature_votes (id, user_id, request_id) VALUES (?, ?, ?)`,
      [voteId, user.id, requestId],
      env
    );

    // Record rate limit action (admins exempt)
    if (!user.isAdmin) {
      await recordRateLimitAction(user.id, RATE_LIMITS.feedbackSubmission.action, env);
    }

    return new Response(
      JSON.stringify({ success: true, id: requestId }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Submit feedback error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to submit feedback" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
