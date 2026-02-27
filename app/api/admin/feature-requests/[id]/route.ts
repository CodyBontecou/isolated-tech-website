import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { execute, queryOne } from "@/lib/db";
import { sendEmail, generateFeedbackStatusEmail } from "@/lib/email";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface FeatureRequestWithAuthor {
  id: string;
  user_id: string;
  title: string;
  status: string;
  admin_response: string | null;
  author_email: string;
  author_name: string | null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user || !user.isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { id } = await context.params;
    const { status, priority, adminResponse } = await request.json();

    // Get current state for comparison and email notification
    const existingRequest = await queryOne<FeatureRequestWithAuthor>(
      `SELECT fr.id, fr.user_id, fr.title, fr.status, fr.admin_response, u.email as author_email, u.name as author_name
       FROM feature_requests fr
       JOIN "user" u ON fr.user_id = u.id
       WHERE fr.id = ?`,
      [id],
      env
    );

    if (!existingRequest) {
      return new Response(
        JSON.stringify({ error: "Feature request not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate status
    const validStatuses = ["open", "planned", "in_progress", "completed", "closed"];
    if (status && !validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build update query
    const updates: string[] = [];
    const params: unknown[] = [];

    if (status !== undefined) {
      updates.push("status = ?");
      params.push(status);
    }

    if (priority !== undefined) {
      updates.push("priority = ?");
      params.push(priority);
    }

    if (adminResponse !== undefined) {
      updates.push("admin_response = ?");
      params.push(adminResponse);
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

    // Send email notification if status changed or admin response was added
    const statusChanged = status && status !== existingRequest.status;
    const responseAdded = adminResponse && adminResponse !== existingRequest.admin_response;

    if (statusChanged || responseAdded) {
      const feedbackUrl = `https://isolated.tech/feedback/${id}`;
      const newStatus = status || existingRequest.status;
      const { html, text } = generateFeedbackStatusEmail(
        existingRequest.title,
        existingRequest.status,
        newStatus,
        responseAdded ? adminResponse : existingRequest.admin_response,
        existingRequest.author_name,
        feedbackUrl
      );

      // Send email in the background (don't await)
      sendEmail(
        {
          to: existingRequest.author_email,
          subject: statusChanged
            ? `Status update: ${existingRequest.title}`
            : `Response added: ${existingRequest.title}`,
          html,
          text,
        },
        env
      ).catch((err) => console.error("Failed to send status notification:", err));
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Update feature request error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
