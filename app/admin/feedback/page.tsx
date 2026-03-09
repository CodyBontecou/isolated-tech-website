import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Feedback — Admin — ISOLATED.TECH",
};

interface FeedbackItem {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  app_id: string;
  app_name: string;
  app_slug: string;
  app_version: string | null;
  type: "feedback" | "bug";
  subject: string;
  body: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  admin_notes: string | null;
  created_at: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffHours < 48) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    open: { bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6" },
    in_progress: { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b" },
    resolved: { bg: "rgba(34, 197, 94, 0.1)", text: "#22c55e" },
    closed: { bg: "rgba(107, 114, 128, 0.1)", text: "#6b7280" },
  };

  const color = colors[status] || colors.open;
  const label = status.replace("_", " ").toUpperCase();

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.24rem 0.55rem",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        background: color.bg,
        color: color.text,
        border: `1px solid ${color.text}30`,
      }}
    >
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: "feedback" | "bug" }) {
  const isBug = type === "bug";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.24rem 0.55rem",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        background: isBug ? "rgba(248, 113, 113, 0.12)" : "rgba(96, 165, 250, 0.12)",
        color: isBug ? "#f87171" : "#60a5fa",
        border: `1px solid ${isBug ? "#f8717130" : "#60a5fa30"}`,
      }}
    >
      {isBug ? "BUG" : "FEEDBACK"}
    </span>
  );
}

async function getFeedbackItems(): Promise<FeedbackItem[]> {
  const env = getEnv();

  const items = await query<{
    id: string;
    user_id: string;
    user_name: string | null;
    user_email: string;
    app_id: string;
    app_name: string;
    app_slug: string;
    app_version: string | null;
    type: "feedback" | "bug";
    subject: string;
    body: string;
    status: "open" | "in_progress" | "resolved" | "closed";
    admin_notes: string | null;
    created_at: string;
  }>(
    `SELECT 
       f.id,
       f.user_id,
       u.name as user_name,
       u.email as user_email,
       f.app_id,
       a.name as app_name,
       a.slug as app_slug,
       f.app_version,
       f.type,
       f.subject,
       f.body,
       f.status,
       f.admin_notes,
       f.created_at
     FROM feedback f
     JOIN "user" u ON f.user_id = u.id
     JOIN apps a ON f.app_id = a.id
     ORDER BY 
       CASE f.status 
         WHEN 'open' THEN 1 
         WHEN 'in_progress' THEN 2 
         WHEN 'resolved' THEN 3 
         WHEN 'closed' THEN 4 
       END,
       f.created_at DESC`,
    [],
    env
  );

  return items;
}

export default async function AdminFeedbackPage() {
  const feedbackItems = await getFeedbackItems();

  const openCount = feedbackItems.filter((f) => f.status === "open").length;
  const bugCount = feedbackItems.filter((f) => f.type === "bug" && f.status !== "closed").length;

  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">Feedback & Bug Reports</h1>
        <p className="admin-header__subtitle">
          {openCount} open{openCount !== 1 ? "" : ""} • {bugCount} bug{bugCount !== 1 ? "s" : ""} pending
        </p>
      </header>

      {feedbackItems.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "var(--text-secondary)",
            fontSize: "0.95rem",
            lineHeight: 1.7,
          }}
        >
          No feedback yet. When users submit feedback or bug reports, they'll appear here.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>TYPE</th>
                <th>SUBJECT</th>
                <th>APP</th>
                <th>FROM</th>
                <th>STATUS</th>
                <th>DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {feedbackItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <TypeBadge type={item.type} />
                  </td>
                  <td>
                    <div style={{ maxWidth: "200px" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: "var(--text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.subject}
                      </div>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.28rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.5,
                        }}
                      >
                        {item.body.substring(0, 60)}...
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span style={{ fontWeight: 500 }}>{item.app_name}</span>
                      {item.app_version && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.82rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          v{item.app_version}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="admin-table__user">
                      <span className="admin-table__user-name">
                        {item.user_name || "Anonymous"}
                      </span>
                      <span className="admin-table__user-email">
                        {item.user_email}
                      </span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="admin-table__date">
                    {formatDate(item.created_at)}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <Link
                        href={`/admin/feedback/${item.id}`}
                        className="admin-table__btn"
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
      )}
    </>
  );
}
