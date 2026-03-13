import { NextRequest } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { execute, queryOne } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/cli/blog/[id] - Get a single blog post
export async function GET(request: NextRequest, { params }: RouteParams) {
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
    const post = await queryOne(
      `SELECT p.*, a.slug as app_slug, a.name as app_name
       FROM app_blog_posts p
       JOIN apps a ON p.app_id = a.id
       WHERE p.id = ?`,
      [id],
      env
    );

    if (!post) {
      return new Response(JSON.stringify({ error: "Blog post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(post), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get blog post error:", error);
    return new Response(JSON.stringify({ error: "Failed to get blog post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// PATCH /api/cli/blog/[id] - Update a blog post
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const existing = await queryOne<{ id: string; app_id: string }>(
      `SELECT id, app_id FROM app_blog_posts WHERE id = ?`,
      [id],
      env
    );

    if (!existing) {
      return new Response(JSON.stringify({ error: "Blog post not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const {
      title,
      slug,
      excerpt,
      body: postBody,
      coverImageUrl,
      authorName,
      isPublished,
      publishedAt,
    } = body as {
      title?: string;
      slug?: string;
      excerpt?: string;
      body?: string;
      coverImageUrl?: string;
      authorName?: string;
      isPublished?: boolean;
      publishedAt?: string;
    };

    // Check slug uniqueness if changing
    if (slug) {
      const slugConflict = await queryOne<{ id: string }>(
        `SELECT id FROM app_blog_posts WHERE app_id = ? AND slug = ? AND id != ?`,
        [existing.app_id, slug, id],
        env
      );

      if (slugConflict) {
        return new Response(
          JSON.stringify({ error: "A blog post with this slug already exists for this app" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title.trim());
    }
    if (slug !== undefined) {
      updates.push("slug = ?");
      values.push(slug.trim());
    }
    if (excerpt !== undefined) {
      updates.push("excerpt = ?");
      values.push(excerpt.trim() || null);
    }
    if (postBody !== undefined) {
      updates.push("body = ?");
      values.push(postBody.trim());
    }
    if (coverImageUrl !== undefined) {
      updates.push("cover_image_url = ?");
      values.push(coverImageUrl.trim() || null);
    }
    if (authorName !== undefined) {
      updates.push("author_name = ?");
      values.push(authorName.trim() || null);
    }
    if (isPublished !== undefined) {
      updates.push("is_published = ?");
      values.push(isPublished ? 1 : 0);
    }
    if (publishedAt !== undefined) {
      updates.push("published_at = ?");
      values.push(publishedAt);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: "No updates provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    await execute(
      `UPDATE app_blog_posts SET ${updates.join(", ")} WHERE id = ?`,
      values,
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
    console.error("Update blog post error:", error);
    return new Response(JSON.stringify({ error: "Failed to update blog post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// DELETE /api/cli/blog/[id] - Delete a blog post
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await execute(`DELETE FROM app_blog_posts WHERE id = ?`, [id], env);

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete blog post error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete blog post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
