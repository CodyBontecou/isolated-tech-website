import { Metadata } from "next";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { DownloadsTable } from "./downloads-table";

export const metadata: Metadata = {
  title: "Downloads — Admin — ISOLATED.TECH",
};

interface Download {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  app_id: string;
  app_name: string;
  app_slug: string;
  version_id: string;
  version_string: string;
  download_type: string;
  country: string | null;
  downloaded_at: string;
}

interface DownloadStats {
  total_downloads: number;
  unique_users: number;
  downloads_today: number;
  downloads_this_week: number;
}

async function getDownloads(): Promise<Download[]> {
  const env = getEnv();

  const downloads = await query<Download>(
    `SELECT 
       d.id,
       d.user_id,
       u.email as user_email,
       u.name as user_name,
       d.app_id,
       a.name as app_name,
       a.slug as app_slug,
       d.version_id,
       d.version_string,
       d.download_type,
       d.country,
       d.downloaded_at
     FROM downloads d
     JOIN user u ON d.user_id = u.id
     JOIN apps a ON d.app_id = a.id
     ORDER BY d.downloaded_at DESC
     LIMIT 500`,
    [],
    env
  );

  return downloads;
}

async function getStats(): Promise<DownloadStats> {
  const env = getEnv();

  const stats = await query<{
    total_downloads: number;
    unique_users: number;
    downloads_today: number;
    downloads_this_week: number;
  }>(
    `SELECT 
       COUNT(*) as total_downloads,
       COUNT(DISTINCT user_id) as unique_users,
       SUM(CASE WHEN downloaded_at >= date('now') THEN 1 ELSE 0 END) as downloads_today,
       SUM(CASE WHEN downloaded_at >= date('now', '-7 days') THEN 1 ELSE 0 END) as downloads_this_week
     FROM downloads`,
    [],
    env
  );

  return stats[0] || {
    total_downloads: 0,
    unique_users: 0,
    downloads_today: 0,
    downloads_this_week: 0,
  };
}

export default async function AdminDownloadsPage() {
  const [downloads, stats] = await Promise.all([getDownloads(), getStats()]);

  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">Downloads</h1>
        <p className="admin-header__subtitle">
          {stats.total_downloads} total downloads • {stats.unique_users} unique users
        </p>
      </header>

      {/* Stats cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="stat-card">
          <div className="stat-card__value">{stats.downloads_today}</div>
          <div className="stat-card__label">Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.downloads_this_week}</div>
          <div className="stat-card__label">This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.total_downloads}</div>
          <div className="stat-card__label">All Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__value">{stats.unique_users}</div>
          <div className="stat-card__label">Unique Users</div>
        </div>
      </div>

      {downloads.length > 0 ? (
        <>
          <DownloadsTable downloads={downloads} />

          {/* Pagination info */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1rem",
              fontSize: "0.8rem",
              color: "var(--gray)",
            }}
          >
            <span>Showing latest {downloads.length} downloads</span>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <h2 className="empty-state__title">No downloads yet</h2>
          <p className="empty-state__text">
            Downloads will appear here once users start downloading apps.
          </p>
        </div>
      )}

      <style jsx>{`
        .stat-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1.25rem;
          text-align: center;
        }
        .stat-card__value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--white);
          line-height: 1;
        }
        .stat-card__label {
          font-size: 0.75rem;
          color: var(--gray);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.5rem;
        }
      `}</style>
    </>
  );
}
