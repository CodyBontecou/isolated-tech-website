import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PurchaseCard } from "./purchase-card";
import { MediaShowcase, MediaItem } from "./media-showcase";
import { AppTabs, TabId } from "./app-tabs";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { queries } from "@/lib/db";
import { getPlatforms } from "@/lib/app-data";
import { AppNav, AppFooter, ReviewsSection } from "@/components/app-page";
import type { App, AppPageConfig, Review, AppStoreReview, CombinedReviewStats } from "@/components/app-page";

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

interface ArticleCounts {
  docs: number;
  faq: number;
  guides: number;
  blog: number;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  published_at: string;
}

async function getArticleCounts(appId: string): Promise<ArticleCounts> {
  const env = getEnv();
  if (!env?.DB) return { docs: 0, faq: 0, guides: 0, blog: 0 };

  const [helpResult, blogResult] = await Promise.all([
    env.DB.prepare(
      `SELECT article_type, COUNT(*) as count
       FROM help_articles
       WHERE app_id = ? AND is_published = 1 AND article_type IN ('docs', 'faq', 'guide')
       GROUP BY article_type`
    )
      .bind(appId)
      .all<{ article_type: string; count: number }>(),
    env.DB.prepare(
      `SELECT COUNT(*) as count FROM app_blog_posts WHERE app_id = ? AND is_published = 1`
    )
      .bind(appId)
      .first<{ count: number }>(),
  ]);

  const counts: ArticleCounts = { docs: 0, faq: 0, guides: 0, blog: 0 };
  for (const row of helpResult.results || []) {
    if (row.article_type === "docs") counts.docs = row.count;
    if (row.article_type === "faq") counts.faq = row.count;
    if (row.article_type === "guide") counts.guides = row.count;
  }
  counts.blog = blogResult?.count || 0;
  return counts;
}

async function getBlogPosts(appId: string): Promise<BlogPost[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  const result = await env.DB.prepare(
    `SELECT id, slug, title, excerpt, cover_image_url, author_name, published_at
     FROM app_blog_posts
     WHERE app_id = ? AND is_published = 1
     ORDER BY published_at DESC
     LIMIT 6`
  )
    .bind(appId)
    .all<BlogPost>();

  return result.results || [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const app = await getApp(slug);

  if (!app) {
    return { title: "App Not Found" };
  }

  const description = app.tagline || app.description?.slice(0, 160) || "";
  const siteUrl = "https://isolated.tech";
  const appUrl = `${siteUrl}/apps/${app.slug}`;

  // Dynamic OG image URL - generates 1200x630 image with app icon, name, and tagline
  const ogImageUrl = `${siteUrl}/api/og/${app.slug}`;

  return {
    title: app.name,
    description,
    icons: {
      icon: `/apps/${app.slug}/icon`,
      apple: `/apps/${app.slug}/icon`,
    },
    openGraph: {
      type: "website",
      url: appUrl,
      title: `${app.name} — ISOLATED.TECH`,
      description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: app.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${app.name} — ISOLATED.TECH`,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: appUrl,
    },
  };
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function BlogPostsGrid({ posts, appSlug }: { posts: BlogPost[]; appSlug: string }) {
  if (posts.length === 0) {
    return (
      <div className="app-tabs__empty">
        <p>No blog posts yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="blog-posts-grid">
      {posts.map((post) => (
        <Link
          key={post.id}
          href={`/apps/${appSlug}/blog/${post.slug}`}
          className="blog-post-card"
        >
          {post.cover_image_url && (
            <div className="blog-post-card__image">
              <img src={post.cover_image_url} alt="" />
            </div>
          )}
          <div className="blog-post-card__content">
            <time className="blog-post-card__date">{formatDate(post.published_at)}</time>
            <h3 className="blog-post-card__title">{post.title}</h3>
            {post.excerpt && <p className="blog-post-card__excerpt">{post.excerpt}</p>}
          </div>
        </Link>
      ))}
      <Link href={`/apps/${appSlug}/blog`} className="blog-posts-grid__see-all">
        View all posts →
      </Link>
    </div>
  );
}

function HelpSection({ articleCounts, appSlug }: { articleCounts: ArticleCounts; appSlug: string }) {
  const hasHelp = articleCounts.docs > 0 || articleCounts.faq > 0 || articleCounts.guides > 0;
  if (!hasHelp) return null;

  return (
    <section className="app-page__help">
      <h2 className="app-page__section-title">Help & Documentation</h2>
      <div className="app-page__help-links">
        {articleCounts.docs > 0 && (
          <Link href={`/apps/${appSlug}/docs`} className="app-page__help-link">
            <span className="app-page__help-icon">📖</span>
            <span className="app-page__help-text">
              <strong>Documentation</strong>
              <span>{articleCounts.docs} article{articleCounts.docs !== 1 ? "s" : ""}</span>
            </span>
            <span className="app-page__help-arrow">→</span>
          </Link>
        )}
        {articleCounts.faq > 0 && (
          <Link href={`/apps/${appSlug}/faq`} className="app-page__help-link">
            <span className="app-page__help-icon">❓</span>
            <span className="app-page__help-text">
              <strong>FAQ</strong>
              <span>{articleCounts.faq} question{articleCounts.faq !== 1 ? "s" : ""}</span>
            </span>
            <span className="app-page__help-arrow">→</span>
          </Link>
        )}
        {articleCounts.guides > 0 && (
          <Link href={`/apps/${appSlug}/guides`} className="app-page__help-link">
            <span className="app-page__help-icon">🎓</span>
            <span className="app-page__help-text">
              <strong>Guides & Tutorials</strong>
              <span>{articleCounts.guides} guide{articleCounts.guides !== 1 ? "s" : ""}</span>
            </span>
            <span className="app-page__help-arrow">→</span>
          </Link>
        )}
      </div>
    </section>
  );
}

export default async function AppPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const app = await getApp(slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, media, latestUpdates, reviews, appStoreReviews, reviewStats, articleCounts, blogPosts] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getAppMedia(app.id),
    queries.getLatestUpdates(app.id, env || undefined),
    queries.getAppReviews(app.id, env || undefined) as Promise<Review[]>,
    queries.getAppStoreReviews(app.id, env || undefined).catch(() => []) as Promise<AppStoreReview[]>,
    queries.getCombinedReviewStats(app.id, env || undefined).catch(() => 
      queries.getAppReviewStats(app.id, env || undefined)
    ) as Promise<CombinedReviewStats | null>,
    getArticleCounts(app.id),
    getBlogPosts(app.id),
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
  const subscriptionNote = pageConfig?.subscription_note?.trim() || null;
  const hasMacOS = platforms.includes("macos");
  const hasIOS = platforms.includes("ios");

  // Build tabs array - only include tabs that have content
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
  ];

  if (media.length > 0) {
    tabs.push({ id: "screenshots", label: "Screenshots", count: media.length });
  }

  const totalReviews = (reviews?.length || 0) + (appStoreReviews?.length || 0);
  if (totalReviews > 0) {
    tabs.push({ id: "reviews", label: "Reviews", count: totalReviews });
  }

  if (articleCounts.blog > 0) {
    tabs.push({ id: "blog", label: "Blog", count: articleCounts.blog });
  }

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
      <AppNav user={user} redirectPath={`/apps/${app.slug}`} />

      <main className="app-page">
        <a href="/" className="app-page__back">
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
            <Suspense fallback={<div className="app-tabs__loading">Loading...</div>}>
              <AppTabs tabs={tabs}>
                {{
                  overview: (
                    <>
                      {app.description && <MarkdownContent content={app.description} />}
                      <HelpSection articleCounts={articleCounts} appSlug={app.slug} />
                    </>
                  ),
                  screenshots: (
                    <MediaShowcase media={media} />
                  ),
                  reviews: (
                    <ReviewsSection 
                      reviews={reviews} 
                      appStoreReviews={appStoreReviews} 
                      stats={reviewStats} 
                      appStoreUrl={iosAppStoreUrl} 
                    />
                  ),
                  blog: (
                    <BlogPostsGrid posts={blogPosts} appSlug={app.slug} />
                  ),
                }}
              </AppTabs>
            </Suspense>
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
              subscriptionNote={subscriptionNote}
              hasMacOS={hasMacOS}
              hasIOS={hasIOS}
            />
          </aside>
        </div>
      </main>

      <AppFooter />
    </>
  );
}
