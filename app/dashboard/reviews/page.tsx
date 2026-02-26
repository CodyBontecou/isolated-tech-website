import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { DeleteReviewButton } from "./delete-button";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "My Reviews — ISOLATED.TECH",
  description: "View and manage your app reviews.",
};

interface Review {
  id: string;
  app_id: string;
  app_name: string;
  app_slug: string;
  rating: number;
  title: string | null;
  body: string | null;
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
            fontSize: "1rem",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <div
      style={{
        background: "var(--gray-dark)",
        border: "var(--border)",
        padding: "1.5rem",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div>
          <Link
            href={`/apps/${review.app_slug}`}
            style={{ fontSize: "1rem", fontWeight: 700 }}
          >
            {review.app_name}
          </Link>
          <div style={{ marginTop: "0.25rem" }}>
            <StarRating rating={review.rating} />
          </div>
        </div>
        <span style={{ fontSize: "0.7rem", color: "var(--gray)" }}>
          {formatDate(review.created_at)}
        </span>
      </div>

      {review.title && (
        <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>
          {review.title}
        </h3>
      )}

      {review.body && (
        <p style={{ fontSize: "0.85rem", color: "#aaa", lineHeight: 1.6 }}>
          {review.body}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginTop: "1rem",
          paddingTop: "1rem",
          borderTop: "var(--border)",
        }}
      >
        <Link
          href={`/dashboard/reviews/${review.id}/edit`}
          className="admin-table__btn"
        >
          EDIT
        </Link>
        <DeleteReviewButton reviewId={review.id} appName={review.app_name} />
      </div>
    </div>
  );
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: { success?: string; edited?: string };
}) {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user) {
    return (
      <>
        <nav className="nav">
          <a href="/" className="nav__logo">
            ISOLATED<span className="dot">.</span>TECH
          </a>
          <div className="nav__links">
            <a href="/apps">APPS</a>
            <a href="/auth/login">SIGN IN</a>
          </div>
        </nav>
        <main className="dashboard">
          <div className="auth-card" style={{ maxWidth: "500px", margin: "0 auto" }}>
            <h1 className="auth-card__title">Sign In Required</h1>
            <Link href="/auth/login" className="auth-btn" style={{ display: "block", textAlign: "center" }}>
              SIGN IN
            </Link>
          </div>
        </main>
      </>
    );
  }

  // Fetch user's reviews from database
  let reviews: Review[] = [];
  if (env?.DB) {
    try {
      const result = await env.DB.prepare(`
        SELECT 
          r.id,
          r.app_id,
          a.name as app_name,
          a.slug as app_slug,
          r.rating,
          r.title,
          r.body,
          r.created_at,
          r.updated_at
        FROM reviews r
        JOIN apps a ON r.app_id = a.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `).bind(user.id).all<Review>();
      
      reviews = result.results;
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    }
  }

  const showSuccess = searchParams.success === "1";
  const wasEdited = searchParams.edited === "1";

  return (
    <>
      <nav className="nav">
        {/* Use <a> tag to force full page navigation - vinext RSC fetch doesn't include credentials */}
        <a href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </a>
        <div className="nav__links">
          <a href="/apps">APPS</a>
          {user.isAdmin && <a href="/admin">ADMIN</a>}
          <SignOutButton />
        </div>
      </nav>

      <main className="dashboard">
        <header className="dashboard__header">
          <p className="dashboard__welcome">YOUR</p>
          <h1 className="dashboard__title">
            Reviews<span className="dot">.</span>
          </h1>

          <nav className="dashboard__nav">
            <a href="/dashboard" className="dashboard__nav-link">
              MY APPS
            </a>
            <a href="/dashboard/reviews" className="dashboard__nav-link dashboard__nav-link--active">
              REVIEWS
            </a>
            <a href="/dashboard/settings" className="dashboard__nav-link">
              SETTINGS
            </a>
          </nav>
        </header>

        {showSuccess && (
          <div className="dashboard__success" style={{ marginBottom: "1.5rem" }}>
            <span className="dashboard__success-icon">✓</span>
            <span className="dashboard__success-text">
              {wasEdited
                ? "Your review has been updated."
                : "Your review has been submitted. Thank you for your feedback!"}
            </span>
          </div>
        )}

        {reviews.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state__title">No reviews yet</h2>
            <p className="empty-state__text">
              You haven&apos;t written any reviews. Purchase an app to leave a review!
            </p>
            <a href="/apps" className="auth-btn" style={{ display: "inline-block" }}>
              BROWSE APPS
            </a>
          </div>
        ) : (
          <div style={{ maxWidth: "700px" }}>
            <h2 className="dashboard__section-title">
              YOUR REVIEWS ({reviews.length})
            </h2>
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer__left">
          <span>© 2026 ISOLATED.TECH</span>
        </div>
        <div className="footer__right" />
      </footer>
    </>
  );
}
