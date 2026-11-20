import Link from "next/link";
import type { ReactNode } from "react";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { HeroAppLink } from "./components/hero-app-link";
import { queries } from "@/lib/db";
import { getPlatforms, isIOSOnly } from "@/lib/platform";
import { formatPrice } from "@/lib/formatting";
import { getAppDisplayName, getAppHref, getAppSite } from "@/lib/app-sites";
import { PlatformBadge } from "@/components/ui";
import { AppDirectory } from "./components/app-directory";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { BrandMark, PlusMark } from "@/components/brand-mark";
import { StoreIconLinks } from "@/components/store-icons";
import { CLIENT_WORK } from "@/lib/client-work";
import { APP_CATALOG } from "@/lib/app-catalog";

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
     LIMIT 1`,
  ).first<App>();

  // Get all published apps (excluding hero featured app)
  const result = await env.DB.prepare(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, min_price_cents, suggested_price_cents, is_featured, featured_order, created_at
     FROM apps 
     WHERE is_published = 1 ${featured ? "AND id != ?" : ""}
     ORDER BY is_featured DESC, featured_order ASC, created_at DESC`,
  )
    .bind(...(featured ? [featured.id] : []))
    .all<App>();

  // Get review stats for all apps
  const reviewStats = (await queries.getAllAppReviewStats(env)) as ReviewStats[];
  const statsMap = new Map(reviewStats.map((s) => [s.app_id, s]));

  // Get latest release dates for all apps (from app_updates table)
  let releaseMap = new Map<string, string>();
  try {
    const latestReleases = await env.DB.prepare(
      `SELECT app_id, MAX(released_at) as latest_release_at
       FROM app_updates
       GROUP BY app_id`,
    ).all<LatestRelease>();
    releaseMap = new Map(latestReleases.results?.map((r) => [r.app_id, r.latest_release_at]) || []);
  } catch {
    // app_updates table may not exist in some environments
  }

  // Merge review stats and release dates with apps
  const appsWithStats = (result.results || []).map((app) => ({
    ...app,
    avg_rating: statsMap.get(app.id)?.avg_rating ?? null,
    review_count: statsMap.get(app.id)?.review_count ?? 0,
    latest_release_at: releaseMap.get(app.id) ?? app.created_at ?? null,
  }));

  const featuredWithStats = featured
    ? {
        ...featured,
        avg_rating: statsMap.get(featured.id)?.avg_rating ?? null,
        review_count: statsMap.get(featured.id)?.review_count ?? 0,
        latest_release_at: releaseMap.get(featured.id) ?? featured.created_at ?? null,
      }
    : null;

  return {
    featured: featuredWithStats,
    apps: appsWithStats,
  };
}

const STORE_PLATFORM_LABELS: Record<string, string> = {
  ios: "iOS",
  macos: "macOS",
  web: "Web",
};

function platformLabel(platforms: string): string {
  return getPlatforms(platforms)
    .map((p) => STORE_PLATFORM_LABELS[p] ?? p)
    .join(" · ");
}

function stripMarkdown(text: string, max: number): string {
  const plain = text
    .replace(/##?\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^-\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}

function SectionHeader({
  index,
  label,
  title,
  id,
  children,
}: {
  index: string;
  label: string;
  title: string;
  id: string;
  children?: ReactNode;
}) {
  return (
    <div className="home-section__header">
      <div className="home-section__heading">
        <span className="eyebrow">
          {index} — {label}
        </span>
        <h2 id={id} className="home-section__title">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function FeaturedApp({ app }: { app: App }) {
  const platforms = getPlatforms(app.platforms);
  const appIsIOSOnly = isIOSOnly(platforms);
  const appSite = getAppSite(app.slug);
  const displayName = getAppDisplayName(app.slug, app.name);

  return (
    <section className="band" aria-labelledby="featured-title">
      <div className="frame home-split">
        <PlusMark corner="tl" />
        <PlusMark corner="tr" />
        <div className="home-split__copy">
          <span className="eyebrow">01 — Featured app</span>
          <div className="home-featured__title-row">
            <div className="home-featured__icon" id="hero-featured-icon">
              {app.icon_url ? (
                <img src={app.icon_url} alt="" />
              ) : (
                <span aria-hidden="true">{displayName[0].toUpperCase()}</span>
              )}
            </div>
            <h2 id="featured-title" className="home-featured__name">
              {displayName}
            </h2>
          </div>
          {app.tagline && <p className="home-featured__tagline">{app.tagline}</p>}
          {app.description && <p className="home-split__body">{stripMarkdown(app.description, 220)}</p>}
          <div className="home-featured__badges">
            {platforms.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
          </div>
          <div className="home-actions">
            <HeroAppLink
              href={getAppHref(app.slug)}
              className="home-btn home-btn--primary"
              heroIconId="hero-featured-icon"
            >
              {appSite
                ? `Visit ${displayName} ↗`
                : appIsIOSOnly
                  ? "View on the App Store"
                  : `Get — ${formatPrice(app.min_price_cents, app.suggested_price_cents, platforms)}`}
            </HeroAppLink>
            <HeroAppLink
              href={`/apps/${app.slug}`}
              className="home-btn home-btn--ghost"
              heroIconId="hero-featured-icon"
            >
              Learn more
            </HeroAppLink>
          </div>
        </div>
        <div className="home-split__visual dots">
          <div className="home-featured__card">
            <div className="home-featured__card-icon">
              {app.icon_url ? (
                <img src={app.icon_url} alt={`${displayName} icon`} />
              ) : (
                <span aria-hidden="true">{displayName[0].toUpperCase()}</span>
              )}
            </div>
            <span className="home-featured__card-name">{displayName}</span>
            <span className="home-featured__card-meta">{platformLabel(app.platforms)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const env = getEnv();
  const [user, { featured, apps }] = await Promise.all([env ? getCurrentUser(env) : null, getApps()]);

  const allApps = featured ? [featured, ...apps] : apps;
  const icons = Object.fromEntries(
    allApps.filter((app) => app.icon_url).map((app) => [app.slug, app.icon_url as string]),
  );
  const featuredClientWork = CLIENT_WORK.slice(0, 2);
  const featuredName = featured ? getAppDisplayName(featured.slug, featured.name) : null;

  return (
    <>
      <SiteNav user={user} />

      <main className="home">
        {/* HERO */}
        <section className="band" aria-labelledby="home-title">
          <div className="frame dots home-hero">
            <PlusMark corner="bl" />
            <PlusMark corner="br" />
            <div className="home-hero__copy">
              {featured && featuredName && (
                <Link href={`/apps/${featured.slug}`} className="home-hero__badge">
                  <span className="home-hero__badge-tag">Featured</span>
                  <span>
                    {featuredName}
                    {featured.tagline ? ` — ${featured.tagline}` : ""}
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              )}
              <h1 id="home-title" className="home-hero__title">
                Software that ships.
                <br />
                Built with customer #1.
              </h1>
              <p className="home-hero__subtitle">
                A one-person product studio. Privacy-first apps for iOS, Android, Mac and the web, and new
                products built with you as customer #1: lock in a founding price, get the app you need, and keep
                the code, because it&apos;s all open source.
              </p>
              <div className="home-actions">
                <Link href="/apps" className="home-btn home-btn--primary">
                  Browse apps
                </Link>
                <Link href="/hire" className="home-btn home-btn--ghost">
                  Become customer #1
                </Link>
              </div>
            </div>

            {APP_CATALOG.length > 0 && (
              <div className="home-terminal" role="figure" aria-label="List of isolated.tech apps">
                <div className="home-terminal__bar">
                  <span className="home-terminal__lights" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="home-terminal__path">
                    <BrandMark size={12} />
                    ~/isolated.tech
                  </span>
                  <span className="home-terminal__spacer" />
                </div>
                <div className="home-terminal__body">
                  <div>
                    <span className="home-terminal__prompt">$</span> ls apps/ --platform
                  </div>
                  {APP_CATALOG.map((app) => (
                    <div key={app.slug} className="home-terminal__row">
                      {app.website ? (
                        <a href={app.website} className="home-terminal__name" target="_blank" rel="noopener">
                          {app.name}
                          <span className="sr-only"> website (opens in a new tab)</span>
                        </a>
                      ) : (
                        <span className="home-terminal__name home-terminal__name--plain">{app.name}</span>
                      )}
                      <StoreIconLinks
                        appName={app.name}
                        links={app.links}
                        website={app.website}
                        icon={app.icon}
                        source={app.source?.[0]?.href}
                      />
                      <span className="home-terminal__muted home-terminal__tagline">{app.tagline}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
        {featured && <FeaturedApp app={featured} />}

        {/* ALL APPS */}
        <section className="band" id="apps" aria-labelledby="apps-title">
          <div className="frame">
            <SectionHeader index={featured ? "02" : "01"} label="Products" title="Every app" id="apps-title">
              <p className="home-section__aside">
                Small, focused tools for iOS, Android, Mac and the web, built and maintained in-house.
              </p>
            </SectionHeader>
            <AppDirectory icons={icons} />
          </div>
        </section>

        {/* CLIENT WORK */}
        <section className="band" id="work" aria-labelledby="work-title">
          <div className="frame">
            <SectionHeader
              index={featured ? "03" : "02"}
              label="Selected work"
              title="Websites I've built"
              id="work-title"
            >
              <div className="home-actions">
                <Link href="/work" className="home-btn home-btn--ghost">
                  View all work →
                </Link>
                <Link href="/hire" className="home-btn home-btn--primary">
                  Become customer #1
                </Link>
              </div>
            </SectionHeader>
            <div className="home-work">
              {featuredClientWork.map((project) => (
                <article key={project.slug} className="home-work__card">
                  <a
                    href={project.primaryUrl}
                    target="_blank"
                    rel="noopener"
                    className="home-work__image dots"
                    tabIndex={-1}
                    aria-hidden="true"
                  >
                    <img src={project.previewImage} alt="" loading="lazy" />
                  </a>
                  <div className="home-work__body">
                    <span className="home-work__client">{project.client}</span>
                    <h3 className="home-work__headline">{project.headline}</h3>
                    <p className="home-work__summary">{project.summary}</p>
                    <a href={project.primaryUrl} target="_blank" rel="noopener" className="home-work__link">
                      Visit live site ↗<span className="sr-only"> ({project.client})</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CUSTOMER #1 */}
        <section className="band" id="customer-1" aria-labelledby="how-title">
          <div className="frame">
            <SectionHeader
              index={featured ? "04" : "03"}
              label="Customer #1"
              title="Fund the app you want. Lock in the price."
              id="how-title"
            >
              <p className="home-section__aside">
                A small monthly subscription, from $200/month, makes you customer #1 of a product built around
                what you need.
              </p>
            </SectionHeader>
            <ol className="home-steps">
              <li className="home-steps__item">
                <span className="home-steps__index">[01]</span>
                <h3>Lock in a founding price</h3>
                <p>Subscribe as the first customer. Your price is set up front and stays locked.</p>
              </li>
              <li className="home-steps__item">
                <span className="home-steps__index">[02]</span>
                <h3>Get what you need built</h3>
                <p>We work closely and you set the priorities. AI-assisted development keeps the timeline short.</p>
              </li>
              <li className="home-steps__item">
                <span className="home-steps__index">[03]</span>
                <h3>Stay as long as it helps</h3>
                <p>Stop subscribing whenever you like. The product keeps growing for customers #2, #3 and beyond.</p>
              </li>
              <li className="home-steps__item">
                <span className="home-steps__index">[04]</span>
                <h3>Open source, AGPL-3.0</h3>
                <p>I own the product and its direction. The code is public, so it&apos;s always yours to take and run.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* CTA */}
        <section className="band" aria-labelledby="cta-title">
          <div className="frame dots home-cta">
            <PlusMark corner="tl" />
            <PlusMark corner="tr" />
            <PlusMark corner="bl" />
            <PlusMark corner="br" />
            <h2 id="cta-title" className="home-cta__title">
              Have an app you wish existed?
            </h2>
            <p className="home-cta__subtitle">Be customer #1. Lock in a founding price and I&apos;ll build it with you.</p>
            <div className="home-actions home-actions--center">
              <Link href="/hire" className="home-btn home-btn--primary">
                Become customer #1
              </Link>
              <Link href="/apps" className="home-btn home-btn--ghost">
                Browse apps
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
