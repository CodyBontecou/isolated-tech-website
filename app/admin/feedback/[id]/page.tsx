import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { FeedbackActions } from "./feedback-actions";

export const metadata: Metadata = {
  title: "Feedback Detail — Admin — ISOLATED.TECH",
};

interface FeedbackDetail {
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
  updated_at: string;
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function getFeedback(id: string): Promise<FeedbackDetail | null> {
  const env = getEnv();

  const item = await queryOne<{
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
    updated_at: string;
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
       f.created_at,
       f.updated_at
     FROM feedback f
     JOIN "user" u ON f.user_id = u.id
     JOIN apps a ON f.app_id = a.id
     WHERE f.id = ?`,
    [id],
    env
  );

  return item;
}

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const feedback = await getFeedback(id);

  if (!feedback) {
    notFound();
  }

  const isBug = feedback.type === "bug";

  return (
    <>
      <header className="admin-header">
        <div style={{ marginBottom: "0.75rem" }}>
          <Link
            href="/admin/feedback"
            style={{
              fontSize: "0.7rem",
              color: "var(--gray)",
              textDecoration: "none",
            }}
          >
            ← Back to Feedback
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              padding: "0.25rem 0.6rem",
              fontSize: "0.65rem",
              fontWeight: 600,
              background: isBug
                ? "rgba(248, 113, 113, 0.1)"
                : "rgba(96, 165, 250, 0.1)",
              color: isBug ? "#f87171" : "#60a5fa",
              border: `1px solid ${isBug ? "#f8717130" : "#60a5fa30"}`,
            }}
          >
            {isBug ? "BUG REPORT" : "FEEDBACK"}
          </span>
        </div>
        <h1 className="admin-header__title" style={{ marginTop: "0.5rem" }}>
          {feedback.subject}
        </h1>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem" }}>
        {/* Main Content */}
        <div>
          {/* Message Body */}
          <section className="admin-section">
            <h2 className="admin-section__title">MESSAGE</h2>
            <div
              style={{
                padding: "1.5rem",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                fontSize: "0.9rem",
              }}
            >
              {feedback.body}
            </div>
          </section>

          {/* Admin Notes */}
          <section className="admin-section" style={{ marginTop: "2rem" }}>
            <h2 className="admin-section__title">ADMIN NOTES</h2>
            <FeedbackActions
              feedbackId={feedback.id}
              currentStatus={feedback.status}
              currentNotes={feedback.admin_notes}
            />
          </section>
        </div>

        {/* Sidebar */}
        <div>
          {/* Details */}
          <section className="admin-section">
            <h2 className="admin-section__title">DETAILS</h2>
            <div
              style={{
                padding: "1rem",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--gray)",
                    letterSpacing: "0.1em",
                    marginBottom: "0.25rem",
                  }}
                >
                  APP
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  <Link
                    href={`/admin/apps/${feedback.app_id}`}
                    style={{ color: "var(--text)", textDecoration: "none" }}
                  >
                    {feedback.app_name}
                  </Link>
                  {feedback.app_version && (
                    <span style={{ color: "var(--gray)", marginLeft: "0.5rem" }}>
                      v{feedback.app_version}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--gray)",
                    letterSpacing: "0.1em",
                    marginBottom: "0.25rem",
                  }}
                >
                  FROM
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  {feedback.user_name || "Anonymous"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--gray)" }}>
                  <a
                    href={`mailto:${feedback.user_email}`}
                    style={{ color: "inherit" }}
                  >
                    {feedback.user_email}
                  </a>
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--gray)",
                    letterSpacing: "0.1em",
                    marginBottom: "0.25rem",
                  }}
                >
                  SUBMITTED
                </div>
                <div style={{ fontSize: "0.85rem" }}>
                  {formatDateTime(feedback.created_at)}
                </div>
              </div>

              {feedback.updated_at !== feedback.created_at && (
                <div>
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--gray)",
                      letterSpacing: "0.1em",
                      marginBottom: "0.25rem",
                    }}
                  >
                    UPDATED
                  </div>
                  <div style={{ fontSize: "0.85rem" }}>
                    {formatDateTime(feedback.updated_at)}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="admin-section" style={{ marginTop: "1.5rem" }}>
            <h2 className="admin-section__title">QUICK ACTIONS</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <a
                href={`mailto:${feedback.user_email}?subject=Re: ${encodeURIComponent(feedback.subject)}&body=${encodeURIComponent(`Hi ${feedback.user_name || "there"},\n\nThank you for your ${feedback.type === "bug" ? "bug report" : "feedback"} regarding ${feedback.app_name}.\n\n`)}`}
                className="auth-btn auth-btn--outline"
                style={{ width: "100%", textAlign: "center" }}
              >
                REPLY VIA EMAIL
              </a>
              <Link
                href={`/admin/apps/${feedback.app_id}`}
                className="auth-btn auth-btn--outline"
                style={{ width: "100%", textAlign: "center" }}
              >
                VIEW APP →
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
