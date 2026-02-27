import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SignOutButton } from "@/components/sign-out-button";
import { PurchaseCard } from "../[slug]/purchase-card";
import { queries } from "@/lib/db";
import "./healthmd.css";

const APP_SLUG = "healthmd";

interface AppPageConfig {
  ios_app_store_url?: string;
  ios_app_store_label?: string;
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

function getPageConfig(configJson: string | null): AppPageConfig | null {
  if (!configJson) return null;
  try {
    return JSON.parse(configJson) as AppPageConfig;
  } catch {
    return null;
  }
}

function getPlatforms(platformsJson: string): string[] {
  try {
    return JSON.parse(platformsJson);
  } catch {
    return [];
  }
}

export const metadata: Metadata = {
  title: "health.md — Apple Health → Markdown",
  description: "Export your Apple Health data directly to Markdown files in your iOS file system. On-device. Private. Automated.",
  openGraph: {
    type: "website",
    url: "https://isolated.tech/apps/healthmd",
    title: "health.md — Apple Health → Markdown",
    description: "Export your Apple Health data directly to Markdown files. On-device. Private. Automated.",
    images: [{ url: "/apps/healthmd/icon", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary",
    title: "health.md — Apple Health → Markdown",
    description: "Export your Apple Health data directly to Markdown files. On-device. Private. Automated.",
    images: ["/apps/healthmd/icon"],
  },
};

const FEATURES = [
  {
    title: "168 Metrics",
    description: "Access all your health data types",
  },
  {
    title: "Scheduled Exports",
    description: "Automate daily, weekly, or monthly backups",
  },
  {
    title: "Export Formats",
    description: "Markdown, JSON, or CSV output",
  },
  {
    title: "Full Customization",
    description: "Choose exactly what data to export",
  },
];

const WORKFLOW_FEATURES = [
  {
    title: "Obsidian Ready",
    description: "Perfect for PKM workflows",
  },
  {
    title: "iCloud Sync",
    description: "Save directly to iCloud Drive",
  },
  {
    title: "Shortcuts Support",
    description: "Automate with iOS Shortcuts",
  },
  {
    title: "Templates",
    description: "Customizable export templates",
  },
];

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

export default async function HealthMdPage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  // Fetch app data from database
  const app = env?.DB ? await env.DB.prepare(
    `SELECT id, slug, name, platforms, min_price_cents, suggested_price_cents, custom_page_config
     FROM apps WHERE slug = ? AND is_published = 1`
  ).bind(APP_SLUG).first<{
    id: string;
    slug: string;
    name: string;
    platforms: string;
    min_price_cents: number;
    suggested_price_cents: number | null;
    custom_page_config: string | null;
  }>() : null;

  // Check if user already owns this app
  const hasPurchased = user && app && env
    ? !!(await queries.getPurchase(user.id, app.id, env))
    : false;

  // Fetch reviews and stats
  const [reviews, reviewStats] = app ? await Promise.all([
    queries.getAppReviews(app.id, env || undefined) as Promise<Review[]>,
    queries.getAppReviewStats(app.id, env || undefined) as Promise<ReviewStats | null>,
  ]) : [[], null];

  const platforms = app ? getPlatforms(app.platforms) : ["ios", "macos"];
  const pageConfig = app ? getPageConfig(app.custom_page_config) : null;
  const isFree = app ? (app.min_price_cents === 0 && (!app.suggested_price_cents || app.suggested_price_cents === 0)) : false;
  const iosAppStoreUrl = pageConfig?.ios_app_store_url?.trim() || "https://apps.apple.com/us/app/health-md/id6757763969";
  const iosAppStoreLabel = pageConfig?.ios_app_store_label?.trim() || "DOWNLOAD ON APP STORE (iOS)";
  const hasMacOS = platforms.includes("macos");
  const hasIOS = platforms.includes("ios");

  return (
    <div className="hmd-page">
      <nav className="nav hmd-nav">
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
            <a href="/auth/login?redirect=/apps/healthmd">SIGN IN</a>
          )}
        </div>
      </nav>

      <main className="hmd-main">
        {/* Hero Section */}
        <section className="hmd-hero">
          <a href="/apps" className="hmd-back">← ALL APPS</a>
          
          <div className="hmd-hero__grid">
            <div className="hmd-hero__content">
              <div className="hmd-hero__header">
                <img 
                  src="/apps/healthmd/icon" 
                  alt="health.md icon" 
                  className="hmd-hero__icon"
                />
                <div className="hmd-hero__title-group">
                  <div className="hmd-hero__badges">
                    <span className="hmd-badge">iOS</span>
                    <span className="hmd-badge">macOS</span>
                  </div>
                  <h1 className="hmd-hero__title">health.md</h1>
                  <p className="hmd-hero__tagline">Apple Health → Markdown</p>
                </div>
              </div>

              <div className="hmd-divider"></div>

              <h2 className="hmd-hero__headline">
                <span className="hmd-hero__text-muted">Health</span>
                <span className="hmd-hero__arrow">→</span>
                <span className="hmd-hero__highlight">Markdown</span>
              </h2>

              <p className="hmd-hero__desc">
                Export your Apple Health data directly to Markdown files in your iOS file system. On-device. Private. Automated.
              </p>

              {/* Stats */}
              <div className="hmd-stats">
                <div className="hmd-stats__item">
                  <span className="hmd-stats__value">168</span>
                  <span className="hmd-stats__label">Health metrics</span>
                </div>
                <div className="hmd-stats__item">
                  <span className="hmd-stats__value">100%</span>
                  <span className="hmd-stats__label">On-device</span>
                </div>
                <div className="hmd-stats__item">
                  <span className="hmd-stats__value">0</span>
                  <span className="hmd-stats__label">Cloud sync</span>
                </div>
              </div>
            </div>

            {/* Purchase Card */}
            <aside className="hmd-purchase">
              {app ? (
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
              ) : (
                <div className="hmd-purchase__card">
                  <span className="hmd-purchase__label">NAME YOUR PRICE</span>
                  <h2 className="hmd-purchase__title">Pay what you want</h2>
                  <a href="/apps/healthmd" className="hmd-purchase__btn">GET THE APP</a>
                  <p className="hmd-purchase__note">Also available on the iOS App Store and macOS via Gumroad.</p>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* See it in action */}
        <section className="hmd-section">
          <span className="hmd-section__num">001</span>
          <h2 className="hmd-section__title">See it in action</h2>
          <p className="hmd-section__subtitle">Export your health data with a few taps.</p>

          <div className="hmd-features">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="hmd-features__item">
                <h3 className="hmd-features__title">{feature.title}</h3>
                <p className="hmd-features__desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* macOS */}
        <section className="hmd-section hmd-section--alt">
          <span className="hmd-section__num">002</span>
          <h2 className="hmd-section__title">Introducing health.md for macOS</h2>
          <p className="hmd-section__subtitle">The macOS companion app is now available. Sync data from your iPhone over your local network.</p>

          <div className="hmd-macos-features">
            <div className="hmd-macos-features__item">
              <span className="hmd-macos-features__bullet"></span>
              <span>Native macOS app with Sync, Export, Schedule, and History</span>
            </div>
            <div className="hmd-macos-features__item">
              <span className="hmd-macos-features__bullet"></span>
              <span>Load iPhone data over Wi-Fi/Bluetooth for a true personal database</span>
            </div>
            <div className="hmd-macos-features__item">
              <span className="hmd-macos-features__bullet"></span>
              <span>Menu bar controls and scheduled desktop exports</span>
            </div>
            <div className="hmd-macos-features__item">
              <span className="hmd-macos-features__bullet"></span>
              <span>Share export engine and templates across iOS and macOS</span>
            </div>
          </div>
        </section>

        {/* Seamless data flow */}
        <section className="hmd-section">
          <span className="hmd-section__num">003</span>
          <h2 className="hmd-section__title">Seamless data flow</h2>
          <p className="hmd-section__subtitle">Your health data, your way.</p>

          <div className="hmd-flow">
            <div className="hmd-flow__step">
              <span className="hmd-flow__icon">📱</span>
              <span className="hmd-flow__text">Apple Health</span>
            </div>
            <div className="hmd-flow__arrow">→</div>
            <div className="hmd-flow__step">
              <span className="hmd-flow__icon">⚙️</span>
              <span className="hmd-flow__text">health.md</span>
            </div>
            <div className="hmd-flow__arrow">→</div>
            <div className="hmd-flow__step">
              <span className="hmd-flow__icon">📝</span>
              <span className="hmd-flow__text">Markdown</span>
            </div>
          </div>
        </section>

        {/* Built for your workflow */}
        <section className="hmd-section hmd-section--alt">
          <span className="hmd-section__num">004</span>
          <h2 className="hmd-section__title">Built for your workflow</h2>
          <p className="hmd-section__subtitle">Integrates with your existing tools.</p>

          <div className="hmd-features">
            {WORKFLOW_FEATURES.map((feature) => (
              <div key={feature.title} className="hmd-features__item">
                <h3 className="hmd-features__title">{feature.title}</h3>
                <p className="hmd-features__desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section className="hmd-section">
            <span className="hmd-section__num">005</span>
            <ReviewsSection reviews={reviews} stats={reviewStats} />
          </section>
        )}

        {/* Final CTA */}
        <section className="hmd-cta">
          <h2 className="hmd-cta__headline">
            Start syncing your<br />
            <span className="hmd-cta__highlight">health data</span>
          </h2>
          <p className="hmd-cta__text">$5 one-time purchase. No subscription. No hidden costs.</p>
          {app && (
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
          )}
        </section>
      </main>

      <footer className="hmd-footer">
        <span>© 2026 ISOLATED.TECH</span>
      </footer>
    </div>
  );
}
