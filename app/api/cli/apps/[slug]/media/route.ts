/**
 * POST /api/cli/apps/:slug/media
 *   Upload a media file (image) to R2 and insert an app_media row.
 *   Multipart form: file (required), title (optional), sort_order (optional).
 *
 * GET /api/cli/apps/:slug/media
 *   List media for an app (CLI-side, returns id/type/url/title/sort_order).
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, canManageApp } from "@/lib/admin-auth";
import { nanoid } from "nanoid";

const VALID_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const env = getEnv();
    const { slug } = await params;

    if (!env?.DB || !env?.AUTH_KV || !env?.APPS_BUCKET) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const user = await requireAdmin(request, env);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const app = await env.DB.prepare(`SELECT id, slug FROM apps WHERE slug = ?`)
      .bind(slug)
      .first<{ id: string; slug: string }>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    if (!(await canManageApp(user, app.id, env))) {
      return NextResponse.json(
        { error: "You don't have permission to manage this app" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string | null) ?? null;
    const sortOrderRaw = formData.get("sort_order") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!(file.type in VALID_IMAGE_TYPES)) {
      return NextResponse.json(
        { error: "Invalid file type. Only PNG, JPEG, and WebP are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    const id = nanoid();
    const r2Key = `apps/${app.slug}/media/${id}`;
    const arrayBuffer = await file.arrayBuffer();

    await env.APPS_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=86400",
      },
    });

    const url = `/apps/${app.slug}/media/${id}`;

    // Determine sort order: explicit if provided, otherwise next slot.
    let sortOrder: number;
    if (sortOrderRaw !== null && sortOrderRaw !== "") {
      const parsed = Number.parseInt(sortOrderRaw, 10);
      sortOrder = Number.isFinite(parsed) ? parsed : 0;
    } else {
      const max = await env.DB.prepare(
        `SELECT MAX(sort_order) as max_order FROM app_media WHERE app_id = ?`
      )
        .bind(app.id)
        .first<{ max_order: number | null }>();
      sortOrder = (max?.max_order ?? -1) + 1;
    }

    await env.DB.prepare(
      `INSERT INTO app_media (id, app_id, type, url, title, sort_order)
       VALUES (?, ?, 'image', ?, ?, ?)`
    )
      .bind(id, app.id, url, title, sortOrder)
      .run();

    console.log(
      `[CLI] Uploaded media ${id} for ${app.slug} (${file.size} bytes) by ${user.email}`
    );

    return NextResponse.json({
      success: true,
      id,
      type: "image",
      url,
      title,
      sort_order: sortOrder,
      size: file.size,
    });
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload media" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const env = getEnv();
    const { slug } = await params;

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const user = await requireAdmin(request, env);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const app = await env.DB.prepare(`SELECT id, slug FROM apps WHERE slug = ?`)
      .bind(slug)
      .first<{ id: string; slug: string }>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    if (!(await canManageApp(user, app.id, env))) {
      return NextResponse.json(
        { error: "You don't have permission to access this app" },
        { status: 403 }
      );
    }

    const result = await env.DB.prepare(
      `SELECT id, type, url, title, sort_order
       FROM app_media
       WHERE app_id = ?
       ORDER BY sort_order ASC, created_at ASC`
    )
      .bind(app.id)
      .all<{
        id: string;
        type: string;
        url: string;
        title: string | null;
        sort_order: number;
      }>();

    return NextResponse.json({ media: result.results ?? [] });
  } catch (error) {
    console.error("Media list error:", error);
    return NextResponse.json(
      { error: "Failed to list media" },
      { status: 500 }
    );
  }
}
