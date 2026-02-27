import { Metadata } from "next";
import { getEnv } from "@/lib/cloudflare-context";
import { PurchaseCard } from "../[slug]/purchase-card";
import { getAppPageData, getPurchaseCardProps } from "@/lib/app-data";
import { AppNav, AppFooter, ReviewsSection } from "@/components/app-page";
import "./sub-md.css";

const APP_SLUG = "sub-md";

export const metadata: Metadata = {
  title: "sub.md — Reddit Usage Analytics",
  description: "Track and analyze your Reddit usage patterns. Export to Markdown. Native macOS app for power users.",
  openGraph: {
    type: "website",
    url: "https://isolated.tech/apps/sub-md",
    title: "sub.md — Reddit Usage Analytics",
    description: "Track and analyze your Reddit usage patterns. Export to Markdown.",
    images: [{ url: "/apps/sub-md/icon", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary",
    title: "sub.md — Reddit Usage Analytics",
    description: "Track and analyze your Reddit usage patterns. Export to Markdown.",
    images: ["/apps/sub-md/icon"],
  },
};

const FEATURES = [
  { emoji: "📊", title: "Subreddit Stats", description: "See which communities consume your time" },
  { emoji: "⏱️", title: "Time Tracking", description: "Track time spent scrolling and engaging" },
  { emoji: "📝", title: "Markdown Export", description: "Export stats to your PKM system" },
  { emoji: "🔔", title: "Usage Alerts", description: "Get notified when you exceed limits" },
  { emoji: "📈", title: "Weekly Reports", description: "Automated weekly usage summaries" },
  { emoji: "🔒", title: "Privacy First", description: "All data stays on your Mac" },
];

const INSIGHTS = [
  { label: "Most visited subreddit", value: "r/programming" },
  { label: "Daily average", value: "47 min" },
  { label: "Peak hours", value: "9-11 PM" },
];

export default async function SubMdPage() {
  const env = getEnv();
  const { app, user, hasPurchased, reviews, reviewStats } = await getAppPageData(APP_SLUG, env);

  const purchaseCardProps = app ? getPurchaseCardProps(app, user, hasPurchased) : null;

  return (
    <div className="smd-page">
      <AppNav user={user} redirectPath="/apps/sub-md" className="smd-nav" />

      <main className="smd-main">
        {/* Hero Section */}
        <section className="smd-hero">
          <a href="/apps" className="smd-back">← ALL APPS</a>
          
          <div className="smd-hero__grid">
            <div className="smd-hero__content">
              <div className="smd-hero__header">
                <img 
                  src="/apps/sub-md/icon" 
                  alt="sub.md icon" 
                  className="smd-hero__icon"
                />
                <div className="smd-hero__title-group">
                  <span className="smd-badge">macOS</span>
                  <h1 className="smd-hero__title">sub.md</h1>
                  <p className="smd-hero__tagline">Track and analyze your Reddit usage patterns</p>
                </div>
              </div>

              <div className="smd-divider"></div>

              <h2 className="smd-hero__headline">
                Know your<br />
                <span className="smd-hero__highlight">Reddit habits.</span>
              </h2>

              <p className="smd-hero__desc">
                Track time spent on Reddit, analyze which subreddits consume your attention, and export insights to Markdown. Built for Mac users who want to understand their browsing patterns.
              </p>

              <div className="smd-stats">
                <div className="smd-stats__item">
                  <span className="smd-stats__value">∞</span>
                  <span className="smd-stats__label">Subreddits</span>
                </div>
                <div className="smd-stats__item">
                  <span className="smd-stats__value">100%</span>
                  <span className="smd-stats__label">Local</span>
                </div>
                <div className="smd-stats__item">
                  <span className="smd-stats__value">0</span>
                  <span className="smd-stats__label">Tracking</span>
                </div>
              </div>
            </div>

            <aside className="smd-purchase">
              {purchaseCardProps ? (
                <PurchaseCard {...purchaseCardProps} />
              ) : (
                <div className="smd-purchase__card">
                  <span className="smd-purchase__label">NAME YOUR PRICE</span>
                  <h2 className="smd-purchase__title">Pay what you want</h2>
                  <a href="/apps/sub-md" className="smd-purchase__btn">GET THE APP</a>
                  <p className="smd-purchase__note">One-time purchase. No subscription.</p>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* Insights Preview */}
        <section className="smd-section">
          <span className="smd-section__num">001</span>
          <h2 className="smd-section__title">Instant insights</h2>
          <p className="smd-section__subtitle">See your Reddit habits at a glance.</p>

          <div className="smd-insights">
            {INSIGHTS.map((insight) => (
              <div key={insight.label} className="smd-insights__item">
                <span className="smd-insights__label">{insight.label}</span>
                <span className="smd-insights__value">{insight.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="smd-section smd-section--alt">
          <span className="smd-section__num">002</span>
          <h2 className="smd-section__title">Built for power users</h2>
          <p className="smd-section__subtitle">Everything you need to understand your Reddit usage.</p>

          <div className="smd-features">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="smd-features__item">
                <span className="smd-features__emoji">{feature.emoji}</span>
                <h3 className="smd-features__title">{feature.title}</h3>
                <p className="smd-features__desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="smd-section">
          <span className="smd-section__num">003</span>
          <h2 className="smd-section__title">Seamless workflow</h2>
          <p className="smd-section__subtitle">Runs silently in the background. Export when you're ready.</p>

          <div className="smd-workflow">
            <div className="smd-workflow__step">
              <span className="smd-workflow__num">01</span>
              <span className="smd-workflow__text">Install and forget</span>
            </div>
            <div className="smd-workflow__step">
              <span className="smd-workflow__num">02</span>
              <span className="smd-workflow__text">Browse Reddit normally</span>
            </div>
            <div className="smd-workflow__step">
              <span className="smd-workflow__num">03</span>
              <span className="smd-workflow__text">Review insights anytime</span>
            </div>
          </div>
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section className="smd-section">
            <span className="smd-section__num">004</span>
            <ReviewsSection reviews={reviews} stats={reviewStats} />
          </section>
        )}

        {/* Final CTA */}
        <section className="smd-cta">
          <h2 className="smd-cta__headline">
            Understand your<br />
            <span className="smd-cta__highlight">scrolling habits.</span>
          </h2>
          <p className="smd-cta__text">Start tracking today. Zero configuration required.</p>
          {purchaseCardProps && <PurchaseCard {...purchaseCardProps} />}
        </section>
      </main>

      <AppFooter className="smd-footer" />
    </div>
  );
}
