import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PurchaseCard } from "./purchase-card";
import { MediaShowcase, MediaItem } from "./media-showcase";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { queries } from "@/lib/db";

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
  custom_page_config: string | null;
  is_published: number;
  distribution_type: string;
  build_instructions: string | null;
  github_url: string | null;
  required_xcode_version: string | null;
  min_ios_version: string | null;
}

interface AppPageConfig {
  ios_app_store_url?: string;
  ios_app_store_label?: string;
}

async function getApp(slug: string): Promise<App | null> {
  const env = getEnv();
  if (!env?.DB) return null;
  
  const app = await env.DB.prepare(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, min_price_cents, suggested_price_cents, custom_page_config, is_published,
            COALESCE(distribution_type, 'binary') as distribution_type, build_instructions, github_url, required_xcode_version, min_ios_version
     FROM apps WHERE slug = ? AND is_published = 1`
  )
    .bind(slug)
    .first<App>();
  
  return app || null;
}

async function getAppMedia(appId: string): Promise<MediaItem[]> {
  const env = getEnv();
  if (!env?.DB) return [];
  
  const result = await env.DB.prepare(
    `SELECT id, type, url, title
     FROM app_media
     WHERE app_id = ?
     ORDER BY sort_order ASC, created_at ASC`
  )
    .bind(appId)
    .all<{ id: string; type: "image" | "youtube"; url: string; title: string | null }>();
  
  return result.results || [];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const app = await getApp(params.slug);

  if (!app) {
    return { title: "App Not Found" };
  }

  const description = app.tagline || app.description?.slice(0, 160) || "";
  const siteUrl = "https://isolated.tech";
  const appUrl = `${siteUrl}/apps/${app.slug}`;

  return {
    title: app.name,
    description,
    openGraph: {
      type: "website",
      url: appUrl,
      title: `${app.name} — ISOLATED.TECH`,
      description,
      images: app.icon_url ? [{ url: app.icon_url, width: 256, height: 256, alt: app.name }] : [],
    },
    twitter: {
      card: "summary",
      title: `${app.name} — ISOLATED.TECH`,
      description,
      images: app.icon_url ? [app.icon_url] : [],
    },
    alternates: {
      canonical: appUrl,
    },
  };
}

function getPlatforms(platformsJson: string): string[] {
  try {
    return JSON.parse(platformsJson);
  } catch {
    return [];
  }
}

function getPageConfig(configJson: string | null): AppPageConfig | null {
  if (!configJson) return null;

  try {
    const parsed = JSON.parse(configJson) as AppPageConfig;
    return parsed;
  } catch {
    return null;
  }
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-to-HTML conversion
  const html = content
    .split("\n\n")
    .map((block) => {
      if (block.startsWith("## ")) {
        return `<h2>${block.slice(3)}</h2>`;
      }
      if (block.startsWith("- ")) {
        const items = block
          .split("\n")
          .map((line) => {
            if (line.startsWith("- ")) {
              const text = line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
              return `<li>${text}</li>`;
            }
            return "";
          })
          .join("");
        return `<ul>${items}</ul>`;
      }
      if (block.match(/^\d\./)) {
        const items = block
          .split("\n")
          .map((line) => {
            const match = line.match(/^\d\.\s*(.+)/);
            if (match) {
              return `<li>${match[1]}</li>`;
            }
            return "";
          })
          .join("");
        return `<ol>${items}</ol>`;
      }
      return `<p>${block.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("");

  return (
    <div
      className="app-page__description"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default async function AppPage({ params }: { params: { slug: string } }) {
  const app = await getApp(params.slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, media, latestUpdates] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getAppMedia(app.id),
    queries.getLatestUpdates(app.id, env || undefined),
  ]);

  // Check if user already owns this app
  const hasPurchased = user && env
    ? !!(await queries.getPurchase(user.id, app.id, env))
    : false;

  const platforms = getPlatforms(app.platforms);
  const pageConfig = getPageConfig(app.custom_page_config);
  const isFree = app.min_price_cents === 0 && (!app.suggested_price_cents || app.suggested_price_cents === 0);
  const iosAppStoreUrl = pageConfig?.ios_app_store_url?.trim() || null;
  const iosAppStoreLabel = pageConfig?.ios_app_store_label?.trim() || "VIEW ON APP STORE";
  const isSourceCode = app.distribution_type === "source_code";

  // Structured data for rich search results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.tagline || app.description?.slice(0, 160),
    applicationCategory: "DeveloperApplication",
    operatingSystem: platforms.includes("ios") ? "iOS" : "macOS",
    offers: {
      "@type": "Offer",
      price: isFree ? 0 : (app.min_price_cents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    image: app.icon_url || undefined,
    url: `https://isolated.tech/apps/${app.slug}`,
    publisher: {
      "@type": "Organization",
      name: "Isolated Tech",
      url: "https://isolated.tech",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="nav">
        <Link href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </Link>
        <div className="nav__links">
          <Link href="/apps">APPS</Link>
          <Link href="/#about">ABOUT</Link>
          {user ? (
            <>
              <Link href="/dashboard">DASHBOARD</Link>
              <Link href="/api/auth/logout">SIGN OUT</Link>
            </>
          ) : (
            <Link href={`/auth/login?redirect=/apps/${app.slug}`}>SIGN IN</Link>
          )}
        </div>
      </nav>

      <main className="app-page">
        <Link href="/apps" className="app-page__back">
          ← ALL APPS
        </Link>

        <header className="app-page__header">
          <div 
            className="app-page__icon"
            style={{ viewTransitionName: 'app-icon' }}
          >
            {app.icon_url ? (
              <img src={app.icon_url} alt={`${app.name} icon`} />
            ) : (
              app.name[0].toUpperCase()
            )}
          </div>
          <div className="app-page__info">
            <div className="app-page__badges">
              {platforms.map((p) => (
                <span
                  key={p}
                  className={`badge ${p === "ios" ? "badge--ios" : "badge--web"}`}
                >
                  {p === "ios" ? "iOS" : p === "macos" ? "macOS" : p.toUpperCase()}
                </span>
              ))}
              {isSourceCode && (
                <span className="badge badge--source">SOURCE CODE</span>
              )}
            </div>
            <h1 className="app-page__name">{app.name}</h1>
            {app.tagline && <p className="app-page__tagline">{app.tagline}</p>}
          </div>
          {latestUpdates.length > 0 && (
            <Link href={`/apps/${app.slug}/changelog`} className="app-version-pill">
              {latestUpdates.map((u, i) => (
                <span key={u.id} className="app-version-pill__item">
                  {i > 0 && <span className="app-version-pill__sep">·</span>}
                  <span className="app-version-pill__version">v{u.version}</span>
                </span>
              ))}
            </Link>
          )}
        </header>

        <div className="app-page__content">
          <div className="app-page__main">
            {app.description && <MarkdownContent content={app.description} />}

            {/* Source Code Info Section */}
            {isSourceCode && (
              <div className="source-info">
                <h2 className="source-info__title">BUILD FROM SOURCE</h2>
                <p className="source-info__subtitle">
                  This app is distributed as an Xcode project. Download the source code, open it in Xcode, and build to your device.
                </p>

                {/* Requirements */}
                <div className="source-info__requirements">
                  {app.required_xcode_version && (
                    <div className="source-info__req">
                      <span className="source-info__req-label">XCODE</span>
                      <span className="source-info__req-value">{app.required_xcode_version}+</span>
                    </div>
                  )}
                  {app.min_ios_version && (
                    <div className="source-info__req">
                      <span className="source-info__req-label">iOS</span>
                      <span className="source-info__req-value">{app.min_ios_version}+</span>
                    </div>
                  )}
                  <div className="source-info__req">
                    <span className="source-info__req-label">LANG</span>
                    <span className="source-info__req-value">Swift</span>
                  </div>
                </div>

                {/* Build Instructions */}
                {app.build_instructions && (
                  <div className="source-info__instructions">
                    <h3 className="source-info__instructions-title">INSTRUCTIONS</h3>
                    <MarkdownContent content={app.build_instructions} />
                  </div>
                )}

                {/* GitHub Link */}
                {app.github_url && (
                  <a
                    href={app.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-info__github"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    VIEW ON GITHUB
                  </a>
                )}
              </div>
            )}

            <MediaShowcase media={media} />
          </div>

          <aside>
            <PurchaseCard
              appId={app.id}
              appSlug={app.slug}
              appName={app.name}
              minPriceCents={app.min_price_cents}
              suggestedPriceCents={app.suggested_price_cents}
              isFree={isFree}
              isAuthenticated={!!user}
              hasPurchased={hasPurchased}
              iosAppStoreUrl={iosAppStoreUrl}
              iosAppStoreLabel={iosAppStoreLabel}
              distributionType={app.distribution_type}
            />
          </aside>
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
