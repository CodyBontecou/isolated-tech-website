/**
 * GET /api/admin/updates/[id]
 * PATCH /api/admin/updates/[id]
 *
 * Get or update an app update's metadata (e.g., release notes).
 * 
 * The [id] can be either:
 * - A direct update ID
 * - A composite key: "appSlug:platform:version" (e.g., "time-md:macos:1.1.0")
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { execute } from "@/lib/db";

interface AppUpdate {
  id: string;
  app_id: string;
  version: string;
  platform: string;
  release_notes: string | null;
}

async function resolveUpdate(id: string, env: { DB: D1Database }): Promise<AppUpdate | null> {
  // Check if it's a composite key (slug:platform:version)
  if (id.includes(":")) {
    const [slug, platform, version] = id.split(":");
    if (slug && platform && version) {
      return env.DB.prepare(
        `SELECT u.id, u.app_id, u.version, u.platform, u.release_notes
         FROM app_updates u
         JOIN apps a ON u.app_id = a.id
         WHERE a.slug = ? AND u.platform = ? AND u.version = ?`
      )
        .bind(slug, platform, version)
        .first<AppUpdate>();
    }
  }
  
  // Otherwise treat as direct ID
  return env.DB.prepare(
    `SELECT id, app_id, version, platform, release_notes FROM app_updates WHERE id = ?`
  )
    .bind(id)
    .first<AppUpdate>();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const env = getEnv();
    const { id } = await params;

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

    const update = await resolveUpdate(id, env);
    if (!update) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    return NextResponse.json({ update });
  } catch (error) {
    console.error("Get app_updates error:", error);
    return NextResponse.json(
      { error: "Failed to get update" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const env = getEnv();
    const { id } = await params;

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

    // Resolve update (supports both direct ID and slug:platform:version)
    const update = await resolveUpdate(id, env);
    if (!update) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    const body = await request.json();
    const { releaseNotes } = body;

    if (releaseNotes === undefined) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update release notes
    await execute(
      `UPDATE app_updates SET release_notes = ? WHERE id = ?`,
      [releaseNotes, id],
      env
    );

    return NextResponse.json({
      success: true,
      update: {
        id: update.id,
        version: update.version,
        platform: update.platform,
        releaseNotes,
      },
    });
  } catch (error) {
    console.error("Update app_updates error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}
