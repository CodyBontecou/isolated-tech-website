import { NextRequest } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { execute, queryOne } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/cli/blog/[id]/unpublish - Unpublish a blog post (make it a draft)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const env = getEnv();
  const { id } = await params;

  // Validate auth
  const user = await requireAdmin(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Check if post exists
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM app_blog_posts WHERE id = ?`,
      [id],
      env
    );

    if (!existing) {
      return new Response(JSON.stringify({ error: "Blog post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Set unpublished
    await execute(
      `UPDATE app_blog_posts 
       SET is_published = 0, 
           updated_at = datetime('now')
       WHERE id = ?`,
      [id],
      env
    );

    // Return updated post
    const post = await queryOne(
      `SELECT p.*, a.slug as app_slug, a.name as app_name
       FROM app_blog_posts p
       JOIN apps a ON p.app_id = a.id
       WHERE p.id = ?`,
      [id],
      env
    );

    return new Response(JSON.stringify(post), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unpublish blog post error:", error);
    return new Response(JSON.stringify({ error: "Failed to unpublish blog post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
