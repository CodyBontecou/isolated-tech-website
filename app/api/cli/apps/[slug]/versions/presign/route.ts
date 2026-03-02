import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, canManageApp } from "@/lib/admin-auth";
import { queryOne } from "@/lib/db";

/**
 * POST /api/cli/apps/[slug]/versions/presign
 *
 * Generate R2 key for version upload.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const env = getEnv();
  const { slug } = await params;

  const user = await requireAdmin(request, env);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get app
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
      { error: "You don't have permission to manage this app" },
      { status: 403 }
    );
  }

  let body: { version?: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { version, filename } = body;

  if (!version || !filename) {
    return NextResponse.json(
      { error: "version and filename are required" },
      { status: 400 }
    );
  }

  // Validate filename - only .zip or .dmg
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
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const r2Key = `apps/${slug}/versions/${version}/${safeFilename}`;

  // For CLI, we'll use direct upload through our server
  const baseUrl = request.headers.get("host")?.includes("localhost")
    ? `http://${request.headers.get("host")}`
    : `https://${request.headers.get("host")}`;

  return NextResponse.json({
    uploadUrl: `${baseUrl}/api/cli/apps/${slug}/versions/upload`,
    r2Key,
    appId: app.id,
  });
}
