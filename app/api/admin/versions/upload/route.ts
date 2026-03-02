/**
 * POST /api/admin/versions/upload
 *
 * Upload file to R2 bucket.
 * Sellers can only upload files for their own apps.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, canManageApp } from "@/lib/admin-auth";
import { queryOne } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV || !env?.APPS_BUCKET) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const user = await requireAdmin(request, env);
    if (!user) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const r2Key = formData.get("r2Key") as string | null;
    const appId = formData.get("appId") as string | null;

    if (!file || !r2Key) {
      return NextResponse.json(
        { error: "File and r2Key are required" },
        { status: 400 }
      );
    }

    // Check ownership if appId provided, otherwise extract from r2Key
    let appIdToCheck = appId;
    
    if (!appIdToCheck) {
      // Extract slug from r2Key (format: apps/{slug}/versions/...)
      const match = r2Key.match(/^apps\/([^/]+)\//);
      if (match) {
        const slug = match[1];
        const app = await queryOne<{ id: string }>(
          `SELECT id FROM apps WHERE slug = ?`,
          [slug],
          env
        );
        appIdToCheck = app?.id || null;
      }
    }

    if (appIdToCheck) {
      if (!await canManageApp(user, appIdToCheck, env)) {
        return NextResponse.json(
          { error: "You don't have permission to upload files for this app" },
          { status: 403 }
        );
      }
    }

    // Validate file size (max 500MB)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 500MB." },
        { status: 400 }
      );
    }

    // Validate file type
    const validExtensions = [".zip", ".dmg", ".tar.gz"];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: "Invalid file type. Only .zip, .dmg, and .tar.gz are allowed." },
        { status: 400 }
      );
    }

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();

    await env.APPS_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
        contentDisposition: `attachment; filename="${file.name}"`,
      },
    });

    console.log(`Uploaded ${r2Key} (${file.size} bytes) by ${user.email}`);

    return NextResponse.json({
      success: true,
      r2Key,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
