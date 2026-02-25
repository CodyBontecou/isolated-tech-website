import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Apps — Admin — ISOLATED.TECH",
};

interface App {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  platforms: string;
  min_price_cents: number;
  suggested_price_cents: number;
  is_published: number;
  created_at: string;
  version_count: number;
  purchase_count: number;
}

// Mock data
const MOCK_APPS: App[] = [
  {
    id: "app_voxboard_001",
    name: "Voxboard",
    slug: "voxboard",
    tagline: "Voice-to-text for your Mac",
    platforms: "macos",
    min_price_cents: 0,
    suggested_price_cents: 500,
    is_published: 1,
    created_at: "2026-01-01T00:00:00Z",
    version_count: 3,
    purchase_count: 45,
  },
  {
    id: "app_syncmd_001",
    name: "sync.md",
    slug: "syncmd",
    tagline: "Git-backed markdown notes",
    platforms: "macos,ios",
    min_price_cents: 0,
    suggested_price_cents: 1000,
    is_published: 1,
    created_at: "2026-01-15T00:00:00Z",
    version_count: 2,
    purchase_count: 28,
  },
  {
    id: "app_healthmd_001",
    name: "health.md",
    slug: "healthmd",
    tagline: "Apple Health data export",
    platforms: "ios",
    min_price_cents: 0,
    suggested_price_cents: 500,
    is_published: 1,
    created_at: "2026-02-01T00:00:00Z",
    version_count: 1,
    purchase_count: 12,
  },
  {
    id: "app_imghost_001",
    name: "imghost",
    slug: "imghost",
    tagline: "Instant image hosting",
    platforms: "macos",
    min_price_cents: 0,
    suggested_price_cents: 0,
    is_published: 1,
    created_at: "2026-02-10T00:00:00Z",
    version_count: 1,
    purchase_count: 67,
  },
];

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

function PlatformBadges({ platforms }: { platforms: string }) {
  const list = platforms.split(",");
  return (
    <div style={{ display: "flex", gap: "0.25rem" }}>
      {list.includes("macos") && (
        <span
          style={{
            background: "#333",
            padding: "0.15rem 0.4rem",
            fontSize: "0.6rem",
            fontWeight: 700,
          }}
        >
          macOS
        </span>
      )}
      {list.includes("ios") && (
        <span
          style={{
            background: "#333",
            padding: "0.15rem 0.4rem",
            fontSize: "0.6rem",
            fontWeight: 700,
          }}
        >
          iOS
        </span>
      )}
    </div>
  );
}

export default function AdminAppsPage() {
  const apps = MOCK_APPS;

  return (
    <>
      <header className="admin-header">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1 className="admin-header__title">Apps</h1>
            <p className="admin-header__subtitle">
              Manage your app catalog
            </p>
          </div>
          <Link
            href="/admin/apps/new"
            className="auth-btn"
            style={{ width: "auto" }}
          >
            + NEW APP
          </Link>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>APP</th>
              <th>PLATFORMS</th>
              <th>PRICE</th>
              <th>VERSIONS</th>
              <th>PURCHASES</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr key={app.id}>
                <td>
                  <div className="admin-table__user">
                    <span className="admin-table__user-name">{app.name}</span>
                    <span className="admin-table__user-email">/{app.slug}</span>
                  </div>
                </td>
                <td>
                  <PlatformBadges platforms={app.platforms} />
                </td>
                <td className="admin-table__money">
                  {app.min_price_cents === 0 &&
                  app.suggested_price_cents === 0 ? (
                    "Free"
                  ) : (
                    <>
                      {formatPrice(app.min_price_cents)}
                      {app.suggested_price_cents > 0 && (
                        <span style={{ color: "var(--gray)" }}>
                          {" "}
                          (rec: {formatPrice(app.suggested_price_cents)})
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td>{app.version_count}</td>
                <td>{app.purchase_count}</td>
                <td>
                  {app.is_published ? (
                    <span style={{ color: "#4ade80", fontSize: "0.7rem" }}>
                      PUBLISHED
                    </span>
                  ) : (
                    <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                      DRAFT
                    </span>
                  )}
                </td>
                <td>
                  <div className="admin-table__actions">
                    <Link
                      href={`/admin/apps/${app.id}`}
                      className="admin-table__btn"
                    >
                      EDIT
                    </Link>
                    <Link
                      href={`/apps/${app.slug}`}
                      className="admin-table__btn"
                      target="_blank"
                    >
                      VIEW
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {apps.length === 0 && (
        <div className="empty-state">
          <h2 className="empty-state__title">No apps yet</h2>
          <p className="empty-state__text">
            Create your first app to start selling.
          </p>
          <Link
            href="/admin/apps/new"
            className="auth-btn"
            style={{ display: "inline-block" }}
          >
            CREATE APP
          </Link>
        </div>
      )}
    </>
  );
}
