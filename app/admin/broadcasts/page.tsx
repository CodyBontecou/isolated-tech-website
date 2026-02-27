import { Metadata } from "next";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Broadcasts — Admin — ISOLATED.TECH",
};

interface Broadcast {
  id: string;
  subject: string;
  recipient_count: number;
  status: string;
  sent_at: string | null;
  created_at: string;
  sent_by_name: string | null;
}

async function getBroadcasts(): Promise<Broadcast[]> {
  const env = getEnv();
  try {
    return await query<Broadcast>(
      `SELECT b.id, b.subject, b.recipient_count, b.status, b.sent_at, b.created_at,
              u.name as sent_by_name
       FROM broadcasts b
       LEFT JOIN "user" u ON b.sent_by = u.id
       ORDER BY b.created_at DESC`,
      [],
      env
    );
  } catch {
    return [];
  }
}

async function getSubscriberCount(): Promise<number> {
  const env = getEnv();
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM subscribers WHERE is_active = 1`
    ).first<{ count: number }>();
    return result?.count || 0;
  } catch {
    return 0;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: "#333", text: "#999" },
    sending: { bg: "#1e40af", text: "#60a5fa" },
    sent: { bg: "#14532d", text: "#4ade80" },
    failed: { bg: "#7f1d1d", text: "#f87171" },
  };

  const { bg, text } = colors[status] || colors.draft;

  return (
    <span
      style={{
        background: bg,
        color: text,
        padding: "0.2rem 0.5rem",
        fontSize: "0.6rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {status}
    </span>
  );
}

export default async function AdminBroadcastsPage() {
  const [broadcasts, subscriberCount] = await Promise.all([
    getBroadcasts(),
    getSubscriberCount(),
  ]);

  const sentCount = broadcasts.filter((b) => b.status === "sent").length;
  const totalRecipients = broadcasts.reduce((sum, b) => sum + b.recipient_count, 0);

  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">Email Broadcasts</h1>
        <p className="admin-header__subtitle">
          {broadcasts.length} broadcast{broadcasts.length !== 1 ? "s" : ""} • {sentCount} sent • {totalRecipients} total recipients
        </p>
      </header>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/admin/broadcasts/new"
          className="auth-btn"
          style={{ width: "auto", padding: "0.5rem 1rem" }}
        >
          + NEW BROADCAST
        </Link>
        <Link
          href="/admin/subscribers"
          className="auth-btn auth-btn--outline"
          style={{ width: "auto", padding: "0.5rem 1rem" }}
        >
          VIEW SUBSCRIBERS ({subscriberCount})
        </Link>
      </div>

      {/* Broadcasts Table */}
      {broadcasts.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>SUBJECT</th>
                <th>STATUS</th>
                <th>RECIPIENTS</th>
                <th>SENT BY</th>
                <th>SENT AT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((broadcast) => (
                <tr key={broadcast.id}>
                  <td style={{ maxWidth: "300px" }}>
                    <span style={{ fontWeight: 600 }}>{broadcast.subject}</span>
                  </td>
                  <td>
                    <StatusBadge status={broadcast.status} />
                  </td>
                  <td>{broadcast.recipient_count}</td>
                  <td style={{ color: "#999" }}>{broadcast.sent_by_name || "—"}</td>
                  <td className="admin-table__date">{formatDate(broadcast.sent_at)}</td>
                  <td>
                    <div className="admin-table__actions">
                      <Link
                        href={`/admin/broadcasts/${broadcast.id}`}
                        className="admin-table__btn"
                      >
                        VIEW
                      </Link>
                      {broadcast.status === "draft" && (
                        <button className="admin-table__btn admin-table__btn--danger">
                          DELETE
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <h2 className="empty-state__title">No broadcasts yet</h2>
          <p className="empty-state__text">
            Create your first email broadcast to reach your subscribers.
          </p>
          <Link
            href="/admin/broadcasts/new"
            className="auth-btn"
            style={{ width: "auto", marginTop: "1rem" }}
          >
            CREATE BROADCAST
          </Link>
        </div>
      )}
    </>
  );
}
