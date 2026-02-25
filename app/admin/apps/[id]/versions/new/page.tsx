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
  distribution_type: string | null;
}

async function getApp(id: string): Promise<AppRow | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  const app = await env.DB.prepare(
    `SELECT id, name, slug, COALESCE(distribution_type, 'binary') as distribution_type FROM apps WHERE id = ?`
  )
    .bind(id)
    .first<AppRow>();

  return app || null;
}

export default async function NewVersionPage({ params }: { params: { id: string } }) {
  const app = await getApp(params.id) || { id: params.id, name: "App", slug: "app", distribution_type: "binary" };

  return (
    <>
      <header className="admin-header">
        <Link href={`/admin/apps/${params.id}`} className="app-page__back">
          ← BACK TO {app.name.toUpperCase()}
        </Link>
        <h1 className="admin-header__title">Upload New Version</h1>
        <p className="admin-header__subtitle">
          Upload a new {app.distribution_type === "source_code" ? "source code" : ""} version for {app.name}
        </p>
      </header>

      <div style={{ maxWidth: "600px" }}>
        <VersionUploadForm
          appId={app.id}
          appSlug={app.slug}
          distributionType={app.distribution_type || "binary"}
        />
      </div>
    </>
  );
}
