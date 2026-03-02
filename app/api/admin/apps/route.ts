/**
 * GET /api/admin/apps - List apps (scoped by owner for sellers)
 * POST /api/admin/apps - Create a new app
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, getAppFilterClause } from "@/lib/admin-auth";
import { nanoid } from "@/lib/db";
import { getSellerConnectState } from "@/lib/seller-connect-status";

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

    // Get filter clause based on user permissions
    const { where, params } = getAppFilterClause(user);

    const query = `
      SELECT a.*,
        (SELECT COUNT(*) FROM app_versions WHERE app_id = a.id) as version_count,
        (SELECT COUNT(*) FROM purchases WHERE app_id = a.id AND status = 'completed') as purchase_count,
        (SELECT COALESCE(SUM(amount_cents), 0) FROM purchases WHERE app_id = a.id AND status = 'completed') as total_revenue_cents,
        u.email as owner_email,
        u.name as owner_name
       FROM apps a
       LEFT JOIN user u ON a.owner_id = u.id
       WHERE ${where}
       ORDER BY a.created_at DESC
    `;

    const { results } = await env.DB.prepare(query)
      .bind(...params)
      .all<{
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
        owner_id: string | null;
        created_at: string;
        updated_at: string;
        version_count: number;
        purchase_count: number;
        total_revenue_cents: number;
        owner_email: string | null;
        owner_name: string | null;
      }>();

    return NextResponse.json({ 
      apps: results,
      isSuperuser: user.isSuperuser,
    });
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

    // Sellers must have completed Stripe onboarding to create paid apps.
    // Use hybrid status check (live Stripe v2 status + DB fallback).
    if (user.isSeller && !user.isSuperuser) {
      const sellerConnectState = await getSellerConnectState(env, user.id);

      if (!sellerConnectState.effectiveOnboarded) {
        return NextResponse.json(
          {
            error: "Please complete Stripe onboarding before creating apps",
            details: sellerConnectState.liveChecked
              ? `requirements=${sellerConnectState.requirementsStatus ?? "unknown"}, transfers=${sellerConnectState.transfersCapabilityStatus ?? "unknown"}`
              : "Could not verify live Stripe status; using cached onboarding state.",
          },
          { status: 400 }
        );
      }
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
      github_url,
      owner_id: requestedOwnerId, // Only superusers can set this
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

    // Determine owner_id:
    // - Superusers can specify any owner or leave it null (platform-owned)
    // - Sellers always own their own apps
    let ownerId: string | null = null;
    
    if (user.isSuperuser) {
      // Superuser can set owner to anyone or leave null
      ownerId = requestedOwnerId || null;
    } else if (user.isSeller) {
      // Sellers always own their apps
      ownerId = user.id;
    }

    // Create app
    const appId = nanoid();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO apps (id, name, slug, tagline, description, icon_url, screenshots, platforms, min_price_cents, suggested_price_cents, is_published, is_featured, featured_order, custom_page_config, github_url, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        is_featured ? 1 : 0,
        featured_order || 0,
        page_config ? JSON.stringify(page_config) : null,
        github_url || null,
        ownerId,
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
        owner_id: ownerId,
      },
    });
  } catch (error) {
    console.error("Create app error:", error);
    return NextResponse.json({ error: "Failed to create app" }, { status: 500 });
  }
}
