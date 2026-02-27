import { requireAdmin } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { execute, queryOne } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const env = getEnv();

  // Verify admin
  try {
    await requireAdmin(env);
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const feedbackId = params.id;

  // Check feedback exists
  const existing = await queryOne(
    `SELECT id FROM feedback WHERE id = ?`,
    [feedbackId],
    env
  );

  if (!existing) {
    return new Response(JSON.stringify({ error: "Feedback not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { status, adminNotes } = body;

    // Validate status
    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (status && !validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid status" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update feedback
    const now = new Date().toISOString();
    await execute(
      `UPDATE feedback 
       SET status = COALESCE(?, status),
           admin_notes = ?,
           updated_at = ?
       WHERE id = ?`,
      [status || null, adminNotes || null, now, feedbackId],
      env
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Feedback update error:", error);
    return new Response(JSON.stringify({ error: "Failed to update feedback" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
