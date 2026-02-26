import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewForm } from "./review-form";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "Write a Review — ISOLATED.TECH",
};

interface App {
  id: string;
  name: string;
  slug: string;
}

interface Purchase {
  id: string;
  app_id: string;
}

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: { app?: string };
}) {
  const appSlug = searchParams.app;

  if (!appSlug) {
    redirect("/dashboard");
  }

  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch the app from database
  let app: App | null = null;
  let hasPurchased = false;
  let hasReviewed = false;

  if (env?.DB) {
    try {
      // Get app by slug
      app = await env.DB.prepare(
        `SELECT id, name, slug FROM apps WHERE slug = ?`
      ).bind(appSlug).first<App>();

      if (app) {
        // Check if user has purchased this app
        const purchase = await env.DB.prepare(
          `SELECT id FROM purchases 
           WHERE user_id = ? AND app_id = ? AND status = 'completed'`
        ).bind(user.id, app.id).first<Purchase>();

        hasPurchased = !!purchase;

        // Check if user already has a review for this app
        const existingReview = await env.DB.prepare(
          `SELECT id FROM reviews WHERE user_id = ? AND app_id = ?`
        ).bind(user.id, app.id).first<{ id: string }>();

        hasReviewed = !!existingReview;
      }
    } catch (err) {
      console.error("Failed to fetch app:", err);
    }
  }

  if (!app) {
    redirect("/dashboard");
  }

  if (!hasPurchased) {
    return (
      <>
        <nav className="nav">
          <Link href="/" className="nav__logo">
            ISOLATED<span className="dot">.</span>TECH
          </Link>
          <div className="nav__links">
            <Link href="/apps">APPS</Link>
            {user.isAdmin && <Link href="/admin">ADMIN</Link>}
            <SignOutButton />
          </div>
        </nav>

        <main className="dashboard">
          <header className="dashboard__header">
            <Link href="/dashboard" className="app-page__back">
              ← BACK TO DASHBOARD
            </Link>
            <h1 className="dashboard__title">
              Cannot Review<span className="dot">.</span>
            </h1>
          </header>

          <div className="auth-card" style={{ maxWidth: "500px" }}>
            <div className="auth-card__header">
              <h2 className="auth-card__title">Purchase Required</h2>
              <p className="auth-card__subtitle">
                You must purchase {app.name} before you can write a review.
              </p>
            </div>

            <Link
              href={`/apps/${app.slug}`}
              className="auth-btn"
              style={{ display: "block", textAlign: "center" }}
            >
              VIEW {app.name.toUpperCase()}
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

  if (hasReviewed) {
    return (
      <>
        <nav className="nav">
          <Link href="/" className="nav__logo">
            ISOLATED<span className="dot">.</span>TECH
          </Link>
          <div className="nav__links">
            <Link href="/apps">APPS</Link>
            {user.isAdmin && <Link href="/admin">ADMIN</Link>}
            <SignOutButton />
          </div>
        </nav>

        <main className="dashboard">
          <header className="dashboard__header">
            <Link href="/dashboard/reviews" className="app-page__back">
              ← BACK TO REVIEWS
            </Link>
            <h1 className="dashboard__title">
              Already Reviewed<span className="dot">.</span>
            </h1>
          </header>

          <div className="auth-card" style={{ maxWidth: "500px" }}>
            <div className="auth-card__header">
              <h2 className="auth-card__title">Review Exists</h2>
              <p className="auth-card__subtitle">
                You have already written a review for {app.name}. 
                You can edit your existing review from the reviews page.
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
          {user.isAdmin && <Link href="/admin">ADMIN</Link>}
          <SignOutButton />
        </div>
      </nav>

      <main className="dashboard">
        <header className="dashboard__header">
          <Link href="/dashboard/reviews" className="app-page__back">
            ← BACK TO REVIEWS
          </Link>
          <h1 className="dashboard__title">
            Review {app.name}<span className="dot">.</span>
          </h1>
        </header>

        <div style={{ maxWidth: "600px" }}>
          <ReviewForm appId={app.id} appName={app.name} appSlug={app.slug} />
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
