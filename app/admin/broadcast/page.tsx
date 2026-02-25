import { Metadata } from "next";
import { BroadcastForm } from "./broadcast-form";

export const metadata: Metadata = {
  title: "Broadcast — Admin — ISOLATED.TECH",
};

// Mock data for apps
const APPS = [
  { id: "app_voxboard_001", name: "Voxboard", purchaser_count: 45 },
  { id: "app_syncmd_001", name: "sync.md", purchaser_count: 28 },
  { id: "app_healthmd_001", name: "health.md", purchaser_count: 12 },
  { id: "app_imghost_001", name: "imghost", purchaser_count: 67 },
];

// Mock stats
const STATS = {
  total_users: 156,
  newsletter_subscribers: 89,
  recent_broadcasts: [
    {
      id: "b1",
      subject: "Voxboard 1.2.0 Released!",
      audience: "app",
      app_name: "Voxboard",
      sent_count: 45,
      sent_at: "2026-02-20T12:00:00Z",
    },
    {
      id: "b2",
      subject: "February Newsletter",
      audience: "newsletter",
      app_name: null,
      sent_count: 78,
      sent_at: "2026-02-01T10:00:00Z",
    },
  ],
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminBroadcastPage() {
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
          <div className="admin-stat__value">{STATS.total_users}</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__label">NEWSLETTER SUBSCRIBERS</div>
          <div className="admin-stat__value">{STATS.newsletter_subscribers}</div>
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
          <BroadcastForm apps={APPS} stats={STATS} />
        </div>
      </section>

      {/* Recent Broadcasts */}
      <section className="admin-section" style={{ marginTop: "2rem" }}>
        <h2 className="admin-section__title">RECENT BROADCASTS</h2>
        {STATS.recent_broadcasts.length === 0 ? (
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
                {STATS.recent_broadcasts.map((broadcast) => (
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
