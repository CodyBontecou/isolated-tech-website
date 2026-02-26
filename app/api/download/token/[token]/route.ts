/**
 * GET /api/download/token/[token]
 *
 * One-time download endpoint using a unique token.
 * Token is consumed on first successful download.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";

interface DownloadToken {
  id: string;
  token: string;
  user_id: string;
  app_id: string;
  purchase_id: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

interface App {
  id: string;
  name: string;
  slug: string;
}

interface AppVersion {
  id: string;
  app_id: string;
  version: string;
  r2_key: string;
  file_size_bytes: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.APPS_BUCKET) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { token } = params;

    if (!token || token.length < 20) {
      return NextResponse.json(
        { error: "Invalid download token" },
        { status: 400 }
      );
    }

    // 1. Find and validate token
    const downloadToken = await env.DB.prepare(
      `SELECT * FROM download_tokens WHERE token = ?`
    )
      .bind(token)
      .first<DownloadToken>();

    if (!downloadToken) {
      return NextResponse.json(
        { error: "Download link not found or invalid" },
        { status: 404 }
      );
    }

    // 2. Check if already used
    if (downloadToken.used_at) {
      return NextResponse.json(
        { 
          error: "This download link has already been used",
          message: "Please check your email for a new link or contact support."
        },
        { status: 410 } // Gone
      );
    }

    // 3. Check expiration
    const now = new Date();
    const expiresAt = new Date(downloadToken.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json(
        { 
          error: "This download link has expired",
          message: "Please contact support for a new download link."
        },
        { status: 410 }
      );
    }

    // 4. Get app info
    const app = await env.DB.prepare(
      `SELECT id, name, slug FROM apps WHERE id = ?`
    )
      .bind(downloadToken.app_id)
      .first<App>();

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // 5. Get latest version
    const version = await env.DB.prepare(
      `SELECT id, app_id, version, r2_key, file_size_bytes
       FROM app_versions 
       WHERE app_id = ? AND is_latest = 1`
    )
      .bind(downloadToken.app_id)
      .first<AppVersion>();

    if (!version) {
      return NextResponse.json(
        { error: "No downloadable version available" },
        { status: 404 }
      );
    }

    // 6. Get file from R2
    const object = await env.APPS_BUCKET.get(version.r2_key);

    if (!object) {
      console.error(`R2 object not found: ${version.r2_key}`);
      return NextResponse.json(
        { error: "Download file not found" },
        { status: 404 }
      );
    }

    // 7. Mark token as used (BEFORE streaming to ensure one-time use)
    await env.DB.prepare(
      `UPDATE download_tokens SET used_at = datetime('now') WHERE id = ?`
    )
      .bind(downloadToken.id)
      .run();

    // 8. Determine filename
    const filename = version.r2_key.split("/").pop() || 
      `${app.slug}-${version.version}.zip`;
    
    const contentType = object.httpMetadata?.contentType || "application/zip";

    // 9. Stream the file
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Content-Length", (object.size || version.file_size_bytes).toString());
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

    console.log(
      `Token download: token=${token.slice(0, 8)}... app=${app.slug} version=${version.version}`
    );

    return new NextResponse(object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Token download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
