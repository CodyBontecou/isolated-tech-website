import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { requireAdmin } from "@/lib/admin-auth";
import { query, execute, nanoid } from "@/lib/db";

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
 * GET /api/cli/apps
 * 
 * List all apps (admin only).
 */
export async function GET(request: NextRequest) {
  const env = getEnv();
  
  const user = await requireAdmin(request, env);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const apps = await query<App>(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, is_published
     FROM apps
     ORDER BY name`,
    [],
    env
  );
  
  return NextResponse.json(apps);
}

/**
 * POST /api/cli/apps
 * 
 * Register a new app (admin only).
 */
export async function POST(request: NextRequest) {
  const env = getEnv();
  
  const user = await requireAdmin(request, env);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  let body: { bundleId?: string; name?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  
  const { bundleId, name, slug } = body;
  
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  
  // Generate slug if not provided
  const appSlug = slug || name
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  // Check if slug already exists
  const existing = await query<{ id: string }>(
    `SELECT id FROM apps WHERE slug = ?`,
    [appSlug],
    env
  );
  
  if (existing.length > 0) {
    return NextResponse.json(
      { error: `App with slug "${appSlug}" already exists` },
      { status: 409 }
    );
  }
  
  const id = nanoid();
  
  try {
    await execute(
      `INSERT INTO apps (id, slug, name, platforms, is_published)
       VALUES (?, ?, ?, '["macos"]', 0)`,
      [id, appSlug, name],
      env
    );
    
    return NextResponse.json({
      id,
      slug: appSlug,
      name,
      platforms: '["macos"]',
      is_published: false,
    });
  } catch (error) {
    console.error("Failed to create app:", error);
    return NextResponse.json(
      { error: "Failed to create app" },
      { status: 500 }
    );
  }
}
