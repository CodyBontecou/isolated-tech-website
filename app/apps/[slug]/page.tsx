import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PurchaseCard } from "./purchase-card";
import { MediaShowcase, MediaItem } from "./media-showcase";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { queries } from "@/lib/db";
import { SignOutButton } from "@/components/sign-out-button";

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
}

interface AppPageConfig {
  ios_app_store_url?: string;
  ios_app_store_label?: string;
}

async function getApp(slug: string): Promise<App | null> {
  const env = getEnv();
  if (!env?.DB) return null;
  
  const app = await env.DB.prepare(
    `SELECT id, slug, name, tagline, description, icon_url, platforms, min_price_cents, suggested_price_cents, custom_page_config, is_published
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

interface Review {
  id: string;
  user_id: string;
  app_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  user_name: string | null;
}

interface ReviewStats {
  avg_rating: number | null;
  review_count: number;
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
  // Apply inline formatting: links, bold, and inline code
  const formatInline = (text: string) => {
    return text
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  };

  // Parse table rows
  const parseTable = (tableLines: string[]): string => {
    const rows = tableLines.filter(line => line.trim().startsWith("|"));
    if (rows.length < 2) return "";
    
    const parseRow = (row: string): string[] => {
      return row.split("|").slice(1, -1).map(cell => cell.trim());
    };
    
    const headerCells = parseRow(rows[0]);
    // Skip separator row (rows[1])
    const bodyRows = rows.slice(2);
    
    const headerHtml = `<thead><tr>${headerCells.map(cell => `<th>${formatInline(cell)}</th>`).join("")}</tr></thead>`;
    const bodyHtml = bodyRows.length > 0 
      ? `<tbody>${bodyRows.map(row => `<tr>${parseRow(row).map(cell => `<td>${formatInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody>`
      : "";
    
    return `<table>${headerHtml}${bodyHtml}</table>`;
  };

  // First, extract fenced code blocks to protect them from other processing
  const codeBlocks: string[] = [];
  const contentWithPlaceholders = content.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const index = codeBlocks.length;
    const langClass = lang ? ` class="language-${lang}"` : "";
    codeBlocks.push(`<pre><code${langClass}>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;").trimEnd()}</code></pre>`);
    return `__CODE_BLOCK_${index}__`;
  });

  // Split by double newlines for block processing
  const blocks = contentWithPlaceholders.split(/\n\n+/);
  
  const html = blocks.map((block) => {
    // Check for code block placeholder
    const codeMatch = block.match(/^__CODE_BLOCK_(\d+)__$/);
    if (codeMatch) {
      return codeBlocks[parseInt(codeMatch[1])];
    }
    
    // Headers
    if (block.startsWith("### ")) {
      return `<h3>${formatInline(block.slice(4))}</h3>`;
    }
    if (block.startsWith("## ")) {
      return `<h2>${formatInline(block.slice(3))}</h2>`;
    }
    if (block.startsWith("# ")) {
      return `<h1>${formatInline(block.slice(2))}</h1>`;
    }
    
    // Tables - detect if block contains table rows
    const lines = block.split("\n");
    if (lines.some(line => line.trim().startsWith("|") && line.trim().endsWith("|"))) {
      return parseTable(lines);
    }
    
    // Unordered lists
    if (block.startsWith("- ")) {
      const items = lines
        .map((line) => {
          if (line.startsWith("- ")) {
            return `<li>${formatInline(line.slice(2))}</li>`;
          }
          return "";
        })
        .join("");
      return `<ul>${items}</ul>`;
    }
    
    // Ordered lists
    if (block.match(/^\d\./)) {
      const items = lines
        .map((line) => {
          const match = line.match(/^\d\.\s*(.+)/);
          if (match) {
            return `<li>${formatInline(match[1])}</li>`;
          }
          return "";
        })
        .join("");
      return `<ol>${items}</ol>`;
    }
    
    // Regular paragraph
    return `<p>${formatInline(block)}</p>`;
  }).join("");

  return (
    <div
      className="app-page__description"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function StarRating({ rating, size = "md" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "star-rating--sm" : size === "lg" ? "star-rating--lg" : "";
  return (
    <div className={`star-rating ${sizeClass}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star-rating__star ${star <= rating ? "star-rating__star--filled" : ""}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? "s" : ""} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? "s" : ""} ago`;
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="review-card">
      <header className="review-card__header">
        <StarRating rating={review.rating} size="sm" />
        <time className="review-card__date" dateTime={review.created_at}>
          {formatRelativeTime(review.created_at)}
        </time>
      </header>
      {review.title && <h4 className="review-card__title">{review.title}</h4>}
      {review.body && <p className="review-card__body">{review.body}</p>}
      <footer className="review-card__footer">
        <span className="review-card__author">{review.user_name || "Anonymous"}</span>
      </footer>
    </article>
  );
}

function ReviewsSection({ reviews, stats }: { reviews: Review[]; stats: ReviewStats | null }) {
  if (!reviews.length) return null;

  const avgRating = stats?.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : 0;

  return (
    <section className="reviews-section">
      <header className="reviews-section__header">
        <h2 className="reviews-section__title">REVIEWS</h2>
        {stats && stats.review_count > 0 && (
          <div className="reviews-section__summary">
            <span className="reviews-section__avg">{avgRating.toFixed(1)}</span>
            <StarRating rating={Math.round(avgRating)} size="md" />
            <span className="reviews-section__count">
              {stats.review_count} review{stats.review_count !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </header>
      <div className="reviews-section__list">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </section>
  );
}

export default async function AppPage({ params }: { params: { slug: string } }) {
  const app = await getApp(params.slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, media, latestUpdates, reviews, reviewStats] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getAppMedia(app.id),
    queries.getLatestUpdates(app.id, env || undefined),
    queries.getAppReviews(app.id, env || undefined) as Promise<Review[]>,
    queries.getAppReviewStats(app.id, env || undefined) as Promise<ReviewStats | null>,
  ]);

  // Check if user already owns this app
  const hasPurchased = user && env
    ? !!(await queries.getPurchase(user.id, app.id, env))
    : false;

  const platforms = getPlatforms(app.platforms);
  const pageConfig = getPageConfig(app.custom_page_config);
  const isFree = app.min_price_cents === 0 && (!app.suggested_price_cents || app.suggested_price_cents === 0);
  const iosAppStoreUrl = pageConfig?.ios_app_store_url?.trim() || null;
  const iosAppStoreLabel = pageConfig?.ios_app_store_label?.trim() || "DOWNLOAD ON APP STORE (iOS)";
  const hasMacOS = platforms.includes("macos");
  const hasIOS = platforms.includes("ios");

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
            <a href={`/auth/login?redirect=/apps/${app.slug}`}>SIGN IN</a>
          )}
        </div>
      </nav>

      <main className="app-page">
        <a href="/apps" className="app-page__back">
          ← ALL APPS
        </a>

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

            <MediaShowcase media={media} />

            <ReviewsSection reviews={reviews} stats={reviewStats} />
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
              hasMacOS={hasMacOS}
              hasIOS={hasIOS}
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
