import { Metadata } from "next";
import Link from "next/link";
import { getEnv } from "@/lib/cloudflare-context";
import { notFound, redirect } from "next/navigation";
import { MediaForm } from "./media-form";

export const metadata: Metadata = {
  title: "Manage Media — Admin — ISOLATED.TECH",
};

interface App {
  id: string;
  name: string;
  slug: string;
}

interface MediaItem {
  id: string;
  type: "image" | "youtube";
  url: string;
  title: string | null;
  sort_order: number;
}

async function getApp(id: string): Promise<App | null> {
  const env = getEnv();
  if (!env?.DB) return null;
  
  const app = await env.DB.prepare(
    `SELECT id, name, slug FROM apps WHERE id = ?`
  )
    .bind(id)
    .first<App>();
  
  return app || null;
}

async function getAppMedia(appId: string): Promise<MediaItem[]> {
  const env = getEnv();
  if (!env?.DB) return [];
  
  const result = await env.DB.prepare(
    `SELECT id, type, url, title, sort_order
     FROM app_media
     WHERE app_id = ?
     ORDER BY sort_order ASC, created_at ASC`
  )
    .bind(appId)
    .all<MediaItem>();
  
  return result.results || [];
}

export default async function MediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await getApp(id);
  
  if (!app) {
    notFound();
  }
  
  const media = await getAppMedia(app.id);
  
  return (
    <>
      <header className="admin-header">
        <a href={`/admin/apps/${id}`} className="app-page__back">
          ← BACK TO {app.name.toUpperCase()}
        </a>
        <h1 className="admin-header__title">MEDIA SHOWCASE</h1>
        <p className="admin-header__subtitle">
          Add images and YouTube videos to showcase {app.name}
        </p>
      </header>

      <MediaForm appId={app.id} initialMedia={media} />
    </>
  );
}
