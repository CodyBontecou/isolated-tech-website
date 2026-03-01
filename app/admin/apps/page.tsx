import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getPlatforms } from "@/lib/app-data";

export const metadata: Metadata = {
  title: "Apps — Admin — ISOLATED.TECH",
};

interface App {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  platforms: string;
  min_price_cents: number;
  suggested_price_cents: number | null;
  is_published: number;
  is_featured: number;
  featured_order: number;
  created_at: string;
  version_count: number;
  purchase_count: number;
}

async function getApps(): Promise<App[]> {
  const env = getEnv();

  const apps = await query<{
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    platforms: string;
    min_price_cents: number;
    suggested_price_cents: number | null;
    is_published: number;
    is_featured: number;
    featured_order: number;
    created_at: string;
  }>(
    `SELECT 
       id,
       name,
       slug,
       tagline,
       platforms,
       min_price_cents,
       suggested_price_cents,
       is_published,
       COALESCE(is_featured, 0) as is_featured,
       COALESCE(featured_order, 0) as featured_order,
       created_at
     FROM apps
     ORDER BY is_featured DESC, featured_order ASC, created_at DESC`,
    [],
    env
  );

  // Get version and purchase counts for each app
  const appIds = apps.map((a) => a.id);
  if (appIds.length === 0) {
    return [];
  }

  // Get version counts
  const versionCounts = await query<{ app_id: string; count: number }>(
    `SELECT app_id, COUNT(*) as count 
     FROM app_versions 
     GROUP BY app_id`,
    [],
    env
  );

  // Get purchase counts
  const purchaseCounts = await query<{ app_id: string; count: number }>(
    `SELECT app_id, COUNT(*) as count 
     FROM purchases 
     WHERE status = 'completed'
     GROUP BY app_id`,
    [],
    env
  );

  // Build count maps
  const versionMap = new Map<string, number>();
  for (const v of versionCounts) {
    versionMap.set(v.app_id, v.count);
  }

  const purchaseMap = new Map<string, number>();
  for (const p of purchaseCounts) {
    purchaseMap.set(p.app_id, p.count);
  }

  return apps.map((app) => ({
    ...app,
    version_count: versionMap.get(app.id) || 0,
    purchase_count: purchaseMap.get(app.id) || 0,
  }));
}

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

function PlatformBadges({ platforms }: { platforms: string }) {
  const list = getPlatforms(platforms);

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

export default async function AdminAppsPage() {
  const apps = await getApps();

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

      {apps.length > 0 ? (
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
                <th>FEATURED</th>
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
                    (!app.suggested_price_cents || app.suggested_price_cents === 0) ? (
                      "Free"
                    ) : (
                      <>
                        {formatPrice(app.min_price_cents)}
                        {app.suggested_price_cents && app.suggested_price_cents > 0 && (
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
                    {app.is_featured ? (
                      <span style={{ color: "#fbbf24", fontSize: "0.7rem" }}>
                        ★ {app.featured_order === 0 ? "HERO" : `#${app.featured_order}`}
                      </span>
                    ) : (
                      <span style={{ color: "var(--gray)", fontSize: "0.7rem" }}>
                        —
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
      ) : (
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
