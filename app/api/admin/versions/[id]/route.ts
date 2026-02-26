/**
 * PATCH /api/admin/versions/[id]
 *
 * Update a version's metadata (e.g., release notes).
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
    const { notes } = body;

    if (notes === undefined) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Update release notes
    await env.DB.prepare(
      `UPDATE app_versions SET release_notes = ? WHERE id = ?`
    )
      .bind(notes, id)
      .run();

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        version: version.version,
        notes,
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
