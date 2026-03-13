import { NextRequest } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { nanoid, execute, query, queryOne } from "@/lib/db";

// GET /api/cli/blog - List blog posts
export async function GET(request: NextRequest) {
  const env = getEnv();

  // Validate auth
  const user = await requireAdmin(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const appSlug = url.searchParams.get("app");

    let posts;
    if (appSlug) {
      posts = await query(
        `SELECT p.*, a.slug as app_slug, a.name as app_name
         FROM app_blog_posts p
         JOIN apps a ON p.app_id = a.id
         WHERE a.slug = ?
         ORDER BY p.created_at DESC`,
        [appSlug],
        env
      );
    } else {
      posts = await query(
        `SELECT p.*, a.slug as app_slug, a.name as app_name
         FROM app_blog_posts p
         JOIN apps a ON p.app_id = a.id
         ORDER BY p.created_at DESC`,
        [],
        env
      );
    }

    return new Response(JSON.stringify(posts), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List blog posts error:", error);
    return new Response(JSON.stringify({ error: "Failed to list blog posts" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// POST /api/cli/blog - Create a blog post
export async function POST(request: NextRequest) {
  const env = getEnv();

  // Validate auth
  const user = await requireAdmin(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const {
      appSlug,
      title,
      slug,
      excerpt,
      body: postBody,
      coverImageUrl,
      authorName,
      isPublished,
      publishedAt,
    } = body as {
      appSlug: string;
      title: string;
      slug?: string;
      excerpt?: string;
      body: string;
      coverImageUrl?: string;
      authorName?: string;
      isPublished?: boolean;
      publishedAt?: string;
    };

    // Validate required fields
    if (!appSlug || !title?.trim() || !postBody?.trim()) {
      return new Response(
        JSON.stringify({ error: "appSlug, title, and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get app by slug
    const app = await queryOne<{ id: string; slug: string; name: string }>(
      `SELECT id, slug, name FROM apps WHERE slug = ?`,
      [appSlug],
      env
    );

    if (!app) {
      return new Response(
        JSON.stringify({ error: `App not found: ${appSlug}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate slug if not provided
    const postSlug = slug?.trim() || title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness for this app
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM app_blog_posts WHERE app_id = ? AND slug = ?`,
      [app.id, postSlug],
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
    const now = new Date().toISOString();
    const published = isPublished ? 1 : 0;
    const pubDate = publishedAt || (isPublished ? now : null);

    await execute(
      `INSERT INTO app_blog_posts (id, app_id, slug, title, excerpt, body, cover_image_url, author_name, is_published, published_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        postId,
        app.id,
        postSlug,
        title.trim(),
        excerpt?.trim() || null,
        postBody.trim(),
        coverImageUrl?.trim() || null,
        authorName?.trim() || null,
        published,
        pubDate,
        now,
        now,
      ],
      env
    );

    // Return the created post
    const post = await queryOne(
      `SELECT p.*, a.slug as app_slug, a.name as app_name
       FROM app_blog_posts p
       JOIN apps a ON p.app_id = a.id
       WHERE p.id = ?`,
      [postId],
      env
    );

    return new Response(JSON.stringify(post), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create blog post error:", error);
    return new Response(JSON.stringify({ error: "Failed to create blog post" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
