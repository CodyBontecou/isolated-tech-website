import { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { FeatureRequestActions } from "./feature-request-actions";

export const metadata: Metadata = {
  title: "Feature Requests — Admin — ISOLATED.TECH",
};

interface FeatureRequest {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  app_id: string | null;
  app_name: string | null;
  type: "feature" | "bug" | "improvement";
  title: string;
  body: string;
  status: "open" | "planned" | "in_progress" | "completed" | "closed";
  admin_response: string | null;
  priority: number;
  vote_count: number;
  comment_count: number;
  created_at: string;
}

async function getFeatureRequests(): Promise<FeatureRequest[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<FeatureRequest>(
    `SELECT 
       fr.id,
       fr.user_id,
       u.name as user_name,
       u.email as user_email,
       fr.app_id,
       a.name as app_name,
       fr.type,
       fr.title,
       fr.body,
       fr.status,
       fr.admin_response,
       fr.priority,
       fr.vote_count,
       fr.comment_count,
       fr.created_at
     FROM feature_requests fr
     JOIN "user" u ON fr.user_id = u.id
     LEFT JOIN apps a ON fr.app_id = a.id
     ORDER BY 
       CASE fr.status 
         WHEN 'open' THEN 1 
         WHEN 'planned' THEN 2 
         WHEN 'in_progress' THEN 3 
         WHEN 'completed' THEN 4 
         WHEN 'closed' THEN 5 
       END,
       fr.vote_count DESC,
       fr.created_at DESC`,
    [],
    env
  );
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
    planned: { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b" },
    in_progress: { bg: "rgba(139, 92, 246, 0.1)", text: "#8b5cf6" },
    completed: { bg: "rgba(34, 197, 94, 0.1)", text: "#22c55e" },
    closed: { bg: "rgba(107, 114, 128, 0.1)", text: "#6b7280" },
  };

  const color = colors[status] || colors.open;
  const label = status.replace("_", " ").toUpperCase();

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.5rem",
        fontSize: "0.6rem",
        fontWeight: 600,
        letterSpacing: "0.05em",
        background: color.bg,
        color: color.text,
        border: `1px solid ${color.text}30`,
      }}
    >
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: "feature" | "bug" | "improvement" }) {
  const config = {
    feature: { label: "FEATURE", color: "#60a5fa" },
    bug: { label: "BUG", color: "#f87171" },
    improvement: { label: "IMPROVE", color: "#a78bfa" },
  };
  const { label, color } = config[type];

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.5rem",
        fontSize: "0.6rem",
        fontWeight: 600,
        letterSpacing: "0.05em",
        background: `${color}15`,
        color,
        border: `1px solid ${color}30`,
      }}
    >
      {label}
    </span>
  );
}

export default async function AdminFeatureRequestsPage() {
  const requests = await getFeatureRequests();

  const openCount = requests.filter((r) => r.status === "open").length;
  const plannedCount = requests.filter((r) => r.status === "planned").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;

  return (
    <>
      <header className="admin-header">
        <h1 className="admin-header__title">Feature Requests</h1>
        <p className="admin-header__subtitle">
          {openCount} open • {plannedCount} planned • {inProgressCount} in progress
        </p>
      </header>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat">
          <span className="admin-stat__label">TOTAL REQUESTS</span>
          <span className="admin-stat__value">{requests.length}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat__label">TOTAL VOTES</span>
          <span className="admin-stat__value">
            {requests.reduce((sum, r) => sum + r.vote_count, 0)}
          </span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat__label">TOTAL COMMENTS</span>
          <span className="admin-stat__value">
            {requests.reduce((sum, r) => sum + r.comment_count, 0)}
          </span>
        </div>
      </div>

      {requests.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "var(--gray)",
            fontSize: "0.85rem",
          }}
        >
          No feature requests yet. When users submit feedback, they'll appear here.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>VOTES</th>
                <th>TYPE</th>
                <th>TITLE</th>
                <th>APP</th>
                <th>FROM</th>
                <th>STATUS</th>
                <th>DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <span style={{ fontWeight: 700, fontSize: "1rem" }}>
                      {request.vote_count}
                    </span>
                  </td>
                  <td>
                    <TypeBadge type={request.type} />
                  </td>
                  <td>
                    <div style={{ maxWidth: "250px" }}>
                      <div
                        style={{
                          fontWeight: 500,
                          color: "var(--text)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {request.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--gray)",
                          marginTop: "0.2rem",
                        }}
                      >
                        {request.comment_count} comments
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: request.app_name ? "var(--text)" : "var(--gray)" }}>
                      {request.app_name || "General"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table__user">
                      <span className="admin-table__user-name">
                        {request.user_name || "Anonymous"}
                      </span>
                      <span className="admin-table__user-email">
                        {request.user_email}
                      </span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="admin-table__date">
                    {formatDate(request.created_at)}
                  </td>
                  <td>
                    <div className="admin-table__actions">
                      <Link
                        href={`/feedback/${request.id}`}
                        className="admin-table__btn"
                        target="_blank"
                      >
                        VIEW
                      </Link>
                      <FeatureRequestActions
                        id={request.id}
                        currentStatus={request.status}
                        currentPriority={request.priority}
                        currentResponse={request.admin_response}
                      />
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
