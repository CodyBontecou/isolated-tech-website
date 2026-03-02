/**
 * POST /api/admin/apps/:appId/icon
 * Upload an app icon to R2 and set icon_url on the app.
 *
 * Accepts multipart form with a "file" field (PNG, JPEG, or WebP, max 5MB).
 * Stores to R2 at apps/{slug}/icon.png and updates the app's icon_url.
 * 
 * Sellers can only upload icons for their own apps.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, canManageApp } from "@/lib/admin-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { appId: string } }
) {
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
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Look up the app (by ID or slug)
    let app = await env.DB.prepare(`SELECT id, slug FROM apps WHERE id = ?`)
      .bind(params.appId)
      .first<{ id: string; slug: string }>();

    if (!app) {
      app = await env.DB.prepare(`SELECT id, slug FROM apps WHERE slug = ?`)
        .bind(params.appId)
        .first<{ id: string; slug: string }>();
    }

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Check user can manage this app
    if (!await canManageApp(user, app.id, env)) {
      return NextResponse.json(
        { error: "You don't have permission to manage this app" },
        { status: 403 }
      );
    }

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File is required" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPEG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Upload to R2
    const r2Key = `apps/${app.slug}/icon.png`;
    const arrayBuffer = await file.arrayBuffer();

    await env.APPS_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=86400",
      },
    });

    // Update the app's icon_url
    const iconUrl = `/apps/${app.slug}/icon`;
    await env.DB.prepare(
      `UPDATE apps SET icon_url = ?, updated_at = ? WHERE id = ?`
    )
      .bind(iconUrl, new Date().toISOString(), app.id)
      .run();

    // Remove stale pre-generated OG image so it can be regenerated with new icon
    await env.APPS_BUCKET.delete(`og/${app.slug}.png`);

    console.log(
      `Uploaded icon for ${app.slug} (${file.size} bytes) by ${user.email}`
    );

    return NextResponse.json({
      success: true,
      icon_url: iconUrl,
      r2Key,
      size: file.size,
      og_needs_regeneration: true,
    });
  } catch (error) {
    console.error("Icon upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload icon" },
      { status: 500 }
    );
  }
}
