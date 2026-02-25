/**
 * POST /api/admin/apps/:appId/media
 * Add media item to app showcase
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { nanoid } from "nanoid";

export async function POST(
  request: NextRequest,
  { params }: { params: { appId: string } }
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
    const { type, url, title } = body;

    if (!type || !url) {
      return NextResponse.json(
        { error: "Type and URL are required" },
        { status: 400 }
      );
    }

    if (type !== "image" && type !== "youtube") {
      return NextResponse.json(
        { error: "Type must be 'image' or 'youtube'" },
        { status: 400 }
      );
    }

    // Get current max sort_order
    const maxOrder = await env.DB.prepare(
      `SELECT MAX(sort_order) as max_order FROM app_media WHERE app_id = ?`
    )
      .bind(params.appId)
      .first<{ max_order: number | null }>();

    const sortOrder = (maxOrder?.max_order ?? -1) + 1;
    const id = nanoid();

    await env.DB.prepare(
      `INSERT INTO app_media (id, app_id, type, url, title, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(id, params.appId, type, url, title || null, sortOrder)
      .run();

    return NextResponse.json({
      id,
      type,
      url,
      title: title || null,
      sort_order: sortOrder,
    });
  } catch (error) {
    console.error("Add media error:", error);
    return NextResponse.json(
      { error: "Failed to add media" },
      { status: 500 }
    );
  }
}
