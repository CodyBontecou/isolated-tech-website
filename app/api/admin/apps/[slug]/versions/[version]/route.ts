/**
 * PATCH /api/admin/apps/[slug]/versions/[version]
 *
 * Update a version by app slug and version string.
 * Useful for adding macOS binary to existing iOS version.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { getPlatforms } from "@/lib/app-data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; version: string }> }
) {
  try {
    const env = getEnv();
    const { slug, version: versionStr } = await params;

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

    // Find app by slug
    const app = await env.DB.prepare(`SELECT id FROM apps WHERE slug = ?`)
      .bind(slug)
      .first<{ id: string }>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Find version by app_id and version string
    const version = await env.DB.prepare(
      `SELECT id, version FROM app_versions WHERE app_id = ? AND version = ?`
    )
      .bind(app.id, versionStr)
      .first<{ id: string; version: string }>();

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const body = await request.json();
    const { notes, macosR2Key, macosFileSize, macosMinOsVersion } = body;

    // Build update query dynamically
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (notes !== undefined) {
      updates.push("release_notes = ?");
      values.push(notes);
    }

    if (macosR2Key !== undefined) {
      updates.push("macos_r2_key = ?");
      values.push(macosR2Key);
    }

    if (macosFileSize !== undefined) {
      updates.push("macos_file_size_bytes = ?");
      values.push(macosFileSize);
    }

    if (macosMinOsVersion !== undefined) {
      updates.push("macos_min_os_version = ?");
      values.push(macosMinOsVersion);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Execute update
    values.push(version.id);
    await env.DB.prepare(
      `UPDATE app_versions SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

    // Also update platforms on the app if adding macOS
    if (macosR2Key) {
      const appData = await env.DB.prepare(`SELECT platforms FROM apps WHERE id = ?`)
        .bind(app.id)
        .first<{ platforms: string }>();
      
      if (appData) {
        const platforms = getPlatforms(appData.platforms || '');
        if (!platforms.includes('macos')) {
          platforms.push('macos');
          await env.DB.prepare(`UPDATE apps SET platforms = ? WHERE id = ?`)
            .bind(JSON.stringify(platforms), app.id)
            .run();
        }
      }
    }

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        version: version.version,
        updated: Object.keys(body),
      },
    });
  } catch (error) {
    console.error("Update version error:", error);
    return NextResponse.json(
      { error: "Failed to update version" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; version: string }> }
) {
  try {
    const env = getEnv();
    const { slug, version: versionStr } = await params;

    if (!env?.DB) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Find app by slug
    const app = await env.DB.prepare(`SELECT id FROM apps WHERE slug = ?`)
      .bind(slug)
      .first<{ id: string }>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Find version
    const version = await env.DB.prepare(
      `SELECT * FROM app_versions WHERE app_id = ? AND version = ?`
    )
      .bind(app.id, versionStr)
      .first();

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    return NextResponse.json({ version });
  } catch (error) {
    console.error("Get version error:", error);
    return NextResponse.json(
      { error: "Failed to get version" },
      { status: 500 }
    );
  }
}
