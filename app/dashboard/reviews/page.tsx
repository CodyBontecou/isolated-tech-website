import { Metadata } from "next";
import Link from "next/link";

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

// Mock data
const MOCK_REVIEWS: Review[] = [
  {
    id: "review_1",
    app_id: "app_voxboard_001",
    app_name: "Voxboard",
    app_slug: "voxboard",
    rating: 5,
    title: "Exactly what I needed",
    body: "Finally a voice transcription app that works offline. The accuracy is great and it integrates perfectly with any text field.",
    created_at: "2026-02-22T10:00:00Z",
    updated_at: "2026-02-22T10:00:00Z",
  },
  {
    id: "review_2",
    app_id: "app_syncmd_001",
    app_name: "sync.md",
    app_slug: "syncmd",
    rating: 4,
    title: "Great but could use more features",
    body: "Works well for basic git operations. Would love to see branch visualization added.",
    created_at: "2026-02-18T15:30:00Z",
    updated_at: "2026-02-19T08:00:00Z",
  },
];

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
        <button className="admin-table__btn admin-table__btn--danger">
          DELETE
        </button>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  // TODO: Get user from auth
  const user = { id: "user_1", name: "Cody" };

  if (!user) {
    return (
      <>
        <nav className="nav">
          <Link href="/" className="nav__logo">
            ISOLATED<span className="dot">.</span>TECH
          </Link>
          <div className="nav__links">
            <Link href="/apps">APPS</Link>
            <Link href="/auth/login">SIGN IN</Link>
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

  const reviews = MOCK_REVIEWS;

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </Link>
        <div className="nav__links">
          <Link href="/apps">APPS</Link>
          <Link href="/api/auth/logout">SIGN OUT</Link>
        </div>
      </nav>

      <main className="dashboard">
        <header className="dashboard__header">
          <p className="dashboard__welcome">YOUR</p>
          <h1 className="dashboard__title">
            Reviews<span className="dot">.</span>
          </h1>

          <nav className="dashboard__nav">
            <Link href="/dashboard" className="dashboard__nav-link">
              MY APPS
            </Link>
            <Link href="/dashboard/reviews" className="dashboard__nav-link dashboard__nav-link--active">
              REVIEWS
            </Link>
            <Link href="/dashboard/settings" className="dashboard__nav-link">
              SETTINGS
            </Link>
          </nav>
        </header>

        {reviews.length === 0 ? (
          <div className="empty-state">
            <h2 className="empty-state__title">No reviews yet</h2>
            <p className="empty-state__text">
              You haven&apos;t written any reviews. Purchase an app to leave a review!
            </p>
            <Link href="/apps" className="auth-btn" style={{ display: "inline-block" }}>
              BROWSE APPS
            </Link>
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
