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

    // Check slug uniqueness for this app
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM app_blog_posts WHERE app_id = ? AND slug = ?`,
      [appId, slug.trim()],
      env
    );

    if (existing) {
      return new Response(
        JSON.stringify({ error: "A blog post with this slug already exists for this app" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create blog post
    const postId = nanoid();
    await execute(
      `INSERT INTO app_blog_posts (id, app_id, slug, title, excerpt, body, cover_image_url, author_name, is_published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        postId,
        appId,
        slug.trim(),
        title.trim(),
        excerpt?.trim() || null,
        body.trim(),
        coverImageUrl?.trim() || null,
        authorName?.trim() || null,
        isPublished ? 1 : 0,
        publishedAt || (isPublished ? new Date().toISOString() : null),
      ],
      env
    );

    return new Response(
      JSON.stringify({ success: true, id: postId }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create blog post error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create blog post" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
