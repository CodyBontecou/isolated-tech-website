/**
 * POST /api/admin/versions/presign
 *
 * Generate R2 key for version upload.
 * Sellers can only upload versions for their own apps.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, canManageApp } from "@/lib/admin-auth";

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
    const { appId, appSlug, version, filename } = body;

    if (!appId || !appSlug || !version || !filename) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check user can manage this app
    if (!await canManageApp(user, appId, env)) {
      return NextResponse.json(
        { error: "You don't have permission to manage this app" },
        { status: 403 }
      );
    }

    // Validate filename - only .zip (containing .dmg) or .dmg directly
    const validExtensions = [".zip", ".dmg"];
    const hasValidExtension = validExtensions.some((ext) =>
      filename.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: "Invalid file type. Only .zip and .dmg are allowed." },
        { status: 400 }
      );
    }

    // Generate R2 key
    // Format: apps/{slug}/versions/{version}/{filename}
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const r2Key = `apps/${appSlug}/versions/${version}/${safeFilename}`;

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
