/**
 * GET /api/download/[appId]/[versionId]
 *
 * Secure download endpoint for purchased apps.
 * Verifies purchase ownership and streams file from R2.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";

interface AppVersion {
  id: string;
  app_id: string;
  version: string;
  r2_key: string;
  file_size_bytes: number;
  binary_r2_key: string | null;
  binary_file_size_bytes: number | null;
}

interface App {
  id: string;
  name: string;
  slug: string;
  distribution_type: string;
  allow_source_download: number;
  allow_binary_download: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { appId: string; versionId: string } }
) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV || !env?.APPS_BUCKET) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 1. Authenticate user
    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Get app and version
    const app = await env.DB.prepare(
      `SELECT id, name, slug, 
              COALESCE(distribution_type, 'binary') as distribution_type,
              COALESCE(allow_source_download, 1) as allow_source_download,
              COALESCE(allow_binary_download, 1) as allow_binary_download
       FROM apps WHERE id = ?`
    )
      .bind(params.appId)
      .first<App>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Determine download type from query parameter
    // type=source downloads source code, type=binary downloads compiled app
    // Default behavior: source_code apps -> source, binary apps -> binary
    const url = new URL(request.url);
    const requestedType = url.searchParams.get("type") as "source" | "binary" | null;
    const isSourceCode = app.distribution_type === "source_code";
    const downloadType = requestedType || (isSourceCode ? "source" : "binary");

    // Check download permissions (admins bypass this check)
    if (!user.isAdmin) {
      if (downloadType === "source" && !app.allow_source_download) {
        return NextResponse.json(
          { error: "Source code download is not available for this app" },
          { status: 403 }
        );
      }

      if (downloadType === "binary" && !app.allow_binary_download) {
        return NextResponse.json(
          { error: "Binary download is not available for this app" },
          { status: 403 }
        );
      }
    }

    const version = await env.DB.prepare(
      `SELECT id, app_id, version, r2_key, file_size_bytes, binary_r2_key, binary_file_size_bytes
       FROM app_versions WHERE id = ? AND app_id = ?`
    )
      .bind(params.versionId, params.appId)
      .first<AppVersion>();

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Determine which r2_key and file size to use
    let r2Key: string;
    let fileSize: number;

    if (downloadType === "binary") {
      // For binary downloads, prefer binary_r2_key if available, else fall back to r2_key
      r2Key = version.binary_r2_key || version.r2_key;
      fileSize = version.binary_file_size_bytes || version.file_size_bytes;
      
      // If this is a source_code app and no binary_r2_key exists, that's an error
      if (isSourceCode && !version.binary_r2_key) {
        return NextResponse.json(
          { error: "Compiled binary not available for this version" },
          { status: 404 }
        );
      }
    } else {
      // For source downloads, use r2_key (which is the source for source_code apps)
      r2Key = version.r2_key;
      fileSize = version.file_size_bytes;
      
      // If this is a binary app, r2_key IS the binary - but they requested source
      if (!isSourceCode) {
        return NextResponse.json(
          { error: "Source code not available for this app" },
          { status: 404 }
        );
      }
    }

    // 3. Verify purchase (admins bypass this check)
    if (!user.isAdmin) {
      const purchase = await env.DB.prepare(
        `SELECT id FROM purchases 
         WHERE user_id = ? AND app_id = ? AND status = 'completed'`
      )
        .bind(user.id, params.appId)
        .first<{ id: string }>();

      if (!purchase) {
        return NextResponse.json(
          { error: "Purchase required to download" },
          { status: 403 }
        );
      }
    }

    // 4. Get file from R2
    const object = await env.APPS_BUCKET.get(r2Key);

    if (!object) {
      console.error(`R2 object not found: ${r2Key}`);
      return NextResponse.json(
        { error: "Download file not found" },
        { status: 404 }
      );
    }

    // 5. Determine filename and content type
    const filename = r2Key.split("/").pop() || `${app.slug}-${version.version}.zip`;
    const contentType = object.httpMetadata?.contentType || "application/octet-stream";

    // 6. Stream the file
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Content-Length", (object.size || fileSize).toString());
    headers.set("Cache-Control", "private, no-cache");

    // Log download
    console.log(
      `Download: user=${user.id} app=${app.slug} version=${version.version} type=${downloadType}`
    );

    return new NextResponse(object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
