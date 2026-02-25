/**
 * POST /api/admin/apps/:appId/media/reorder
 * Reorder media items
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
    const { order } = body;

    if (!Array.isArray(order)) {
      return NextResponse.json(
        { error: "Order must be an array of media IDs" },
        { status: 400 }
      );
    }

    // Update sort_order for each media item
    const statements = order.map((id: string, index: number) =>
      env.DB.prepare(
        `UPDATE app_media SET sort_order = ? WHERE id = ? AND app_id = ?`
      ).bind(index, id, params.appId)
    );

    await env.DB.batch(statements);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder media error:", error);
    return NextResponse.json(
      { error: "Failed to reorder media" },
      { status: 500 }
    );
  }
}
