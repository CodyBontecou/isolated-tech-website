import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { execute, queryOne } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user || !user.isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;

  try {
    const {
      appId,
      title,
      slug,
      excerpt,
      body,
      coverImageUrl,
      authorName,
      isPublished,
      publishedAt,
    } = await request.json();

    // Validate required fields
    if (!appId || !title?.trim() || !slug?.trim() || !body?.trim()) {
      return new Response(
        JSON.stringify({ error: "App, title, slug, and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if post exists
    const existing = await queryOne<{ id: string; app_id: string }>(
      `SELECT id, app_id FROM app_blog_posts WHERE id = ?`,
      [id],
      env
    );

    if (!existing) {
      return new Response(
        JSON.stringify({ error: "Blog post not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check slug uniqueness (excluding current post)
    const slugConflict = await queryOne<{ id: string }>(
      `SELECT id FROM app_blog_posts WHERE app_id = ? AND slug = ? AND id != ?`,
      [appId, slug.trim(), id],
      env
    );

    if (slugConflict) {
      return new Response(
        JSON.stringify({ error: "A blog post with this slug already exists for this app" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update blog post
    await execute(
      `UPDATE app_blog_posts 
       SET app_id = ?, slug = ?, title = ?, excerpt = ?, body = ?, 
           cover_image_url = ?, author_name = ?, is_published = ?, 
           published_at = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        appId,
        slug.trim(),
        title.trim(),
        excerpt?.trim() || null,
        body.trim(),
        coverImageUrl?.trim() || null,
        authorName?.trim() || null,
        isPublished ? 1 : 0,
        publishedAt || (isPublished ? new Date().toISOString() : null),
        id,
      ],
      env
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Update blog post error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update blog post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user || !user.isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await params;

  try {
    // Check if post exists
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM app_blog_posts WHERE id = ?`,
      [id],
      env
    );

    if (!existing) {
      return new Response(
        JSON.stringify({ error: "Blog post not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Delete blog post
    await execute(`DELETE FROM app_blog_posts WHERE id = ?`, [id], env);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Delete blog post error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete blog post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
