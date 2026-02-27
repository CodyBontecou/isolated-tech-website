import { Metadata } from "next";
import { getEnv } from "@/lib/cloudflare-context";
import { PurchaseCard } from "../[slug]/purchase-card";
import { getAppPageData, getPurchaseCardProps } from "@/lib/app-data";
import { AppNav, AppFooter, ReviewsSection } from "@/components/app-page";
import "./sync-md.css";

const APP_SLUG = "sync-md";

export const metadata: Metadata = {
  title: "Sync.md — Git on your iPhone",
  description: "Real Git on your iPhone. Clone, pull, commit & push any repo. No terminals, no browser. Just Markdown synced with Git.",
  openGraph: {
    type: "website",
    url: "https://isolated.tech/apps/sync-md",
    title: "Sync.md — Git on your iPhone",
    description: "Real Git on your iPhone. Clone, pull, commit & push any repo. No terminals, no browser.",
    images: [{ url: "/apps/sync-md/icon", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary",
    title: "Sync.md — Git on your iPhone",
    description: "Real Git on your iPhone. Clone, pull, commit & push any repo.",
    images: ["/apps/sync-md/icon"],
  },
};

const FEATURES = [
  { emoji: "📂", title: "Real Git Operations", description: "Clone, pull, commit, push — all from your iPhone" },
  { emoji: "✍️", title: "Markdown Editor", description: "Native editing with syntax highlighting" },
  { emoji: "🔄", title: "Auto Sync", description: "Automatic commits and pushes on save" },
  { emoji: "🔒", title: "SSH Keys", description: "Secure authentication with GitHub, GitLab, etc." },
  { emoji: "📱", title: "Native iOS", description: "Built for iPhone, not a web wrapper" },
  { emoji: "⚡", title: "Instant Access", description: "Your notes are always up to date" },
];

const WORKFLOWS = [
  "Obsidian vaults synced via Git",
  "Developer documentation on the go",
  "Blog posts written from your phone",
  "Meeting notes committed instantly",
];

export default async function SyncMdPage() {
  const env = getEnv();
  const { app, user, hasPurchased, reviews, reviewStats } = await getAppPageData(APP_SLUG, env);

  const purchaseCardProps = app ? getPurchaseCardProps(app, user, hasPurchased, {
    ios_app_store_url: "https://apps.apple.com/us/app/sync-md/id6502457567",
  }) : null;

  return (
    <div className="symd-page">
      <AppNav user={user} redirectPath="/apps/sync-md" className="symd-nav" />

      <main className="symd-main">
        {/* Hero Section */}
        <section className="symd-hero">
          <a href="/apps" className="symd-back">← ALL APPS</a>
          
          <div className="symd-hero__grid">
            <div className="symd-hero__content">
              <div className="symd-hero__header">
                <img 
                  src="/apps/sync-md/icon" 
                  alt="Sync.md icon" 
                  className="symd-hero__icon"
                />
                <div className="symd-hero__title-group">
                  <span className="symd-badge">iOS</span>
                  <h1 className="symd-hero__title">Sync<span className="symd-hero__title-accent">.md</span></h1>
                  <p className="symd-hero__tagline">Markdown notes synced with Git</p>
                </div>
              </div>

              <div className="symd-divider"></div>

              <h2 className="symd-hero__headline">
                <span className="symd-hero__highlight">Git</span> on your iPhone.
              </h2>

              <p className="symd-hero__desc">
                Real Git on your iPhone. Clone, pull, commit & push any repo. No terminals, no browser. Just Markdown synced with Git.
              </p>

              <div className="symd-pills">
                <span className="symd-pill">📂 100 File Operations</span>
                <span className="symd-pill">✏️ Markdown + Git-Sync</span>
                <span className="symd-pill">🔄 Auto Sync Workflows</span>
                <span className="symd-pill">🔐 SSH Key Support</span>
              </div>
            </div>

            <aside className="symd-appstore">
              {purchaseCardProps ? (
                <PurchaseCard {...purchaseCardProps} />
              ) : (
                <div className="symd-appstore__card">
                  <span className="symd-appstore__label">AVAILABLE ON</span>
                  <h2 className="symd-appstore__title">App Store</h2>
                  <a 
                    href="https://apps.apple.com/us/app/sync-md/id6502457567" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="symd-appstore__btn"
                  >
                    DOWNLOAD ON APP STORE
                  </a>
                  <p className="symd-appstore__note">Download from the iOS App Store.</p>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* How It Works */}
        <section className="symd-section">
          <span className="symd-section__num">001</span>
          <h2 className="symd-section__title">Simple workflow</h2>
          <p className="symd-section__subtitle">Connect your repo and start writing.</p>

          <div className="symd-flow">
            <div className="symd-flow__step">
              <span className="symd-flow__label">CLONE</span>
            </div>
            <div className="symd-flow__arrow">→</div>
            <div className="symd-flow__step">
              <span className="symd-flow__label">EDIT</span>
            </div>
            <div className="symd-flow__arrow">→</div>
            <div className="symd-flow__step">
              <span className="symd-flow__label">SYNC</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="symd-section symd-section--alt">
          <span className="symd-section__num">002</span>
          <h2 className="symd-section__title">Built for writers & developers</h2>
          <p className="symd-section__subtitle">Everything you need for Git-based notes on iOS.</p>

          <div className="symd-features">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="symd-features__item">
                <span className="symd-features__emoji">{feature.emoji}</span>
                <h3 className="symd-features__title">{feature.title}</h3>
                <p className="symd-features__desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Use Cases */}
        <section className="symd-section">
          <span className="symd-section__num">003</span>
          <h2 className="symd-section__title">Perfect for</h2>
          <p className="symd-section__subtitle">Popular use cases from our users.</p>

          <div className="symd-usecases">
            {WORKFLOWS.map((workflow) => (
              <div key={workflow} className="symd-usecases__item">
                <span className="symd-usecases__bullet"></span>
                <span className="symd-usecases__text">{workflow}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section className="symd-section">
            <span className="symd-section__num">004</span>
            <ReviewsSection reviews={reviews} stats={reviewStats} />
          </section>
        )}

        {/* Final CTA */}
        <section className="symd-cta">
          <h2 className="symd-cta__headline">
            Your notes.<br />
            <span className="symd-cta__highlight">Always in sync.</span>
          </h2>
          <p className="symd-cta__text">Real Git. Real sync. No compromises.</p>
          <a 
            href="https://apps.apple.com/us/app/sync-md/id6502457567" 
            target="_blank" 
            rel="noopener noreferrer"
            className="symd-cta__btn"
          >
            Download on App Store
          </a>
        </section>
      </main>

      <AppFooter className="symd-footer" />
    </div>
  );
}
