import { Metadata } from "next";
import { BroadcastForm } from "./broadcast-form";
import { query, queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Broadcast — Admin — ISOLATED.TECH",
};

interface AppWithCount {
  id: string;
  name: string;
  purchaser_count: number;
}

interface BroadcastStats {
  total_users: number;
  newsletter_subscribers: number;
  recent_broadcasts: {
    id: string;
    subject: string;
    audience: string;
    app_name: string | null;
    sent_count: number;
    sent_at: string;
  }[];
}

async function getAppsWithPurchaserCounts(): Promise<AppWithCount[]> {
  const env = getEnv();
  return query<AppWithCount>(
    `SELECT 
       a.id, 
       a.name,
       COUNT(DISTINCT p.user_id) as purchaser_count
     FROM apps a
     LEFT JOIN purchases p ON p.app_id = a.id AND p.status = 'completed'
     GROUP BY a.id, a.name
     ORDER BY a.name ASC`,
    [],
    env
  );
}

async function getBroadcastStats(): Promise<BroadcastStats> {
  const env = getEnv();

  // Total users
  const usersResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM users`,
    [],
    env
  );

  // Newsletter subscribers
  const subscribersResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM users WHERE newsletter_subscribed = 1`,
    [],
    env
  );

  // Recent broadcasts (from email_log where event_type starts with 'broadcast:')
  const recentBroadcasts = await query<{
    id: string;
    subject: string;
    event_type: string;
    sent_at: string;
  }>(
    `SELECT id, subject, event_type, sent_at
     FROM email_log
     WHERE event_type LIKE 'broadcast:%'
     ORDER BY sent_at DESC
     LIMIT 10`,
    [],
    env
  );

  // Map event_type to audience format
  const formattedBroadcasts = recentBroadcasts.map((b) => {
    const audienceType = b.event_type.replace("broadcast:", "");
    return {
      id: b.id,
      subject: b.subject || "No subject",
      audience: audienceType,
      app_name: null, // We don't store app name in email_log currently
      sent_count: 0, // Would need a separate count table to track this
      sent_at: b.sent_at,
    };
  });

  return {
    total_users: usersResult?.count ?? 0,
    newsletter_subscribers: subscribersResult?.count ?? 0,
    recent_broadcasts: formattedBroadcasts,
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminBroadcastPage() {
  const [apps, stats] = await Promise.all([
    getAppsWithPurchaserCounts(),
    getBroadcastStats(),
  ]);

  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">Broadcast</h1>
        <p className="admin-header__subtitle">
          Send emails to your users and customers
        </p>
      </header>

      {/* Stats */}
      <div className="admin-stats" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat">
          <div className="admin-stat__label">TOTAL USERS</div>
          <div className="admin-stat__value">{stats.total_users}</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__label">NEWSLETTER SUBSCRIBERS</div>
          <div className="admin-stat__value">{stats.newsletter_subscribers}</div>
        </div>
      </div>

      {/* Compose Form */}
      <section className="admin-section">
        <h2 className="admin-section__title">COMPOSE EMAIL</h2>
        <div
          style={{
            background: "var(--gray-dark)",
            border: "var(--border)",
            padding: "1.5rem",
          }}
        >
          <BroadcastForm apps={apps} stats={stats} />
        </div>
      </section>

      {/* Recent Broadcasts */}
      <section className="admin-section" style={{ marginTop: "2rem" }}>
        <h2 className="admin-section__title">RECENT BROADCASTS</h2>
        {stats.recent_broadcasts.length === 0 ? (
          <p style={{ color: "var(--gray)", fontSize: "0.85rem" }}>
            No broadcasts sent yet.
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>SUBJECT</th>
                  <th>AUDIENCE</th>
                  <th>SENT</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_broadcasts.map((broadcast) => (
                  <tr key={broadcast.id}>
                    <td style={{ fontWeight: 600 }}>{broadcast.subject}</td>
                    <td>
                      {broadcast.audience === "newsletter" && "Newsletter Subscribers"}
                      {broadcast.audience === "app" && `${broadcast.app_name} Purchasers`}
                      {broadcast.audience === "all" && "All Users"}
                    </td>
                    <td>{broadcast.sent_count} emails</td>
                    <td className="admin-table__date">
                      {formatDate(broadcast.sent_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
