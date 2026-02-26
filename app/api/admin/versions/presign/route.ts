/**
 * POST /api/admin/versions/presign
 *
 * Generate R2 key for version upload.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";

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
    const { appId, appSlug, version, filename, isBinary } = body;

    if (!appId || !appSlug || !version || !filename) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate filename
    const validExtensions = [".zip", ".dmg", ".tar.gz"];
    const hasValidExtension = validExtensions.some((ext) =>
      filename.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: "Invalid file type. Only .zip, .dmg, and .tar.gz are allowed." },
        { status: 400 }
      );
    }

    // Generate R2 key
    // Format: apps/{slug}/versions/{version}/{filename}
    // For binary builds of source_code apps: apps/{slug}/versions/{version}/binary/{filename}
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const r2Key = isBinary
      ? `apps/${appSlug}/versions/${version}/binary/${safeFilename}`
      : `apps/${appSlug}/versions/${version}/${safeFilename}`;

    return NextResponse.json({
      success: true,
      r2Key,
    });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
