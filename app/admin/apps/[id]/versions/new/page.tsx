import { Metadata } from "next";
import Link from "next/link";
import { VersionUploadForm } from "./version-upload-form";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Upload Version — Admin — ISOLATED.TECH",
};

interface AppRow {
  id: string;
  name: string;
  slug: string;
}

async function getApp(id: string): Promise<AppRow | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  const app = await env.DB.prepare(
    `SELECT id, name, slug FROM apps WHERE id = ?`
  )
    .bind(id)
    .first<AppRow>();

  return app || null;
}

export default async function NewVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await getApp(id) || { id, name: "App", slug: "app" };

  return (
    <>
      <header className="admin-header">
        <a href={`/admin/apps/${id}`} className="app-page__back">
          ← BACK TO {app.name.toUpperCase()}
        </a>
        <h1 className="admin-header__title">Upload New Version</h1>
        <p className="admin-header__subtitle">
          Upload a new version for {app.name}
        </p>
      </header>

      <div style={{ maxWidth: "600px" }}>
        <VersionUploadForm
          appId={app.id}
          appSlug={app.slug}
        />
      </div>
    </>
  );
}
