/**
 * /api/admin/updates
 *
 * GET  — List all updates for an app (?appId=...)
 * POST — Create a new update record
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { nanoid, queries, execute } from "@/lib/db";

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

    const appId = request.nextUrl.searchParams.get("appId");
    if (!appId) {
      return NextResponse.json({ error: "appId is required" }, { status: 400 });
    }

    const updates = await queries.getAppUpdates(appId, env);
    return NextResponse.json({ updates });
  } catch (error) {
    console.error("List updates error:", error);
    return NextResponse.json(
      { error: "Failed to list updates" },
      { status: 500 }
    );
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
    const { appId, platform, version, buildNumber, releaseNotes, releasedAt } = body;

    // Validate required fields
    if (!appId || !platform || !version) {
      return NextResponse.json(
        { error: "appId, platform, and version are required" },
        { status: 400 }
      );
    }

    // Validate platform
    if (!["macos", "ios"].includes(platform)) {
      return NextResponse.json(
        { error: "platform must be 'macos' or 'ios'" },
        { status: 400 }
      );
    }

    // Validate version format (x.y.z)
    if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
      return NextResponse.json(
        { error: "Invalid version format (use x.y or x.y.z)" },
        { status: 400 }
      );
    }

    // Check app exists
    const app = await env.DB.prepare(`SELECT id FROM apps WHERE id = ?`)
      .bind(appId)
      .first<{ id: string }>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    const id = nanoid();
    const released = releasedAt || new Date().toISOString();

    await execute(
      `INSERT INTO app_updates (id, app_id, platform, version, build_number, release_notes, released_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, appId, platform, version, buildNumber || null, releaseNotes || null, released],
      env
    );

    return NextResponse.json({
      success: true,
      update: { id, appId, platform, version, releasedAt: released },
    });
  } catch (error: unknown) {
    console.error("Create update error:", error);

    // Handle unique constraint violation
    if (error instanceof Error && error.message?.includes("UNIQUE")) {
      return NextResponse.json(
        { error: "This version already exists for this platform" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create update" },
      { status: 500 }
    );
  }
}
