import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, canManageApp } from "@/lib/admin-auth";
import { queryOne, execute, nanoid } from "@/lib/db";

/**
 * POST /api/cli/apps/[slug]/versions/confirm
 *
 * Create a version record after upload.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const env = getEnv();
  const { slug } = await params;

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

  let body: {
    version?: string;
    buildNumber?: number;
    r2Key?: string;
    fileSize?: number;
    signature?: string;
    releaseNotes?: string;
    minOsVersion?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { version, buildNumber, r2Key, fileSize, signature, releaseNotes, minOsVersion } = body;

  if (!version || !buildNumber || !r2Key) {
    return NextResponse.json(
      { error: "version, buildNumber, and r2Key are required" },
      { status: 400 }
    );
  }

  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    return NextResponse.json(
      { error: "Invalid version format (use x.y.z)" },
      { status: 400 }
    );
  }

  // Check version doesn't already exist
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM app_versions WHERE app_id = ? AND version = ?`,
    [app.id, version],
    env
  );

  if (existing) {
    return NextResponse.json(
      { error: `Version ${version} already exists` },
      { status: 409 }
    );
  }

  // Check build number is higher than previous
  const latest = await queryOne<{ build_number: number }>(
    `SELECT build_number FROM app_versions
     WHERE app_id = ?
     ORDER BY build_number DESC LIMIT 1`,
    [app.id],
    env
  );

  if (latest && buildNumber <= latest.build_number) {
    return NextResponse.json(
      { error: `Build number must be higher than ${latest.build_number}` },
      { status: 400 }
    );
  }

  try {
    // Unmark previous latest
    await execute(
      `UPDATE app_versions SET is_latest = 0 WHERE app_id = ? AND is_latest = 1`,
      [app.id],
      env
    );

    // Create version
    const versionId = nanoid();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO app_versions
       (id, app_id, version, build_number, release_notes, min_os_version, r2_key, file_size_bytes, sparkle_signature, is_latest, released_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        versionId,
        app.id,
        version,
        buildNumber,
        releaseNotes || null,
        minOsVersion || "14.0",
        r2Key,
        fileSize || 0,
        signature || null,
        now,
      ],
      env
    );

    // Also create app_updates record for changelog
    try {
      const updateId = nanoid();
      await execute(
        `INSERT INTO app_updates (id, app_id, platform, version, build_number, release_notes, created_at)
         VALUES (?, ?, 'macos', ?, ?, ?, ?)`,
        [updateId, app.id, version, buildNumber, releaseNotes || null, now],
        env
      );
    } catch {
      // Non-fatal
      console.log("Could not create app_updates record");
    }

    return NextResponse.json({
      id: versionId,
      app: slug,
      version,
      buildNumber,
      url: `https://isolated.tech/apps/${slug}`,
      appcastUrl: `https://isolated.tech/appcast/${slug}.xml`,
    });
  } catch (error) {
    console.error("Create version error:", error);
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    );
  }
}
