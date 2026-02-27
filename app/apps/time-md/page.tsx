import { Metadata } from "next";
import { getEnv } from "@/lib/cloudflare-context";
import { PurchaseCard } from "../[slug]/purchase-card";
import { getAppPageData, getPurchaseCardProps } from "@/lib/app-data";
import { AppNav, AppFooter, ReviewsSection } from "@/components/app-page";
import "./time-md.css";

const APP_SLUG = "time-md";

export const metadata: Metadata = {
  title: "time.md — Brutal Screen Time Analytics",
  description: "Track and analyze your screen time with brutal honesty. Export to Markdown. Native macOS app with menu bar integration.",
  openGraph: {
    type: "website",
    url: "https://isolated.tech/apps/time-md",
    title: "time.md — Brutal Screen Time Analytics",
    description: "Track and analyze your screen time with brutal honesty. Export to Markdown.",
    images: [{ url: "/apps/time-md/icon", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary",
    title: "time.md — Brutal Screen Time Analytics",
    description: "Track and analyze your screen time with brutal honesty.",
    images: ["/apps/time-md/icon"],
  },
};

const FEATURES = [
  { emoji: "📊", title: "Daily Reports", description: "Automatic daily summaries of your app usage" },
  { emoji: "📝", title: "Markdown Export", description: "Export your data to Markdown for your PKM system" },
  { emoji: "⏰", title: "Time Blocking", description: "Set focus sessions and track deep work" },
  { emoji: "🔔", title: "Smart Alerts", description: "Get notified when you exceed time limits" },
  { emoji: "📈", title: "Trends & Insights", description: "Weekly and monthly usage trends" },
  { emoji: "🔒", title: "100% Private", description: "All data stays on your device" },
];

export default async function TimeMdPage() {
  const env = getEnv();
  const { app, user, hasPurchased, reviews, reviewStats } = await getAppPageData(APP_SLUG, env);

  const purchaseCardProps = app ? getPurchaseCardProps(app, user, hasPurchased) : null;

  return (
    <div className="tmd-page">
      <AppNav user={user} redirectPath="/apps/time-md" className="tmd-nav" />

      <main className="tmd-main">
        {/* Hero Section */}
        <section className="tmd-hero">
          <a href="/apps" className="tmd-back">← ALL APPS</a>
          
          <div className="tmd-hero__grid">
            <div className="tmd-hero__content">
              <div className="tmd-hero__header">
                <img 
                  src="/apps/time-md/icon" 
                  alt="time.md icon" 
                  className="tmd-hero__icon"
                />
                <div className="tmd-hero__title-group">
                  <div className="tmd-hero__badges">
                    <span className="tmd-badge">macOS</span>
                    <span className="tmd-badge">iOS</span>
                  </div>
                  <h1 className="tmd-hero__title">time.md</h1>
                  <p className="tmd-hero__tagline">Brutal screen time analytics for macOS</p>
                </div>
              </div>

              <div className="tmd-hero__rating">
                <span className="tmd-hero__stars">★ 5.0</span>
              </div>

              <div className="tmd-divider"></div>

              <h2 className="tmd-hero__headline">
                Know where your<br />
                <span className="tmd-hero__highlight">time goes.</span>
              </h2>

              <p className="tmd-hero__desc">
                Track and analyze your screen time with brutal honesty. Export to Markdown for your personal knowledge management system. Native macOS app with menu bar integration.
              </p>

              <div className="tmd-stats">
                <div className="tmd-stats__item">
                  <span className="tmd-stats__value">24/7</span>
                  <span className="tmd-stats__label">Tracking</span>
                </div>
                <div className="tmd-stats__item">
                  <span className="tmd-stats__value">0%</span>
                  <span className="tmd-stats__label">Cloud data</span>
                </div>
                <div className="tmd-stats__item">
                  <span className="tmd-stats__value">∞</span>
                  <span className="tmd-stats__label">History</span>
                </div>
              </div>
            </div>

            <aside className="tmd-purchase">
              {purchaseCardProps ? (
                <PurchaseCard {...purchaseCardProps} />
              ) : (
                <div className="tmd-purchase__card">
                  <span className="tmd-purchase__label">NAME YOUR PRICE</span>
                  <h2 className="tmd-purchase__title">Pay what you want</h2>
                  <a href="/apps/time-md" className="tmd-purchase__btn">GET THE APP</a>
                  <p className="tmd-purchase__note">One-time purchase. No subscription.</p>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* How It Works */}
        <section className="tmd-section">
          <span className="tmd-section__num">001</span>
          <h2 className="tmd-section__title">Automatic tracking</h2>
          <p className="tmd-section__subtitle">Runs silently in your menu bar. No manual input required.</p>

          <div className="tmd-flow">
            <div className="tmd-flow__step">
              <span className="tmd-flow__label">TRACK</span>
            </div>
            <div className="tmd-flow__arrow">→</div>
            <div className="tmd-flow__step">
              <span className="tmd-flow__label">ANALYZE</span>
            </div>
            <div className="tmd-flow__arrow">→</div>
            <div className="tmd-flow__step">
              <span className="tmd-flow__label">EXPORT</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="tmd-section tmd-section--alt">
          <span className="tmd-section__num">002</span>
          <h2 className="tmd-section__title">Built for focus</h2>
          <p className="tmd-section__subtitle">Every feature designed to help you understand your habits.</p>

          <div className="tmd-features">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="tmd-features__item">
                <span className="tmd-features__emoji">{feature.emoji}</span>
                <h3 className="tmd-features__title">{feature.title}</h3>
                <p className="tmd-features__desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Menu Bar */}
        <section className="tmd-section">
          <span className="tmd-section__num">003</span>
          <h2 className="tmd-section__title">Lives in your menu bar</h2>
          <p className="tmd-section__subtitle">Quick glance at today's stats without leaving your workflow.</p>

          <div className="tmd-menubar">
            <div className="tmd-menubar__item">
              <span className="tmd-menubar__icon">🕐</span>
              <span className="tmd-menubar__text">Current session time</span>
            </div>
            <div className="tmd-menubar__item">
              <span className="tmd-menubar__icon">📱</span>
              <span className="tmd-menubar__text">Most used app today</span>
            </div>
            <div className="tmd-menubar__item">
              <span className="tmd-menubar__icon">🎯</span>
              <span className="tmd-menubar__text">Focus time progress</span>
            </div>
          </div>
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section className="tmd-section">
            <span className="tmd-section__num">004</span>
            <ReviewsSection reviews={reviews} stats={reviewStats} />
          </section>
        )}

        {/* Final CTA */}
        <section className="tmd-cta">
          <h2 className="tmd-cta__headline">
            Take back your<br />
            <span className="tmd-cta__highlight">time.</span>
          </h2>
          <p className="tmd-cta__text">Start tracking today. Export forever.</p>
          {purchaseCardProps && <PurchaseCard {...purchaseCardProps} />}
        </section>
      </main>

      <AppFooter className="tmd-footer" />
    </div>
  );
}
