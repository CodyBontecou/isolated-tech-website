/**
 * GET /api/admin/apps/[id] - Get single app (by id or slug)
 * PUT /api/admin/apps/[id] - Update an app
 * DELETE /api/admin/apps/[id] - Delete an app
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Find app by ID or slug
 */
async function findApp(idOrSlug: string, db: D1Database) {
  // Try ID first
  let app = await db.prepare(`SELECT * FROM apps WHERE id = ?`)
    .bind(idOrSlug)
    .first();

  // Fall back to slug
  if (!app) {
    app = await db.prepare(`SELECT * FROM apps WHERE slug = ?`)
      .bind(idOrSlug)
      .first();
  }

  return app;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const user = await requireAdmin(request, env);
    if (!user) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const app = await findApp(params.id, env.DB);

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    return NextResponse.json({ app });
  } catch (error) {
    console.error("Get app error:", error);
    return NextResponse.json({ error: "Failed to fetch app" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const user = await requireAdmin(request, env);
    if (!user) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check if app exists
    const existing = await env.DB.prepare(
      `SELECT id, slug FROM apps WHERE id = ?`
    )
      .bind(params.id)
      .first<{ id: string; slug: string }>();

    if (!existing) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      tagline,
      description,
      icon_url,
      screenshots,
      platforms,
      min_price_cents,
      suggested_price_cents,
      is_published,
      is_featured,
      featured_order,
      page_config,
      distribution_type,
      build_instructions,
      github_url,
      required_xcode_version,
      min_ios_version,
      allow_source_download,
      allow_binary_download,
    } = body;

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const duplicate = await env.DB.prepare(
        `SELECT id FROM apps WHERE slug = ? AND id != ?`
      )
        .bind(slug, params.id)
        .first<{ id: string }>();

      if (duplicate) {
        return NextResponse.json(
          { error: "An app with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }

    if (slug !== undefined) {
      updates.push("slug = ?");
      values.push(slug);
    }

    if (tagline !== undefined) {
      updates.push("tagline = ?");
      values.push(tagline);
    }

    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }

    if (icon_url !== undefined) {
      updates.push("icon_url = ?");
      values.push(icon_url || null);
    }

    if (screenshots !== undefined) {
      updates.push("screenshots = ?");
      values.push(screenshots ? JSON.stringify(screenshots) : null);
    }

    if (platforms !== undefined) {
      updates.push("platforms = ?");
      values.push(platforms);
    }

    if (min_price_cents !== undefined) {
      updates.push("min_price_cents = ?");
      values.push(min_price_cents);
    }

    if (suggested_price_cents !== undefined) {
      updates.push("suggested_price_cents = ?");
      values.push(suggested_price_cents);
    }

    if (is_published !== undefined) {
      updates.push("is_published = ?");
      values.push(is_published ? 1 : 0);
    }

    if (is_featured !== undefined) {
      updates.push("is_featured = ?");
      values.push(is_featured ? 1 : 0);
    }

    if (featured_order !== undefined) {
      updates.push("featured_order = ?");
      values.push(featured_order);
    }

    if (page_config !== undefined) {
      updates.push("page_config = ?");
      values.push(page_config ? JSON.stringify(page_config) : null);
    }

    if (distribution_type !== undefined) {
      updates.push("distribution_type = ?");
      values.push(distribution_type);
    }

    if (build_instructions !== undefined) {
      updates.push("build_instructions = ?");
      values.push(build_instructions || null);
    }

    if (github_url !== undefined) {
      updates.push("github_url = ?");
      values.push(github_url || null);
    }

    if (required_xcode_version !== undefined) {
      updates.push("required_xcode_version = ?");
      values.push(required_xcode_version || null);
    }

    if (min_ios_version !== undefined) {
      updates.push("min_ios_version = ?");
      values.push(min_ios_version || null);
    }

    if (allow_source_download !== undefined) {
      updates.push("allow_source_download = ?");
      values.push(allow_source_download ? 1 : 0);
    }

    if (allow_binary_download !== undefined) {
      updates.push("allow_binary_download = ?");
      values.push(allow_binary_download ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    updates.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(params.id);

    await env.DB.prepare(
      `UPDATE apps SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update app error:", error);
    return NextResponse.json({ error: "Failed to update app" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const user = await requireAdmin(request, env);
    if (!user) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Check if app exists
    const existing = await env.DB.prepare(
      `SELECT id, name FROM apps WHERE id = ?`
    )
      .bind(params.id)
      .first<{ id: string; name: string }>();

    if (!existing) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Check for purchases
    const purchaseCount = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM purchases WHERE app_id = ?`
    )
      .bind(params.id)
      .first<{ count: number }>();

    if (purchaseCount && purchaseCount.count > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete app with ${purchaseCount.count} purchases. Archive it instead.`,
        },
        { status: 400 }
      );
    }

    // Delete related data (reviews, versions)
    await env.DB.prepare(`DELETE FROM reviews WHERE app_id = ?`)
      .bind(params.id)
      .run();

    await env.DB.prepare(`DELETE FROM app_versions WHERE app_id = ?`)
      .bind(params.id)
      .run();

    // Delete app
    await env.DB.prepare(`DELETE FROM apps WHERE id = ?`).bind(params.id).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete app error:", error);
    return NextResponse.json({ error: "Failed to delete app" }, { status: 500 });
  }
}
