import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppForm } from "../../new/app-form";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Edit App — Admin — ISOLATED.TECH",
};

interface AppData {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  screenshots: string | null;
  platforms: string;
  min_price_cents: number;
  suggested_price_cents: number | null;
  is_published: number;
  is_featured: number;
  featured_order: number;
  custom_page_config: string | null;
  github_url: string | null;
}

async function getApp(id: string): Promise<AppData | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  const app = await env.DB.prepare(
    `SELECT id, name, slug, tagline, description, icon_url, screenshots, platforms, 
            min_price_cents, suggested_price_cents, is_published,
            COALESCE(is_featured, 0) as is_featured,
            COALESCE(featured_order, 0) as featured_order,
            custom_page_config,
            github_url
     FROM apps WHERE id = ?`
  )
    .bind(id)
    .first<AppData>();

  return app || null;
}

function parsePlatforms(platforms: string): string[] {
  try {
    // Handle JSON array format: '["macos","ios"]'
    const parsed = JSON.parse(platforms);
    if (Array.isArray(parsed)) return parsed;
    return [platforms];
  } catch {
    // Handle comma-separated or single value
    return platforms.split(",").map((p) => p.trim().replace(/"/g, ""));
  }
}

export default async function EditAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await getApp(id);

  if (!app) {
    notFound();
  }

  const existingApp = {
    id: app.id,
    name: app.name,
    slug: app.slug,
    tagline: app.tagline || "",
    description: app.description || "",
    icon_url: app.icon_url,
    screenshots: app.screenshots ? JSON.parse(app.screenshots) : [],
    platforms: parsePlatforms(app.platforms),
    min_price_cents: app.min_price_cents,
    suggested_price_cents: app.suggested_price_cents || 0,
    is_published: app.is_published === 1,
    is_featured: app.is_featured === 1,
    featured_order: app.featured_order,
    page_config: app.custom_page_config ? JSON.parse(app.custom_page_config) : null,
    github_url: app.github_url || "",
  };

  return (
    <>
      <header className="admin-header">
        <a href={`/admin/apps/${id}`} className="app-page__back">
          ← BACK TO {app.name.toUpperCase()}
        </a>
        <h1 className="admin-header__title">Edit {app.name}</h1>
        <p className="admin-header__subtitle">
          Update app details, pricing, and visibility
        </p>
      </header>

      <div style={{ maxWidth: "700px" }}>
        <AppForm existingApp={existingApp} />
      </div>
    </>
  );
}
