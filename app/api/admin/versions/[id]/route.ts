/**
 * PATCH /api/admin/versions/[id]
 *
 * Update a version's metadata (e.g., release notes, macOS binary).
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";

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

    // Check version exists
    const version = await env.DB.prepare(
      `SELECT id, app_id, version FROM app_versions WHERE id = ?`
    )
      .bind(id)
      .first<{ id: string; app_id: string; version: string }>();

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
    values.push(id);
    await env.DB.prepare(
      `UPDATE app_versions SET ${updates.join(", ")} WHERE id = ?`
    )
      .bind(...values)
      .run();

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
