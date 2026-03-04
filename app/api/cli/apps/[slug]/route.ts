import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, canManageApp } from "@/lib/admin-auth";
import { queryOne, execute } from "@/lib/db";

interface App {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  platforms: string;
  is_published: number;
}

/**
 * GET /api/cli/apps/[slug]
 *
 * Get a specific app by slug.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const env = getEnv();
  const { slug } = await params;

  const user = await requireAdmin(request, env);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const app = await queryOne<App>(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, is_published
     FROM apps
     WHERE slug = ?`,
    [slug],
    env
  );

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  if (!(await canManageApp(user, app.id, env))) {
    return NextResponse.json(
      { error: "You don't have permission to access this app" },
      { status: 403 }
    );
  }

  return NextResponse.json(app);
}

/**
 * PATCH /api/cli/apps/[slug]
 *
 * Update app metadata (tagline, description, is_published, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const env = getEnv();
  const { slug } = await params;

  const user = await requireAdmin(request, env);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const app = await queryOne<App>(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, is_published
     FROM apps
     WHERE slug = ?`,
    [slug],
    env
  );

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  if (!(await canManageApp(user, app.id, env))) {
    return NextResponse.json(
      { error: "You don't have permission to update this app" },
      { status: 403 }
    );
  }

  let body: {
    name?: string;
    tagline?: string;
    description?: string;
    is_published?: boolean;
    platforms?: string[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Build dynamic update query
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (body.name !== undefined) {
    updates.push("name = ?");
    values.push(body.name);
  }

  if (body.tagline !== undefined) {
    updates.push("tagline = ?");
    values.push(body.tagline);
  }

  if (body.description !== undefined) {
    updates.push("description = ?");
    values.push(body.description);
  }

  if (body.is_published !== undefined) {
    updates.push("is_published = ?");
    values.push(body.is_published ? 1 : 0);
  }

  if (body.platforms !== undefined) {
    updates.push("platforms = ?");
    values.push(JSON.stringify(body.platforms));
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  // Add updated_at
  updates.push("updated_at = datetime('now')");

  // Add slug to values for WHERE clause
  values.push(slug);

  try {
    await execute(
      `UPDATE apps SET ${updates.join(", ")} WHERE slug = ?`,
      values,
      env
    );

    // Fetch updated app
    const updated = await queryOne<App>(
      `SELECT id, slug, name, tagline, description, icon_url, platforms, is_published
       FROM apps
       WHERE slug = ?`,
      [slug],
      env
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update app:", error);
    return NextResponse.json(
      { error: "Failed to update app" },
      { status: 500 }
    );
  }
}
