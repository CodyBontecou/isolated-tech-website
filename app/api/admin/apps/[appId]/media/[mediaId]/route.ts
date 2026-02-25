/**
 * DELETE /api/admin/apps/:appId/media/:mediaId
 * Delete a media item from app showcase
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { appId: string; mediaId: string } }
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

    await env.DB.prepare(
      `DELETE FROM app_media WHERE id = ? AND app_id = ?`
    )
      .bind(params.mediaId, params.appId)
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete media error:", error);
    return NextResponse.json(
      { error: "Failed to delete media" },
      { status: 500 }
    );
  }
}
