import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { nanoid, queryOne, execute } from "@/lib/db";

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
    const { requestId } = await request.json();

    if (!requestId) {
      return new Response(JSON.stringify({ error: "Missing requestId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if request exists
    const featureRequest = await queryOne<{ id: string }>(
      `SELECT id FROM feature_requests WHERE id = ?`,
      [requestId],
      env
    );

    if (!featureRequest) {
      return new Response(JSON.stringify({ error: "Feature request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user already voted
    const existingVote = await queryOne<{ id: string }>(
      `SELECT id FROM feature_votes WHERE user_id = ? AND request_id = ?`,
      [user.id, requestId],
      env
    );

    if (existingVote) {
      // Remove vote
      await execute(
        `DELETE FROM feature_votes WHERE user_id = ? AND request_id = ?`,
        [user.id, requestId],
        env
      );

      // Decrement vote count
      await execute(
        `UPDATE feature_requests SET vote_count = vote_count - 1 WHERE id = ?`,
        [requestId],
        env
      );

      return new Response(
        JSON.stringify({ success: true, voted: false }),
        { headers: { "Content-Type": "application/json" } }
      );
    } else {
      // Add vote
      const voteId = nanoid();
      await execute(
        `INSERT INTO feature_votes (id, user_id, request_id) VALUES (?, ?, ?)`,
        [voteId, user.id, requestId],
        env
      );

      // Increment vote count
      await execute(
        `UPDATE feature_requests SET vote_count = vote_count + 1 WHERE id = ?`,
        [requestId],
        env
      );

      return new Response(
        JSON.stringify({ success: true, voted: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Vote error:", error);
    return new Response(JSON.stringify({ error: "Failed to process vote" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
