import { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { DeleteReviewButton } from "../delete-button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "View Review — ISOLATED.TECH",
};

interface Review {
  id: string;
  app_id: string;
  app_name: string;
  app_slug: string;
  rating: number;
  title: string | null;
  body: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{
            color: star <= rating ? "#fbbf24" : "#333",
            fontSize: "1.25rem",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default async function ViewReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch the review from database
  let review: Review | null = null;

  if (env?.DB) {
    try {
      review = await env.DB.prepare(`
        SELECT 
          r.id,
          r.app_id,
          a.name as app_name,
          a.slug as app_slug,
          r.rating,
          r.title,
          r.body,
          r.user_id,
          r.created_at,
          r.updated_at
        FROM reviews r
        JOIN apps a ON r.app_id = a.id
        WHERE r.id = ?
      `).bind(id).first<Review>();
    } catch (err) {
      console.error("Failed to fetch review:", err);
    }
  }

  if (!review) {
    notFound();
  }

  const isOwner = review.user_id === user.id;

  return (
    <>
      <SiteNav user={user} />

      <main className="dashboard">
        <header className="dashboard__header">
          <a href="/dashboard/reviews" className="app-page__back">
            ← BACK TO REVIEWS
          </a>
          <h1 className="dashboard__title">
            Review<span className="dot">.</span>
          </h1>
        </header>

        <div style={{ maxWidth: "700px" }}>
          <div
            style={{
              background: "var(--gray-dark)",
              border: "var(--border)",
              padding: "2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <Link
                  href={`/apps/${review.app_slug}`}
                  style={{ fontSize: "1.25rem", fontWeight: 700 }}
                >
                  {review.app_name}
                </Link>
                <div style={{ marginTop: "0.5rem" }}>
                  <StarRating rating={review.rating} />
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--gray)" }}>
                {formatDate(review.created_at)}
                {review.updated_at !== review.created_at && (
                  <span style={{ display: "block", marginTop: "0.25rem" }}>
                    (edited {formatDate(review.updated_at)})
                  </span>
                )}
              </span>
            </div>

            {review.title && (
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                }}
              >
                {review.title}
              </h2>
            )}

            {review.body && (
              <p
                style={{
                  fontSize: "0.95rem",
                  color: "#ccc",
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                {review.body}
              </p>
            )}

            {isOwner && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "1.5rem",
                  paddingTop: "1.5rem",
                  borderTop: "var(--border)",
                }}
              >
                <Link
                  href={`/dashboard/reviews/${review.id}/edit`}
                  className="admin-table__btn"
                >
                  EDIT
                </Link>
                <DeleteReviewButton
                  reviewId={review.id}
                  appName={review.app_name}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
