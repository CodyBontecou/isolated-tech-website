import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Edit App — Admin — ISOLATED.TECH",
};

interface Version {
  id: string;
  version: string;
  build_number: number;
  min_os_version: string;
  file_size: number;
  is_latest: number;
  created_at: string;
}

// Mock data
const MOCK_APP = {
  id: "app_voxboard_001",
  name: "Voxboard",
  slug: "voxboard",
  tagline: "Your voice. Your keyboard.",
  platforms: "macos",
  min_price_cents: 0,
  suggested_price_cents: 500,
  is_published: 1,
  distribution_type: "binary",
};

const MOCK_VERSIONS: Version[] = [
  {
    id: "v3",
    version: "1.2.0",
    build_number: 42,
    min_os_version: "14.0",
    file_size: 5242880,
    is_latest: 1,
    created_at: "2026-02-20T12:00:00Z",
  },
  {
    id: "v2",
    version: "1.1.0",
    build_number: 30,
    min_os_version: "13.0",
    file_size: 4980736,
    is_latest: 0,
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "v1",
    version: "1.0.0",
    build_number: 1,
    min_os_version: "13.0",
    file_size: 4718592,
    is_latest: 0,
    created_at: "2026-01-01T00:00:00Z",
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EditAppPage({ params }: { params: { id: string } }) {
  // TODO: Fetch from D1
  const app = MOCK_APP;
  const versions = MOCK_VERSIONS;

  return (
    <>
      <header className="admin-header">
        <Link href="/admin/apps" className="app-page__back">
          ← BACK TO APPS
        </Link>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 className="admin-header__title">{app.name}</h1>
            <p className="admin-header__subtitle">/{app.slug}</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link
              href={`/apps/${app.slug}`}
              className="auth-btn auth-btn--outline"
              style={{ width: "auto" }}
              target="_blank"
            >
              VIEW PAGE
            </Link>
            <Link
              href={`/admin/apps/${params.id}/media`}
              className="auth-btn auth-btn--outline"
              style={{ width: "auto" }}
            >
              MEDIA
            </Link>
            <Link
              href={`/admin/apps/${params.id}/edit`}
              className="auth-btn"
              style={{ width: "auto" }}
            >
              EDIT DETAILS
            </Link>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="admin-stats" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat">
          <div className="admin-stat__label">STATUS</div>
          <div className="admin-stat__value">
            {app.is_published ? (
              <span style={{ color: "#4ade80" }}>Published</span>
            ) : (
              <span style={{ color: "var(--gray)" }}>Draft</span>
            )}
          </div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__label">VERSIONS</div>
          <div className="admin-stat__value">{versions.length}</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__label">LATEST</div>
          <div className="admin-stat__value">
            {versions.find((v) => v.is_latest)?.version || "—"}
          </div>
        </div>
      </div>

      {/* Versions */}
      <section className="admin-section">
        <div className="admin-section__header">
          <h2 className="admin-section__title">VERSIONS</h2>
          <Link
            href={`/admin/apps/${params.id}/versions/new`}
            className="auth-btn"
            style={{ width: "auto" }}
          >
            + UPLOAD VERSION
          </Link>
        </div>

        {versions.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              background: "var(--gray-dark)",
              border: "var(--border)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--gray)", marginBottom: "1rem" }}>
              No versions uploaded yet.
            </p>
            <Link
              href={`/admin/apps/${params.id}/versions/new`}
              className="auth-btn"
              style={{ width: "auto", display: "inline-block" }}
            >
              UPLOAD FIRST VERSION
            </Link>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>VERSION</th>
                  <th>BUILD</th>
                  <th>MIN OS</th>
                  <th>SIZE</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.id}>
                    <td>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                        }}
                      >
                        {version.version}
                      </span>
                    </td>
                    <td>{version.build_number}</td>
                    <td>{version.min_os_version}</td>
                    <td>{formatFileSize(version.file_size)}</td>
                    <td className="admin-table__date">
                      {formatDate(version.created_at)}
                    </td>
                    <td>
                      {version.is_latest ? (
                        <span style={{ color: "#4ade80", fontSize: "0.7rem" }}>
                          LATEST
                        </span>
                      ) : (
                        <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="admin-table__actions">
                        {!version.is_latest && (
                          <button className="admin-table__btn">
                            SET LATEST
                          </button>
                        )}
                        <button className="admin-table__btn admin-table__btn--danger">
                          DELETE
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Danger Zone */}
      <section className="admin-section" style={{ marginTop: "2rem" }}>
        <h2 className="admin-section__title" style={{ color: "#f87171" }}>
          DANGER ZONE
        </h2>
        <div
          style={{
            padding: "1.5rem",
            background: "rgba(248, 113, 113, 0.1)",
            border: "1px solid rgba(248, 113, 113, 0.3)",
          }}
        >
          <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
            Deleting this app will remove all versions and make it unavailable
            for download. Existing purchases will remain in the database.
          </p>
          <button
            className="auth-btn"
            style={{
              width: "auto",
              background: "#f87171",
              borderColor: "#f87171",
            }}
          >
            DELETE APP
          </button>
        </div>
      </section>
    </>
  );
}
