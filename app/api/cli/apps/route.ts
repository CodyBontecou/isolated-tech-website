import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, getAppFilterClause } from "@/lib/admin-auth";
import { query, execute, nanoid } from "@/lib/db";
import { getSellerConnectState } from "@/lib/seller-connect-status";

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
 * GET /api/cli/apps
 *
 * List apps scoped to the authenticated user.
 */
export async function GET(request: NextRequest) {
  const env = getEnv();

  const user = await requireAdmin(request, env);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const filter = getAppFilterClause(user);

  const apps = await query<App>(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, is_published
     FROM apps
     WHERE ${filter.where}
     ORDER BY name`,
    filter.params,
    env
  );

  return NextResponse.json(apps);
}

/**
 * POST /api/cli/apps
 *
 * Register a new app.
 * Sellers create seller-owned apps; superusers create platform-owned apps.
 */
export async function POST(request: NextRequest) {
  const env = getEnv();

  const user = await requireAdmin(request, env);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Sellers must complete Stripe onboarding before creating apps.
  // Use hybrid status check (live Stripe v2 status + DB fallback).
  if (!user.isSuperuser && user.isSeller) {
    const sellerConnectState = await getSellerConnectState(env, user.id);

    if (!sellerConnectState.effectiveOnboarded) {
      return NextResponse.json(
        {
          error: "Complete Stripe onboarding first at /seller",
          details: sellerConnectState.liveChecked
            ? `requirements=${sellerConnectState.requirementsStatus ?? "unknown"}, transfers=${sellerConnectState.transfersCapabilityStatus ?? "unknown"}`
            : "Could not verify live Stripe status; using cached onboarding state.",
        },
        { status: 400 }
      );
    }
  }

  let body: { bundleId?: string; name?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, slug } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Generate slug if not provided
  const appSlug = (slug || name)
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Check if slug already exists
  const existing = await query<{ id: string }>(
    `SELECT id FROM apps WHERE slug = ?`,
    [appSlug],
    env
  );

  if (existing.length > 0) {
    return NextResponse.json(
      { error: `App with slug "${appSlug}" already exists` },
      { status: 409 }
    );
  }

  const id = nanoid();
  const ownerId = user.isSuperuser ? null : user.id;

  try {
    await execute(
      `INSERT INTO apps (id, slug, name, platforms, is_published, owner_id)
       VALUES (?, ?, ?, '["macos"]', 0, ?)`,
      [id, appSlug, name, ownerId],
      env
    );

    return NextResponse.json({
      id,
      slug: appSlug,
      name,
      platforms: '["macos"]',
      is_published: false,
      owner_id: ownerId,
    });
  } catch (error) {
    console.error("Failed to create app:", error);
    return NextResponse.json(
      { error: "Failed to create app" },
      { status: 500 }
    );
  }
}
