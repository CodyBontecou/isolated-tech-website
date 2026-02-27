import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { execute, queryOne } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  created_at: string;
}

const EDIT_WINDOW_HOURS = 24;

function canEdit(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  return diffHours <= EDIT_WINDOW_HOURS;
}

/**
 * PATCH /api/feedback/[id] - Edit own feature request (within 24 hours)
 */
export async function PATCH(request: Request, context: RouteContext) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { id } = await context.params;
    const { title, body, type } = await request.json();

    // Get existing request
    const existingRequest = await queryOne<FeatureRequest>(
      `SELECT id, user_id, title, body, type, created_at FROM feature_requests WHERE id = ?`,
      [id],
      env
    );

    if (!existingRequest) {
      return new Response(
        JSON.stringify({ error: "Feature request not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check ownership (admins can edit any post)
    if (existingRequest.user_id !== user.id && !user.isAdmin) {
      return new Response(
        JSON.stringify({ error: "You can only edit your own posts" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check edit window (admins exempt)
    if (!user.isAdmin && !canEdit(existingRequest.created_at)) {
      return new Response(
        JSON.stringify({
          error: `Posts can only be edited within ${EDIT_WINDOW_HOURS} hours of posting`,
          editWindowExpired: true,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate inputs
    if (title !== undefined && (!title?.trim() || title.trim().length > 200)) {
      return new Response(
        JSON.stringify({ error: "Title must be 1-200 characters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (body !== undefined && !body?.trim()) {
      return new Response(
        JSON.stringify({ error: "Description cannot be empty" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validTypes = ["feature", "bug", "improvement"];
    if (type !== undefined && !validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build update query
    const updates: string[] = [];
    const params: unknown[] = [];

    if (title !== undefined) {
      updates.push("title = ?");
      params.push(title.trim());
    }

    if (body !== undefined) {
      updates.push("body = ?");
      params.push(body.trim());
    }

    if (type !== undefined) {
      updates.push("type = ?");
      params.push(type);
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ error: "No updates provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    await execute(
      `UPDATE feature_requests SET ${updates.join(", ")} WHERE id = ?`,
      params,
      env
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edit feedback error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * DELETE /api/feedback/[id] - Delete own feature request
 */
export async function DELETE(request: Request, context: RouteContext) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { id } = await context.params;

    // Get existing request
    const existingRequest = await queryOne<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM feature_requests WHERE id = ?`,
      [id],
      env
    );

    if (!existingRequest) {
      return new Response(
        JSON.stringify({ error: "Feature request not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check ownership (admins can delete any post)
    if (existingRequest.user_id !== user.id && !user.isAdmin) {
      return new Response(
        JSON.stringify({ error: "You can only delete your own posts" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete the feature request (cascades to votes and comments)
    await execute(
      `DELETE FROM feature_requests WHERE id = ?`,
      [id],
      env
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Delete feedback error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
