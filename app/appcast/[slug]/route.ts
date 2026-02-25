/**
 * GET /appcast/[slug].xml
 *
 * Sparkle 2.x appcast feed for macOS app updates.
 * Returns XML with latest version info and signed download URL.
 */

import { NextRequest, NextResponse } from "next/server";
import type { Env } from "@/lib/env";

interface AppVersion {
  id: string;
  app_id: string;
  version: string;
  build_number: number;
  release_notes: string | null;
  min_os_version: string;
  r2_key: string;
  file_size: number;
  signature: string | null;
  is_latest: number;
  created_at: string;
}

interface App {
  id: string;
  name: string;
  slug: string;
  tagline: string;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatRFC822Date(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toUTCString();
}

function generateAppcastXml(
  app: App,
  version: AppVersion,
  downloadUrl: string,
  baseUrl: string
): string {
  const releaseNotesUrl = `${baseUrl}/apps/${app.slug}/changelog#${version.version}`;

  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(app.name)}</title>
    <link>${baseUrl}/apps/${app.slug}</link>
    <description>${escapeXml(app.tagline)}</description>
    <language>en</language>
    <item>
      <title>Version ${escapeXml(version.version)}</title>
      <sparkle:version>${version.build_number}</sparkle:version>
      <sparkle:shortVersionString>${escapeXml(version.version)}</sparkle:shortVersionString>
      <sparkle:minimumSystemVersion>${escapeXml(version.min_os_version)}</sparkle:minimumSystemVersion>
      <pubDate>${formatRFC822Date(version.created_at)}</pubDate>
      <sparkle:releaseNotesLink>${releaseNotesUrl}</sparkle:releaseNotesLink>
      <enclosure
        url="${escapeXml(downloadUrl)}"
        ${version.signature ? `sparkle:edSignature="${escapeXml(version.signature)}"` : ""}
        length="${version.file_size}"
        type="application/octet-stream"
      />
    </item>
  </channel>
</rss>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const env = (request as unknown as { env?: Env }).env;

    if (!env?.DB) {
      return new NextResponse("Server configuration error", { status: 500 });
    }

    // Remove .xml extension if present
    const slug = params.slug.replace(/\.xml$/, "");

    // Get app and latest version
    const result = await env.DB.prepare(
      `SELECT 
        a.id as app_id, a.name, a.slug, a.tagline,
        v.id as version_id, v.version, v.build_number, v.release_notes,
        v.min_os_version, v.r2_key, v.file_size, v.signature, v.created_at
       FROM apps a
       JOIN app_versions v ON v.app_id = a.id
       WHERE a.slug = ? AND v.is_latest = 1 AND a.is_published = 1`
    )
      .bind(slug)
      .first<{
        app_id: string;
        name: string;
        slug: string;
        tagline: string;
        version_id: string;
        version: string;
        build_number: number;
        release_notes: string | null;
        min_os_version: string;
        r2_key: string;
        file_size: number;
        signature: string | null;
        created_at: string;
      }>();

    if (!result) {
      return new NextResponse("App not found", { status: 404 });
    }

    // Get base URL from request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    // Generate download URL
    // For now, we'll use a direct route - can be replaced with R2 signed URLs
    const downloadUrl = `${baseUrl}/api/download/${result.app_id}/${result.version_id}`;

    const app: App = {
      id: result.app_id,
      name: result.name,
      slug: result.slug,
      tagline: result.tagline,
    };

    const version: AppVersion = {
      id: result.version_id,
      app_id: result.app_id,
      version: result.version,
      build_number: result.build_number,
      release_notes: result.release_notes,
      min_os_version: result.min_os_version,
      r2_key: result.r2_key,
      file_size: result.file_size,
      signature: result.signature,
      is_latest: 1,
      created_at: result.created_at,
    };

    const xml = generateAppcastXml(app, version, downloadUrl, baseUrl);

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // 1 hour cache
      },
    });
  } catch (error) {
    console.error("Appcast error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
