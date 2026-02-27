import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { nanoid, execute, queryOne } from "@/lib/db";

export async function POST(request: Request) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user || !user.isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { title, slug, body, category, appId, sortOrder, isPublished } = await request.json();

    // Validate required fields
    if (!title?.trim() || !slug?.trim() || !body?.trim()) {
      return new Response(
        JSON.stringify({ error: "Title, slug, and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check slug uniqueness
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM help_articles WHERE slug = ?`,
      [slug.trim()],
      env
    );

    if (existing) {
      return new Response(
        JSON.stringify({ error: "An article with this slug already exists" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create article
    const articleId = nanoid();
    await execute(
      `INSERT INTO help_articles (id, app_id, slug, title, body, category, sort_order, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        articleId,
        appId || null,
        slug.trim(),
        title.trim(),
        body.trim(),
        category || "general",
        sortOrder || 0,
        isPublished ? 1 : 0,
      ],
      env
    );

    return new Response(
      JSON.stringify({ success: true, id: articleId }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create help article error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create article" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
