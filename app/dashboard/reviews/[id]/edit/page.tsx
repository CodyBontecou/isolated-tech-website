import { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ReviewForm } from "../../new/review-form";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Edit Review — ISOLATED.TECH",
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
}

export default async function EditReviewPage({
  params,
}: {
  params: { id: string };
}) {
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
          r.user_id
        FROM reviews r
        JOIN apps a ON r.app_id = a.id
        WHERE r.id = ?
      `).bind(params.id).first<Review>();
    } catch (err) {
      console.error("Failed to fetch review:", err);
    }
  }

  if (!review) {
    notFound();
  }

  // Check ownership
  if (review.user_id !== user.id) {
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
            <Link href="/dashboard/reviews" className="app-page__back">
              ← BACK TO REVIEWS
            </Link>
            <h1 className="dashboard__title">
              Access Denied<span className="dot">.</span>
            </h1>
          </header>

          <div className="auth-card" style={{ maxWidth: "500px" }}>
            <div className="auth-card__header">
              <h2 className="auth-card__title">Not Your Review</h2>
              <p className="auth-card__subtitle">
                You can only edit your own reviews.
              </p>
            </div>

            <Link
              href="/dashboard/reviews"
              className="auth-btn"
              style={{ display: "block", textAlign: "center" }}
            >
              VIEW YOUR REVIEWS
            </Link>
          </div>
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
          <Link href="/dashboard/reviews" className="app-page__back">
            ← BACK TO REVIEWS
          </Link>
          <h1 className="dashboard__title">
            Edit Review<span className="dot">.</span>
          </h1>
          <p style={{ color: "var(--gray)", marginTop: "0.5rem" }}>
            {review.app_name}
          </p>
        </header>

        <div style={{ maxWidth: "600px" }}>
          <ReviewForm
            appId={review.app_id}
            appName={review.app_name}
            appSlug={review.app_slug}
            existingReview={{
              id: review.id,
              rating: review.rating,
              title: review.title,
              body: review.body,
            }}
          />
        </div>
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
