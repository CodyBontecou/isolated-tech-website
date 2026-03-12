import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, canManageApp } from "@/lib/admin-auth";
import { queryOne, execute } from "@/lib/db";

interface Version {
  id: string;
  app_id: string;
  version: string;
  build_number: number;
  release_notes: string | null;
  min_os_version: string | null;
  released_at: string;
}

/**
 * PATCH /api/cli/apps/[slug]/versions/[version]
 *
 * Update release notes for an existing version.
 * Only allows updating release_notes field.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; version: string }> }
) {
  const env = getEnv();
  const { slug, version } = await params;

  const user = await requireAdmin(request, env);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get app
  const app = await queryOne<{ id: string; name: string }>(
    `SELECT id, name FROM apps WHERE slug = ?`,
    [slug],
    env
  );

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  if (!(await canManageApp(user, app.id, env))) {
    return NextResponse.json(
      { error: "You don't have permission to manage this app" },
      { status: 403 }
    );
  }

  // Get existing version
  const existingVersion = await queryOne<Version>(
    `SELECT id, app_id, version, build_number, release_notes, min_os_version, released_at
     FROM app_versions
     WHERE app_id = ? AND version = ?`,
    [app.id, version],
    env
  );

  if (!existingVersion) {
    return NextResponse.json(
      { error: `Version ${version} not found` },
      { status: 404 }
    );
  }

  let body: {
    releaseNotes?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { releaseNotes } = body;

  if (releaseNotes === undefined) {
    return NextResponse.json(
      { error: "releaseNotes is required" },
      { status: 400 }
    );
  }

  try {
    // Update version release notes
    await execute(
      `UPDATE app_versions SET release_notes = ? WHERE id = ?`,
      [releaseNotes, existingVersion.id],
      env
    );

    // Also update app_updates if it exists
    await execute(
      `UPDATE app_updates SET release_notes = ? WHERE app_id = ? AND version = ?`,
      [releaseNotes, app.id, version],
      env
    );

    // Return updated version
    const updatedVersion = await queryOne<Version>(
      `SELECT id, version, build_number, release_notes, min_os_version, released_at as created_at
       FROM app_versions
       WHERE id = ?`,
      [existingVersion.id],
      env
    );

    return NextResponse.json(updatedVersion);
  } catch (error) {
    console.error("Update version error:", error);
    return NextResponse.json(
      { error: "Failed to update version" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cli/apps/[slug]/versions/[version]
 *
 * Get details for a specific version.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; version: string }> }
) {
  const env = getEnv();
  const { slug, version } = await params;

  const user = await requireAdmin(request, env);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get app
  const app = await queryOne<{ id: string }>(
    `SELECT id FROM apps WHERE slug = ?`,
    [slug],
    env
  );

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  if (!(await canManageApp(user, app.id, env))) {
    return NextResponse.json(
      { error: "You don't have permission to access this app" },
      { status: 403 }
    );
  }

  const versionData = await queryOne<Version>(
    `SELECT id, version, build_number, release_notes, min_os_version, released_at as created_at
     FROM app_versions
     WHERE app_id = ? AND version = ?`,
    [app.id, version],
    env
  );

  if (!versionData) {
    return NextResponse.json(
      { error: `Version ${version} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json(versionData);
}
