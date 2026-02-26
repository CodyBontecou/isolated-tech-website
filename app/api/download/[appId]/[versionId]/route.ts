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

    // Check download permissions (admins bypass this check)
    if (!user.isAdmin) {
      const isSourceCode = app.distribution_type === "source_code";
      
      if (isSourceCode && !app.allow_source_download) {
        return NextResponse.json(
          { error: "Source code download is not available for this app" },
          { status: 403 }
        );
      }

      if (!isSourceCode && !app.allow_binary_download) {
        return NextResponse.json(
          { error: "Binary download is not available for this app" },
          { status: 403 }
        );
      }
    }

    const version = await env.DB.prepare(
      `SELECT id, app_id, version, r2_key, file_size_bytes
       FROM app_versions WHERE id = ? AND app_id = ?`
    )
      .bind(params.versionId, params.appId)
      .first<AppVersion>();

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
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
    const object = await env.APPS_BUCKET.get(version.r2_key);

    if (!object) {
      console.error(`R2 object not found: ${version.r2_key}`);
      return NextResponse.json(
        { error: "Download file not found" },
        { status: 404 }
      );
    }

    // 5. Determine filename and content type
    const filename = version.r2_key.split("/").pop() || `${app.slug}-${version.version}.zip`;
    const contentType = object.httpMetadata?.contentType || "application/octet-stream";

    // 6. Stream the file
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Content-Length", (object.size || version.file_size_bytes).toString());
    headers.set("Cache-Control", "private, no-cache");

    // Log download
    console.log(
      `Download: user=${user.id} app=${app.slug} version=${version.version}`
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
