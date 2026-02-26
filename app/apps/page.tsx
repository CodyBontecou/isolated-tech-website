import { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { queries } from "@/lib/db";
import { SignOutButton } from "@/components/sign-out-button";
import { AppFilters } from "@/app/components/app-filters";

export const metadata: Metadata = {
  title: "Apps — ISOLATED.TECH",
  description:
    "iOS and macOS apps by Isolated Tech. Privacy-first, on-device processing, brutalist design.",
};

interface App {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  platforms: string;
  min_price_cents: number;
  suggested_price_cents: number | null;
  is_featured: number;
  avg_rating?: number | null;
  review_count?: number;
  latest_release_at?: string | null;
  created_at?: string;
}

interface ReviewStats {
  app_id: string;
  avg_rating: number | null;
  review_count: number;
}

interface LatestRelease {
  app_id: string;
  latest_release_at: string;
}

async function getApps(): Promise<App[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  const result = await env.DB.prepare(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, min_price_cents, suggested_price_cents,
            COALESCE(is_featured, 0) as is_featured, created_at
     FROM apps 
     WHERE is_published = 1
     ORDER BY is_featured DESC, created_at DESC`
  ).all<App>();

  // Get review stats for all apps
  const reviewStats = await queries.getAllAppReviewStats(env) as ReviewStats[];
  const statsMap = new Map(reviewStats.map(s => [s.app_id, s]));

  // Get latest release dates for all apps (from app_updates table)
  let releaseMap = new Map<string, string>();
  try {
    const latestReleases = await env.DB.prepare(
      `SELECT app_id, MAX(released_at) as latest_release_at
       FROM app_updates
       GROUP BY app_id`
    ).all<LatestRelease>();
    releaseMap = new Map(latestReleases.results?.map(r => [r.app_id, r.latest_release_at]) || []);
  } catch {
    // app_updates table may not exist in some environments
  }

  // Merge review stats and release dates with apps
  return (result.results || []).map(app => ({
    ...app,
    avg_rating: statsMap.get(app.id)?.avg_rating ?? null,
    review_count: statsMap.get(app.id)?.review_count ?? 0,
    latest_release_at: releaseMap.get(app.id) ?? app.created_at ?? null,
  }));
}

export default async function AppsPage() {
  const env = getEnv();
  const [user, apps] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getApps(),
  ]);

  return (
    <>
      <nav className="nav">
        {/* Use <a> tags to force full page navigation - vinext RSC fetch doesn't include credentials */}
        <a href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </a>
        <div className="nav__links">
          <a href="/apps">APPS</a>
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

      <section className="store-hero store-hero--empty" style={{ minHeight: "40vh" }}>
        <div className="store-hero__content">
          <div className="store-hero__label">ALL APPS</div>
          <h1 className="store-hero__title" style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}>
            Apps<span className="dot">.</span>
          </h1>
          <p className="store-hero__subtitle">
            Privacy-first iOS and macOS apps. On-device processing, no cloud dependencies.
          </p>
        </div>
        <div className="store-hero__grid" />
      </section>

      <section className="store-section" id="apps">
        <div className="store-section__header">
          <h2 className="store-section__title">BROWSE</h2>
        </div>

        <AppFilters apps={apps} showFeaturedSort={true} />
      </section>

      <footer className="store-footer">
        <div className="store-footer__brand">
          <span className="store-footer__logo">
            ISOLATED<span className="dot">.</span>TECH
          </span>
          <span className="store-footer__tagline">Software that ships.</span>
        </div>
        <div className="store-footer__links">
          <a href="https://instagram.com/isolated.tech" target="_blank" rel="noopener">
            INSTAGRAM
          </a>
          <a href="https://tiktok.com/@isolated.tech" target="_blank" rel="noopener">
            TIKTOK
          </a>
          <Link href="/privacy">PRIVACY</Link>
          <Link href="/terms">TERMS</Link>
          <a href="mailto:cody@isolated.tech">
            CONTACT
          </a>
        </div>
        <div className="store-footer__copy">
          © 2026 ISOLATED.TECH
        </div>
      </footer>
    </>
  );
}
