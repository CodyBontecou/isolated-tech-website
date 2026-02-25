/**
 * GET /api/admin/apps - List all apps
 * POST /api/admin/apps - Create a new app
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { nanoid } from "@/lib/db";

export async function GET(request: NextRequest) {
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

    const { results } = await env.DB.prepare(
      `SELECT a.*,
        (SELECT COUNT(*) FROM app_versions WHERE app_id = a.id) as version_count,
        (SELECT COUNT(*) FROM purchases WHERE app_id = a.id AND status = 'completed') as purchase_count
       FROM apps a
       ORDER BY a.created_at DESC`
    ).all<{
      id: string;
      name: string;
      slug: string;
      tagline: string;
      description: string;
      icon_url: string | null;
      screenshots: string | null;
      platforms: string;
      min_price_cents: number;
      suggested_price_cents: number;
      is_published: number;
      page_config: string | null;
      created_at: string;
      updated_at: string;
      version_count: number;
      purchase_count: number;
    }>();

    return NextResponse.json({ apps: results });
  } catch (error) {
    console.error("List apps error:", error);
    return NextResponse.json({ error: "Failed to fetch apps" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      page_config,
    } = body;

    // Validate
    if (!name || typeof name !== "string" || name.length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!slug || typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase alphanumeric with dashes" },
        { status: 400 }
      );
    }

    if (!tagline || typeof tagline !== "string" || tagline.length < 5) {
      return NextResponse.json(
        { error: "Tagline must be at least 5 characters" },
        { status: 400 }
      );
    }

    if (!platforms || typeof platforms !== "string") {
      return NextResponse.json(
        { error: "Platforms are required" },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existing = await env.DB.prepare(
      `SELECT id FROM apps WHERE slug = ?`
    )
      .bind(slug)
      .first<{ id: string }>();

    if (existing) {
      return NextResponse.json(
        { error: "An app with this slug already exists" },
        { status: 400 }
      );
    }

    // Create app
    const appId = nanoid();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO apps (id, name, slug, tagline, description, icon_url, screenshots, platforms, min_price_cents, suggested_price_cents, is_published, page_config, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        appId,
        name,
        slug,
        tagline,
        description || "",
        icon_url || null,
        screenshots ? JSON.stringify(screenshots) : null,
        platforms,
        min_price_cents || 0,
        suggested_price_cents || 0,
        is_published ? 1 : 0,
        page_config ? JSON.stringify(page_config) : null,
        now,
        now
      )
      .run();

    return NextResponse.json({
      success: true,
      app: {
        id: appId,
        name,
        slug,
      },
    });
  } catch (error) {
    console.error("Create app error:", error);
    return NextResponse.json({ error: "Failed to create app" }, { status: 500 });
  }
}
