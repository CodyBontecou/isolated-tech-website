import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin, canManageApp } from "@/lib/admin-auth";
import { queryOne } from "@/lib/db";

/**
 * POST /api/cli/apps/[slug]/versions/upload
 *
 * Upload a file to R2.
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

  // Check for APPS_BUCKET
  if (!env.APPS_BUCKET) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 500 }
    );
  }

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const r2Key = formData.get("r2Key") as string | null;

  if (!file || !r2Key) {
    return NextResponse.json(
      { error: "file and r2Key are required" },
      { status: 400 }
    );
  }

  // Validate file size (max 500MB)
  const maxSize = 500 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 500MB." },
      { status: 400 }
    );
  }

  // Upload to R2
  try {
    const arrayBuffer = await file.arrayBuffer();

    await env.APPS_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type || "application/octet-stream",
        contentDisposition: `attachment; filename="${file.name}"`,
      },
    });

    console.log(`CLI uploaded ${r2Key} (${file.size} bytes)`);

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
