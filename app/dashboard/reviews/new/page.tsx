import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewForm } from "./review-form";

export const metadata: Metadata = {
  title: "Write a Review — ISOLATED.TECH",
};

// Mock app data - will be fetched based on query param
const APPS: Record<string, { id: string; name: string; slug: string }> = {
  voxboard: { id: "app_voxboard_001", name: "Voxboard", slug: "voxboard" },
  syncmd: { id: "app_syncmd_001", name: "sync.md", slug: "syncmd" },
  healthmd: { id: "app_healthmd_001", name: "health.md", slug: "healthmd" },
  imghost: { id: "app_imghost_001", name: "imghost", slug: "imghost" },
};

export default function NewReviewPage({
  searchParams,
}: {
  searchParams: { app?: string };
}) {
  const appSlug = searchParams.app;

  if (!appSlug || !APPS[appSlug]) {
    redirect("/dashboard");
  }

  const app = APPS[appSlug];

  // TODO: Check if user owns this app and hasn't reviewed it yet

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
