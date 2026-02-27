import { Metadata } from "next";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { VoteButtonClient } from "./vote-button-client";
import { CommentSection } from "./comment-section";
import { AuthorActions } from "./author-actions";
import { SignOutButton } from "@/components/sign-out-button";
import { SiteFooter } from "@/components/site-footer";

interface Props {
  params: Promise<{ id: string }>;
}

interface FeatureRequest {
  id: string;
  user_id: string;
  user_name: string | null;
  user_image: string | null;
  app_id: string | null;
  app_name: string | null;
  app_slug: string | null;
  app_icon: string | null;
  type: "feature" | "bug" | "improvement";
  title: string;
  body: string;
  status: "open" | "planned" | "in_progress" | "completed" | "closed";
  admin_response: string | null;
  vote_count: number;
  comment_count: number;
  created_at: string;
  user_voted: number;
}

interface Comment {
  id: string;
  user_id: string;
  user_name: string | null;
  user_image: string | null;
  body: string;
  is_admin_reply: number;
  created_at: string;
}

async function getFeatureRequest(id: string, userId?: string): Promise<FeatureRequest | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  return queryOne<FeatureRequest>(
    `SELECT 
       fr.id,
       fr.user_id,
       u.name as user_name,
       u.image as user_image,
       fr.app_id,
       a.name as app_name,
       a.slug as app_slug,
       a.icon_url as app_icon,
       fr.type,
       fr.title,
       fr.body,
       fr.status,
       fr.admin_response,
       fr.vote_count,
       fr.comment_count,
       fr.created_at,
       COALESCE((SELECT 1 FROM feature_votes fv WHERE fv.request_id = fr.id AND fv.user_id = ?), 0) as user_voted
     FROM feature_requests fr
     JOIN "user" u ON fr.user_id = u.id
     LEFT JOIN apps a ON fr.app_id = a.id
     WHERE fr.id = ?`,
    [userId || "", id],
    env
  );
}

async function getComments(requestId: string): Promise<Comment[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  return query<Comment>(
    `SELECT 
       c.id,
       c.user_id,
       u.name as user_name,
       u.image as user_image,
       c.body,
       c.is_admin_reply,
       c.created_at
     FROM feature_comments c
     JOIN "user" u ON c.user_id = u.id
     WHERE c.request_id = ?
     ORDER BY c.created_at ASC`,
    [requestId],
    env
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const request = await getFeatureRequest(id);
  
  if (!request) {
    return { title: "Not Found — ISOLATED.TECH" };
  }

  return {
    title: `${request.title} — Feedback — ISOLATED.TECH`,
    description: request.body.slice(0, 160),
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function TypeBadge({ type }: { type: "feature" | "bug" | "improvement" }) {
  const config = {
    feature: { label: "FEATURE", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.1)" },
    bug: { label: "🐛 BUG", color: "#f87171", bg: "rgba(248, 113, 113, 0.1)" },
    improvement: { label: "IMPROVEMENT", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)" },
  };
  const { label, color, bg } = config[type];

  return (
    <span
      className="feedback-type-badge"
      style={{ background: bg, color, borderColor: `${color}30` }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; bg: string }> = {
    open: { label: "OPEN", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
    planned: { label: "PLANNED", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
    in_progress: { label: "IN PROGRESS", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
    completed: { label: "COMPLETED", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
    closed: { label: "CLOSED", color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)" },
  };
  const { label, color, bg } = config[status] || config.open;

  return (
    <span
      className="feedback-status-badge"
      style={{ background: bg, color, borderColor: `${color}30` }}
    >
      {label}
    </span>
  );
}

export default async function FeedbackDetailPage({ params }: Props) {
  const { id } = await params;
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;
  const [request, comments] = await Promise.all([
    getFeatureRequest(id, user?.id),
    getComments(id),
  ]);

  if (!request) {
    notFound();
  }

  return (
    <>
      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </a>
        <div className="nav__links">
          <a href="/#apps">APPS</a>
          <a href="/feedback">FEEDBACK</a>
          <a href="/roadmap">ROADMAP</a>
          {user ? (
            <>
              {user.isAdmin && <a href="/admin">ADMIN</a>}
              <a href="/dashboard">DASHBOARD</a>
              <SignOutButton />
            </>
          ) : (
            <a href="/auth/login">SIGN IN</a>
          )}
        </div>
      </nav>

      {/* MAIN */}
      <main className="feedback-detail">
        <div className="feedback-detail__container">
          <Link href="/feedback" className="feedback-detail__back">
            ← Back to Feedback
          </Link>

          <article className="feedback-detail__card">
            <div className="feedback-detail__grid">
              {/* Vote Button */}
              <VoteButtonClient
                requestId={request.id}
                initialVoteCount={request.vote_count}
                initialVoted={request.user_voted === 1}
                isLoggedIn={!!user}
              />

              {/* Content */}
              <div className="feedback-detail__content">
                <div className="feedback-detail__header">
                  <div className="feedback-detail__badges">
                    <TypeBadge type={request.type} />
                    <StatusBadge status={request.status} />
                  </div>
                  {request.app_name && (
                    <Link href={`/apps/${request.app_slug}`} className="feedback-detail__app">
                      {request.app_icon && (
                        <img src={request.app_icon} alt="" className="feedback-detail__app-icon" />
                      )}
                      <span>{request.app_name}</span>
                    </Link>
                  )}
                </div>

                <h1 className="feedback-detail__title">{request.title}</h1>

                {/* Author Actions (edit/delete) */}
                {user && (user.id === request.user_id || user.isAdmin) && (
                  <AuthorActions
                    requestId={request.id}
                    title={request.title}
                    body={request.body}
                    type={request.type}
                    createdAt={request.created_at}
                    isAdmin={user.isAdmin || false}
                  />
                )}

                <div className="feedback-detail__meta">
                  <div className="feedback-detail__author">
                    {request.user_image ? (
                      <img src={request.user_image} alt="" className="feedback-detail__avatar" />
                    ) : (
                      <div className="feedback-detail__avatar feedback-detail__avatar--placeholder">
                        {(request.user_name || "A")[0].toUpperCase()}
                      </div>
                    )}
                    <span>{request.user_name || "Anonymous"}</span>
                  </div>
                  <span className="feedback-detail__date">{formatDate(request.created_at)}</span>
                </div>

                <div className="feedback-detail__body">
                  {request.body.split("\n").map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>

                {/* Admin Response */}
                {request.admin_response && (
                  <div className="feedback-detail__response">
                    <div className="feedback-detail__response-header">
                      <span className="feedback-detail__response-badge">OFFICIAL RESPONSE</span>
                    </div>
                    <div className="feedback-detail__response-body">
                      {request.admin_response.split("\n").map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* Comments Section */}
          <CommentSection
            requestId={request.id}
            comments={comments}
            isLoggedIn={!!user}
            isAdmin={user?.isAdmin || false}
          />
        </div>
      </main>

      {/* FOOTER */}
      <SiteFooter />
    </>
  );
}
