import Link from "next/link";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { ViewTransitionLink } from "./components/view-transition-link";
import { HeroAppLink } from "./components/hero-app-link";
import { queries } from "@/lib/db";
import { getPlatforms, isIOSOnly } from "@/lib/platform";
import { formatPrice } from "@/lib/formatting";
import { PlatformBadge } from "@/components/ui";
import { AppFilters } from "./components/app-filters";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { CLIENT_WORK } from "@/lib/client-work";

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

function HeroApp({ app, previewApps }: { app: App; previewApps: App[] }) {
  const platforms = getPlatforms(app.platforms);
  const appIsIOSOnly = isIOSOnly(platforms);

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
                  {appIsIOSOnly ? "VIEW ON APP STORE" : `GET — ${formatPrice(app.min_price_cents, app.suggested_price_cents, platforms)}`}
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
  const featuredClientWork = CLIENT_WORK.slice(0, 2);

  return (
    <>
      {/* NAV */}
      <SiteNav user={user} />

      <section className="studio-split">
        <div className="studio-split__intro">
          <p className="studio-split__label">ISOLATED.TECH</p>
          <h2 className="studio-split__title">
            Product studio + client web partner.
          </h2>
          <p className="studio-split__subtitle">
            I design and ship polished software — from privacy-first apps to
            conversion-focused client websites. Client sites launch free, then run on an
            unlimited-edits subscription.
          </p>
        </div>
        <div className="studio-split__actions">
          <Link href="/apps" className="studio-split__card">
            <span className="studio-split__card-label">PRODUCTS</span>
            <strong>Browse Apps</strong>
            <p>iOS and macOS tools built and maintained by ISOLATED.TECH.</p>
          </Link>
          <Link href="/work" className="studio-split__card">
            <span className="studio-split__card-label">SERVICES</span>
            <strong>View Client Work</strong>
            <p>Websites built for businesses that need trust, speed, and leads.</p>
          </Link>
        </div>
      </section>

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
      </div>

      <section className="home-work-preview" aria-label="Recent client websites">
        <div className="home-work-preview__header">
          <div>
            <p className="home-work-preview__label">CLIENT SHOWCASE</p>
            <h2 className="home-work-preview__title">Recent websites</h2>
          </div>
          <div className="home-work-preview__actions">
            <Link href="/work" className="work-btn work-btn--ghost">VIEW ALL WORK</Link>
            <Link href="/hire" className="work-btn work-btn--primary">HIRE ME</Link>
          </div>
        </div>

        <div className="home-work-preview__grid">
          {featuredClientWork.map((project) => (
            <article key={project.slug} className="home-work-preview__card">
              <a href={project.primaryUrl} target="_blank" rel="noopener" className="home-work-preview__image-wrap">
                <img src={project.previewImage} alt={`${project.client} website preview`} />
              </a>
              <div className="home-work-preview__body">
                <p className="home-work-preview__client">{project.client}</p>
                <h3>{project.headline}</h3>
                <p>{project.summary}</p>
                <a href={project.primaryUrl} target="_blank" rel="noopener" className="home-work-preview__link">
                  Visit live site ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

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
