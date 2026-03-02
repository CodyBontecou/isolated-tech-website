import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, canManageApp } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";

interface Version {
  id: string;
  version: string;
  build_number: number;
  release_notes: string | null;
  min_os_version: string | null;
  released_at: string;
}

/**
 * GET /api/cli/apps/[slug]/versions
 *
 * List versions for an app.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const env = getEnv();
  const { slug } = await params;

  const user = await requireAdmin(request, env);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get app ID from slug
  const app = await queryOne<{ id: string }>(
    `SELECT id FROM apps WHERE slug = ?`,
    [slug],
    env
  );

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  if (!(await canManageApp(user, app.id, env))) {
    return NextResponse.json(
      { error: "You don't have permission to access this app" },
      { status: 403 }
    );
  }

  const versions = await query<Version>(
    `SELECT id, version, build_number, release_notes, min_os_version, released_at as created_at
     FROM app_versions
     WHERE app_id = ?
     ORDER BY build_number DESC`,
    [app.id],
    env
  );

  return NextResponse.json(versions);
}
