/**
 * GET /apps/[slug]/media/[id]
 *
 * Serve an app media image from R2 storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const env = getEnv();
    const { slug, id } = await params;

    if (!env?.APPS_BUCKET) {
      return new NextResponse("Server configuration error", { status: 500 });
    }

    const r2Key = `apps/${slug}/media/${id}`;
    const object = await env.APPS_BUCKET.get(r2Key);

    if (!object) {
      return new NextResponse("Media not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set(
      "Content-Type",
      object.httpMetadata?.contentType || "application/octet-stream"
    );
    headers.set(
      "Cache-Control",
      object.httpMetadata?.cacheControl || "public, max-age=86400"
    );

    return new NextResponse(object.body, { headers });
  } catch (error) {
    console.error("Media fetch error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
