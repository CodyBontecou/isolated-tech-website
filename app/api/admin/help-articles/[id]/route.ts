import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { execute, queryOne } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
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
    const { title, slug, body, category, appId, sortOrder, isPublished, articleType, question } = await request.json();

    // Validate required fields
    if (!title?.trim() || !slug?.trim() || !body?.trim()) {
      return new Response(
        JSON.stringify({ error: "Title, slug, and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate app is required for non-help types
    const type = articleType || "help";
    if (type !== "help" && !appId) {
      return new Response(
        JSON.stringify({ error: "App is required for docs, FAQ, and guide articles" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check slug uniqueness (excluding current article)
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM help_articles WHERE slug = ? AND id != ?`,
      [slug.trim(), id],
      env
    );

    if (existing) {
      return new Response(
        JSON.stringify({ error: "An article with this slug already exists" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update article
    await execute(
      `UPDATE help_articles 
       SET app_id = ?, slug = ?, title = ?, body = ?, category = ?, sort_order = ?, is_published = ?, article_type = ?, question = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        appId || null,
        slug.trim(),
        title.trim(),
        body.trim(),
        category || "general",
        sortOrder || 0,
        isPublished ? 1 : 0,
        type,
        question?.trim() || null,
        id,
      ],
      env
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Update help article error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update article" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
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

    await execute(`DELETE FROM help_articles WHERE id = ?`, [id], env);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Delete help article error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete article" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
