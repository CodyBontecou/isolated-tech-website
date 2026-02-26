import { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { queries } from "@/lib/db";

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
  distribution_type: string;
  avg_rating?: number | null;
  review_count?: number;
}

interface ReviewStats {
  app_id: string;
  avg_rating: number | null;
  review_count: number;
}

async function getApps(): Promise<App[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  const result = await env.DB.prepare(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, min_price_cents, suggested_price_cents,
            COALESCE(is_featured, 0) as is_featured,
            COALESCE(distribution_type, 'binary') as distribution_type
     FROM apps 
     WHERE is_published = 1
     ORDER BY is_featured DESC, created_at DESC`
  ).all<App>();

  // Get review stats for all apps
  const reviewStats = await queries.getAllAppReviewStats(env) as ReviewStats[];
  const statsMap = new Map(reviewStats.map(s => [s.app_id, s]));

  // Merge review stats with apps
  return (result.results || []).map(app => ({
    ...app,
    avg_rating: statsMap.get(app.id)?.avg_rating ?? null,
    review_count: statsMap.get(app.id)?.review_count ?? 0,
  }));
}

function getPlatforms(platformsJson: string): string[] {
  try {
    return JSON.parse(platformsJson);
  } catch {
    return platformsJson.split(",").map((p) => p.trim().replace(/"/g, ""));
  }
}

function formatPrice(minCents: number, suggestedCents: number | null): string {
  if (minCents === 0 && (!suggestedCents || suggestedCents === 0)) {
    return "Free";
  }
  if (minCents === 0) {
    return "Name your price";
  }
  return `$${(minCents / 100).toFixed(2)}`;
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="store-badge">
      {platform === "ios" ? "iOS" : platform === "macos" ? "macOS" : platform.toUpperCase()}
    </span>
  );
}

function StarRatingCompact({ rating, count }: { rating: number; count: number }) {
  if (count === 0) return null;
  const roundedRating = Math.round(rating * 10) / 10;
  return (
    <div className="star-rating-compact" aria-label={`${roundedRating} out of 5 stars from ${count} reviews`}>
      <span className="star-rating-compact__star">★</span>
      <span className="star-rating-compact__value">{roundedRating.toFixed(1)}</span>
    </div>
  );
}

function AppCard({ app, index }: { app: App; index: number }) {
  const platforms = getPlatforms(app.platforms);
  const isFree = app.min_price_cents === 0 && (!app.suggested_price_cents || app.suggested_price_cents === 0);
  const price = formatPrice(app.min_price_cents, app.suggested_price_cents);
  const isSourceCode = app.distribution_type === "source_code";

  return (
    <Link
      href={`/apps/${app.slug}`}
      className="store-card"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="store-card__icon">
        {app.icon_url ? (
          <img src={app.icon_url} alt={`${app.name} icon`} />
        ) : (
          <span>{app.name[0].toUpperCase()}</span>
        )}
      </div>
      <div className="store-card__content">
        <div className="store-card__badges">
          {platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
          {isSourceCode && <span className="store-badge store-badge--source">SOURCE</span>}
          {app.is_featured === 1 && <span className="store-badge store-badge--featured">★</span>}
        </div>
        <h2 className="store-card__name">{app.name}</h2>
        {app.tagline && <p className="store-card__tagline">{app.tagline}</p>}
        {app.avg_rating && app.review_count && app.review_count > 0 && (
          <StarRatingCompact rating={app.avg_rating} count={app.review_count} />
        )}
      </div>
      <div className="store-card__footer">
        <span className={`store-card__price ${isFree ? "store-card__price--free" : ""}`}>
          {price}
        </span>
        <span className="store-card__arrow">→</span>
      </div>
    </Link>
  );
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
        <Link href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </Link>
        <div className="nav__links">
          <Link href="/apps">APPS</Link>
          {user ? (
            <>
              {user.isAdmin && <Link href="/admin">ADMIN</Link>}
              <Link href="/dashboard">DASHBOARD</Link>
              <Link href="/api/auth/logout">SIGN OUT</Link>
            </>
          ) : (
            <Link href="/auth/login">SIGN IN</Link>
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
          <span className="store-section__count">{apps.length} apps</span>
        </div>

        {apps.length === 0 ? (
          <div className="store-empty">
            <p>No apps available yet. Check back soon.</p>
          </div>
        ) : (
          <div className="store-grid">
            {apps.map((app, i) => (
              <AppCard key={app.id} app={app} index={i} />
            ))}
          </div>
        )}
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
