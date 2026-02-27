/**
 * GET /api/apps/[appId]/versions
 *
 * Get all available versions for an app the user has purchased.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";

interface AppVersion {
  id: string;
  version: string;
  build_number: number;
  release_notes: string | null;
  released_at: string;
  is_latest: number;
  file_size_bytes: number | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Authenticate user
    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify purchase (admins bypass)
    // Allow 'completed' and 'refunded_with_access' statuses
    if (!user.isAdmin) {
      const purchase = await env.DB.prepare(
        `SELECT id FROM purchases 
         WHERE user_id = ? AND app_id = ? AND status IN ('completed', 'refunded_with_access')`
      )
        .bind(user.id, appId)
        .first<{ id: string }>();

      if (!purchase) {
        return NextResponse.json(
          { error: "Purchase required" },
          { status: 403 }
        );
      }
    }

    // Get all versions for the app, ordered by build_number descending
    const result = await env.DB.prepare(
      `SELECT id, version, build_number, release_notes, released_at, is_latest, file_size_bytes
       FROM app_versions 
       WHERE app_id = ?
       ORDER BY build_number DESC`
    )
      .bind(appId)
      .all<AppVersion>();

    return NextResponse.json({
      versions: result.results || [],
    });
  } catch (error) {
    console.error("Get versions error:", error);
    return NextResponse.json(
      { error: "Failed to get versions" },
      { status: 500 }
    );
  }
}
