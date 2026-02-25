import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PurchaseCard } from "./purchase-card";
import { MediaShowcase, MediaItem } from "./media-showcase";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare-context";

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
  is_published: number;
}

async function getApp(slug: string): Promise<App | null> {
  const env = getEnv();
  if (!env?.DB) return null;
  
  const app = await env.DB.prepare(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, min_price_cents, suggested_price_cents, is_published
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
  const [user, media] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getAppMedia(app.id),
  ]);

  const platforms = getPlatforms(app.platforms);
  const isFree = app.min_price_cents === 0 && (!app.suggested_price_cents || app.suggested_price_cents === 0);

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
            <Link href="/auth/login">SIGN IN</Link>
          )}
        </div>
      </nav>

      <main className="app-page">
        <Link href="/apps" className="app-page__back">
          ← ALL APPS
        </Link>

        <header className="app-page__header">
          <div className="app-page__icon">
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
                  {p === "ios" ? "iOS" : p.toUpperCase()}
                </span>
              ))}
            </div>
            <h1 className="app-page__name">{app.name}</h1>
            {app.tagline && <p className="app-page__tagline">{app.tagline}</p>}
          </div>
        </header>

        <div className="app-page__content">
          <div className="app-page__main">
            {app.description && <MarkdownContent content={app.description} />}
            <MediaShowcase media={media} />
          </div>

          <aside>
            <PurchaseCard
              appId={app.id}
              appName={app.name}
              minPriceCents={app.min_price_cents}
              suggestedPriceCents={app.suggested_price_cents}
              isFree={isFree}
              isAuthenticated={!!user}
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
