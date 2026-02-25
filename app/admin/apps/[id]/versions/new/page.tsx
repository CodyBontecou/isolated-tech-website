import { Metadata } from "next";
import Link from "next/link";
import { VersionUploadForm } from "./version-upload-form";

export const metadata: Metadata = {
  title: "Upload Version — Admin — ISOLATED.TECH",
};

// Mock app data
const MOCK_APPS: Record<string, { id: string; name: string; slug: string }> = {
  app_voxboard_001: { id: "app_voxboard_001", name: "Voxboard", slug: "voxboard" },
  app_syncmd_001: { id: "app_syncmd_001", name: "sync.md", slug: "syncmd" },
  app_healthmd_001: { id: "app_healthmd_001", name: "health.md", slug: "healthmd" },
  app_imghost_001: { id: "app_imghost_001", name: "imghost", slug: "imghost" },
};

export default function NewVersionPage({ params }: { params: { id: string } }) {
  // TODO: Fetch from D1
  const app = MOCK_APPS[params.id] || { id: params.id, name: "App", slug: "app" };

  return (
    <>
      <header className="admin-header">
        <Link href={`/admin/apps/${params.id}`} className="app-page__back">
          ← BACK TO {app.name.toUpperCase()}
        </Link>
        <h1 className="admin-header__title">Upload New Version</h1>
        <p className="admin-header__subtitle">
          Upload a new version for {app.name}
        </p>
      </header>

      <div style={{ maxWidth: "600px" }}>
        <VersionUploadForm appId={app.id} appSlug={app.slug} />
      </div>
    </>
  );
}
