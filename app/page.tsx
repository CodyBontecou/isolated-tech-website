import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { ViewTransitionLink } from "./components/view-transition-link";
import { HeroAppLink } from "./components/hero-app-link";
import { queries } from "@/lib/db";
import { AppFilters } from "./components/app-filters";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

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
  featured_order: number;
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

async function getApps(): Promise<{ featured: App | null; apps: App[] }> {
  const env = getEnv();
  if (!env?.DB) {
    return { featured: null, apps: [] };
  }

  // Get featured app (lowest featured_order where is_featured = 1)
  const featured = await env.DB.prepare(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, min_price_cents, suggested_price_cents, is_featured, featured_order, created_at
     FROM apps 
     WHERE is_published = 1 AND is_featured = 1
     ORDER BY featured_order ASC
     LIMIT 1`
  ).first<App>();

  // Get all published apps (excluding hero featured app)
  const result = await env.DB.prepare(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, min_price_cents, suggested_price_cents, is_featured, featured_order, created_at
     FROM apps 
     WHERE is_published = 1 ${featured ? "AND id != ?" : ""}
     ORDER BY is_featured DESC, featured_order ASC, created_at DESC`
  )
    .bind(...(featured ? [featured.id] : []))
    .all<App>();

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
  const appsWithStats = (result.results || []).map(app => ({
    ...app,
    avg_rating: statsMap.get(app.id)?.avg_rating ?? null,
    review_count: statsMap.get(app.id)?.review_count ?? 0,
    latest_release_at: releaseMap.get(app.id) ?? app.created_at ?? null,
  }));

  const featuredWithStats = featured ? {
    ...featured,
    avg_rating: statsMap.get(featured.id)?.avg_rating ?? null,
    review_count: statsMap.get(featured.id)?.review_count ?? 0,
    latest_release_at: releaseMap.get(featured.id) ?? featured.created_at ?? null,
  } : null;

  return {
    featured: featuredWithStats,
    apps: appsWithStats,
  };
}

function getPlatforms(platformsJson: string): string[] {
  try {
    return JSON.parse(platformsJson);
  } catch {
    return platformsJson.split(",").map((p) => p.trim().replace(/"/g, ""));
  }
}

function formatPrice(minCents: number, suggestedCents: number | null, platforms?: string[]): string {
  // iOS-only apps show "App Store" since pricing is handled there
  const hasIOS = platforms?.includes("ios");
  const hasMacOS = platforms?.includes("macos");
  
  if (hasIOS && !hasMacOS) {
    return "App Store";
  }
  
  // macOS apps use "Name your price"
  if (minCents === 0) {
    return "Name your price";
  }
  return `From $${(minCents / 100).toFixed(2)}`;
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

function HeroApp({ app, previewApps }: { app: App; previewApps: App[] }) {
  const platforms = getPlatforms(app.platforms);
  const hasIOS = platforms.includes("ios");
  const hasMacOS = platforms.includes("macos");
  const isIOSOnly = hasIOS && !hasMacOS;

  return (
    <section className="store-hero">
      <div className="store-hero__inner">
        <div className="store-hero__content">
          <div className="store-hero__label">FEATURED</div>
          <div className="store-hero__app">
            <div className="store-hero__icon" id="hero-featured-icon">
              {app.icon_url ? (
                <img src={app.icon_url} alt={`${app.name} icon`} />
              ) : (
                <span>{app.name[0].toUpperCase()}</span>
              )}
            </div>
            <div className="store-hero__info">
              <div className="store-hero__badges">
                {platforms.map((p) => (
                  <PlatformBadge key={p} platform={p} />
                ))}
              </div>
              <h1 className="store-hero__name">{app.name}</h1>
              {app.tagline && <p className="store-hero__tagline">{app.tagline}</p>}
              {app.description && (
                <p className="store-hero__desc">
                  {app.description
                    .replace(/##?\s+/g, "")
                    .replace(/\*\*(.+?)\*\*/g, "$1")
                    .replace(/\*(.+?)\*/g, "$1")
                    .replace(/^-\s+/gm, "• ")
                    .slice(0, 200)}
                  {app.description.length > 200 ? "..." : ""}
                </p>
              )}
              <div className="store-hero__actions">
                <HeroAppLink 
                  href={`/apps/${app.slug}`} 
                  className="store-hero__btn store-hero__btn--primary"
                  heroIconId="hero-featured-icon"
                >
                  {isIOSOnly ? "VIEW ON APP STORE" : `GET — ${formatPrice(app.min_price_cents, app.suggested_price_cents, platforms)}`}
                </HeroAppLink>
                <HeroAppLink 
                  href={`/apps/${app.slug}`} 
                  className="store-hero__btn store-hero__btn--ghost"
                  heroIconId="hero-featured-icon"
                >
                  LEARN MORE
                </HeroAppLink>
              </div>
            </div>
          </div>
        </div>

        {previewApps.length > 0 && (
          <aside className="store-hero__rail" aria-label="More apps">
            <div className="store-hero__rail-label">MORE APPS</div>
            <div className="store-hero__rail-list">
              {previewApps.slice(0, 6).map((preview) => {
                const previewPlatforms = getPlatforms(preview.platforms);

                return (
                  <ViewTransitionLink 
                    key={preview.id} 
                    href={`/apps/${preview.slug}`} 
                    className="store-hero__rail-item"
                    transitionSelector="[data-transition-icon]"
                  >
                    <div className="store-hero__rail-icon" data-transition-icon>
                      {preview.icon_url ? (
                        <img src={preview.icon_url} alt={`${preview.name} icon`} />
                      ) : (
                        <span>{preview.name[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="store-hero__rail-body">
                      <div className="store-hero__rail-header">
                        <span className="store-hero__rail-name">{preview.name}</span>
                        <div className="store-hero__rail-badges">
                          {previewPlatforms.map((p) => (
                            <PlatformBadge key={p} platform={p} />
                          ))}
                        </div>
                      </div>
                      <span className="store-hero__rail-tagline">
                        {preview.tagline || formatPrice(preview.min_price_cents, preview.suggested_price_cents, previewPlatforms)}
                      </span>
                    </div>
                  </ViewTransitionLink>
                );
              })}
            </div>
          </aside>
        )}
      </div>
      <div className="store-hero__grid" />
    </section>
  );
}

export default async function HomePage() {
  const env = getEnv();
  const [user, { featured, apps }] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getApps(),
  ]);

  const totalApps = (featured ? 1 : 0) + apps.length;
  const allApps = featured ? [featured, ...apps] : apps;

  return (
    <>
      {/* NAV */}
      <SiteNav user={user} activePage="apps" />

      {/* HERO */}
      {featured ? (
        <HeroApp app={featured} previewApps={apps} />
      ) : (
        <section className="store-hero store-hero--empty">
          <div className="store-hero__content">
            <div className="store-hero__label">APP STORE</div>
            <h1 className="store-hero__title">
              SOFTWARE<br />
              THAT SHIPS<span className="dot">.</span>
            </h1>
            <p className="store-hero__subtitle">
              Privacy-first iOS and macOS apps. On-device processing. No cloud dependencies.
            </p>
          </div>
          <div className="store-hero__grid" />
        </section>
      )}

      {/* STATS BAR */}
      <div className="store-stats">
        <div className="store-stats__item">
          <span className="store-stats__number">{totalApps}</span>
          <span className="store-stats__label">APPS</span>
        </div>
        <div className="store-stats__divider" />
        <div className="store-stats__item">
          <span className="store-stats__number">●</span>
          <span className="store-stats__label">PRIVACY-FIRST</span>
        </div>
        <div className="store-stats__divider" />
        <div className="store-stats__item">
          <span className="store-stats__number">●</span>
          <span className="store-stats__label">ON-DEVICE</span>
        </div>
        <div className="store-stats__divider" />
        <div className="store-stats__item">
          <span className="store-stats__number">●</span>
          <span className="store-stats__label">NO SUBSCRIPTIONS</span>
        </div>
      </div>

      {/* APPS GRID */}
      <section className="store-section" id="apps">
        <div className="store-section__header">
          <h2 className="store-section__title">ALL APPS</h2>
        </div>

        {allApps.length === 0 ? (
          <div className="store-empty">
            <p>No apps available yet. Check back soon.</p>
          </div>
        ) : (
          <AppFilters apps={allApps} showFeaturedSort={true} />
        )}
      </section>

      {/* FOOTER */}
      <SiteFooter />
    </>
  );
}
