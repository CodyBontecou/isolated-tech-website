/**
 * POST /api/admin/apps/:appId/og
 * Upload a pre-generated OG image to R2.
 *
 * Accepts multipart form with a "file" field (PNG, max 2MB).
 * Stores to R2 at og/{slug}.png for serving via /api/og/[slug].
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";

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

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // Validate type
    if (file.type !== "image/png") {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG is allowed." },
        { status: 400 }
      );
    }

    // Validate size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    // Upload to R2
    const r2Key = `og/${app.slug}.png`;
    const arrayBuffer = await file.arrayBuffer();

    await env.APPS_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: "image/png",
        cacheControl: "public, max-age=86400", // 24 hours
      },
    });

    console.log(
      `Uploaded OG image for ${app.slug} (${file.size} bytes) by ${user.email}`
    );

    return NextResponse.json({
      success: true,
      r2Key,
      size: file.size,
    });
  } catch (error) {
    console.error("OG upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload OG image" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/apps/:appId/og
 * Delete the pre-generated OG image from R2.
 */
export async function DELETE(
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

    // Look up the app
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

    // Delete from R2
    const r2Key = `og/${app.slug}.png`;
    await env.APPS_BUCKET.delete(r2Key);

    console.log(`Deleted OG image for ${app.slug} by ${user.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OG delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete OG image" },
      { status: 500 }
    );
  }
}
