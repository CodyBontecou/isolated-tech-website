/**
 * /api/admin/updates/[id]
 *
 * PUT    — Update an existing update record
 * DELETE — Delete an update record
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { execute } from "@/lib/db";

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

    const body = await request.json();
    const { version, buildNumber, releaseNotes, releasedAt } = body;

    const sets: string[] = [];
    const values: unknown[] = [];

    if (version !== undefined) {
      sets.push("version = ?");
      values.push(version);
    }
    if (buildNumber !== undefined) {
      sets.push("build_number = ?");
      values.push(buildNumber);
    }
    if (releaseNotes !== undefined) {
      sets.push("release_notes = ?");
      values.push(releaseNotes);
    }
    if (releasedAt !== undefined) {
      sets.push("released_at = ?");
      values.push(releasedAt);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(params.id);
    await execute(
      `UPDATE app_updates SET ${sets.join(", ")} WHERE id = ?`,
      values,
      env
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
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

    await execute(
      `DELETE FROM app_updates WHERE id = ?`,
      [params.id],
      env
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete update error:", error);
    return NextResponse.json(
      { error: "Failed to delete update" },
      { status: 500 }
    );
  }
}
