/**
 * POST /api/admin/versions
 *
 * Create a new version record after file upload.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { nanoid } from "@/lib/db";

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
    const {
      appId,
      version,
      buildNumber,
      minOsVersion,
      releaseNotes,
      r2Key,
      fileSize,
      signature,
    } = body;

    // Validate required fields
    if (!appId || !version || !buildNumber || !r2Key) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Check app exists
    const app = await env.DB.prepare(`SELECT id FROM apps WHERE id = ?`)
      .bind(appId)
      .first<{ id: string }>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Check version doesn't exist
    const existingVersion = await env.DB.prepare(
      `SELECT id FROM app_versions WHERE app_id = ? AND version = ?`
    )
      .bind(appId, version)
      .first<{ id: string }>();

    if (existingVersion) {
      return NextResponse.json(
        { error: "This version already exists" },
        { status: 400 }
      );
    }

    // Check build number is higher than previous
    const latestVersion = await env.DB.prepare(
      `SELECT build_number FROM app_versions WHERE app_id = ? ORDER BY build_number DESC LIMIT 1`
    )
      .bind(appId)
      .first<{ build_number: number }>();

    if (latestVersion && buildNumber <= latestVersion.build_number) {
      return NextResponse.json(
        { error: `Build number must be higher than ${latestVersion.build_number}` },
        { status: 400 }
      );
    }

    // Unmark previous latest version
    await env.DB.prepare(
      `UPDATE app_versions SET is_latest = 0 WHERE app_id = ? AND is_latest = 1`
    )
      .bind(appId)
      .run();

    // Create new version
    const versionId = nanoid();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO app_versions (id, app_id, version, build_number, release_notes, min_os_version, r2_key, file_size, signature, is_latest, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`
    )
      .bind(
        versionId,
        appId,
        version,
        buildNumber,
        releaseNotes || null,
        minOsVersion || "14.0",
        r2Key,
        fileSize || 0,
        signature || null,
        now
      )
      .run();

    return NextResponse.json({
      success: true,
      version: {
        id: versionId,
        version,
        buildNumber,
      },
    });
  } catch (error) {
    console.error("Create version error:", error);
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    );
  }
}
