import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { queryOne } from "@/lib/db";

interface App {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  platforms: string;
  is_published: number;
}

/**
 * GET /api/cli/apps/[slug]
 * 
 * Get a specific app by slug.
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
  
  const app = await queryOne<App>(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, is_published
     FROM apps
     WHERE slug = ?`,
    [slug],
    env
  );
  
  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }
  
  return NextResponse.json(app);
}
