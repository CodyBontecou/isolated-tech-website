/**
 * GET /apps/[slug]/icon
 * 
 * Serve app icon from R2 storage
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const env = getEnv();

    if (!env?.APPS_BUCKET) {
      return new NextResponse("Server configuration error", { status: 500 });
    }

    const slug = params.slug;
    const r2Key = `apps/${slug}/icon.png`;

    const object = await env.APPS_BUCKET.get(r2Key);

    if (!object) {
      // Return a default placeholder or 404
      return new NextResponse("Icon not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "image/png");
    headers.set("Cache-Control", "public, max-age=86400"); // 24 hour cache

    return new NextResponse(object.body, { headers });
  } catch (error) {
    console.error("Icon fetch error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
