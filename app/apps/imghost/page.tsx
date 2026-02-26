import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SignOutButton } from "@/components/sign-out-button";
import "./imghost.css";

export const metadata: Metadata = {
  title: "imghost — Brutal Image Hosting",
  description: "No fluff. No friction. Just brutal efficiency. Share images from anywhere on iOS and get instant, direct links.",
  openGraph: {
    type: "website",
    url: "https://isolated.tech/apps/imghost",
    title: "imghost — Brutal Image Hosting",
    description: "No fluff. No friction. Just brutal efficiency. Share images from anywhere on iOS and get instant, direct links.",
    images: [{ url: "/apps/imghost/icon", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary",
    title: "imghost — Brutal Image Hosting",
    description: "No fluff. No friction. Just brutal efficiency.",
    images: ["/apps/imghost/icon"],
  },
};

const FEATURES = [
  {
    title: "High Contrast UI",
    description: "Pure black. Pure white. Nothing in between. Designed for focus.",
  },
  {
    title: "Monospace Typography",
    description: "Technical. Precise. Every character counts.",
  },
  {
    title: "Zero Decoration",
    description: "No gradients. No shadows. No rounded corners. Just content.",
  },
  {
    title: "Precision-Inspired",
    description: "Built for people who appreciate raw, utilitarian design.",
  },
];

const STEPS = [
  { num: "01", title: "Select", description: "Choose images from your library or camera" },
  { num: "02", title: "Upload", description: "Instant upload with progress indicator" },
  { num: "03", title: "Share", description: "Copy direct link or share anywhere" },
];

export default async function ImghostPage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <div className="img-page">
      <nav className="nav img-nav">
        <a href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </a>
        <div className="nav__links">
          <a href="/apps">APPS</a>
          <a href="/#about">ABOUT</a>
          {user ? (
            <>
              {user.isAdmin && <a href="/admin">ADMIN</a>}
              <a href="/dashboard">DASHBOARD</a>
              <SignOutButton />
            </>
          ) : (
            <a href="/auth/login?redirect=/apps/imghost">SIGN IN</a>
          )}
        </div>
      </nav>

      <main className="img-main">
        {/* Hero Section */}
        <section className="img-hero">
          <a href="/apps" className="img-back">← ALL APPS</a>
          
          <div className="img-hero__grid">
            <div className="img-hero__content">
              <div className="img-hero__header">
                <img 
                  src="/apps/imghost/icon" 
                  alt="imghost icon" 
                  className="img-hero__icon"
                />
                <div className="img-hero__title-group">
                  <span className="img-badge">iOS</span>
                  <h1 className="img-hero__title">imghost</h1>
                  <p className="img-hero__tagline">Brutal image hosting for iOS & Mac</p>
                </div>
              </div>

              <div className="img-divider"></div>

              <h2 className="img-hero__headline">
                UPLOAD.<br />
                SHARE.<br />
                DONE.
              </h2>

              <p className="img-hero__desc">
                No fluff. No friction. Just brutal efficiency. Share images from anywhere on iOS and get instant, direct links.
              </p>

              {/* Stats */}
              <div className="img-stats">
                <div className="img-stats__item">
                  <span className="img-stats__value">7</span>
                  <span className="img-stats__label">Day free trial</span>
                </div>
                <div className="img-stats__item">
                  <span className="img-stats__value">10GB</span>
                  <span className="img-stats__label">Free storage</span>
                </div>
                <div className="img-stats__item">
                  <span className="img-stats__value">&lt;1s</span>
                  <span className="img-stats__label">Upload speed</span>
                </div>
                <div className="img-stats__item">
                  <span className="img-stats__value">0</span>
                  <span className="img-stats__label">Hidden costs</span>
                </div>
              </div>
            </div>

            {/* App Store Card */}
            <aside className="img-appstore">
              <div className="img-appstore__card">
                <span className="img-appstore__label">AVAILABLE ON</span>
                <h2 className="img-appstore__title">App Store</h2>
                <a 
                  href="https://apps.apple.com/us/app/imghost/id6478843906" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="img-appstore__btn"
                >
                  DOWNLOAD ON APP STORE
                </a>
                <p className="img-appstore__note">Download from the iOS App Store.</p>
              </div>
            </aside>
          </div>
        </section>

        {/* Everything you need */}
        <section className="img-section">
          <span className="img-section__num">001</span>
          <h2 className="img-section__title">Everything you need.<br />Nothing you don't.</h2>
          <p className="img-section__subtitle">Stripped down to the essentials.</p>
        </section>

        {/* Three steps */}
        <section className="img-section img-section--alt">
          <span className="img-section__num">002</span>
          <h2 className="img-section__title">Three steps. Zero friction.</h2>
          <p className="img-section__subtitle">Upload and share in seconds.</p>

          <div className="img-steps">
            {STEPS.map((step) => (
              <div key={step.num} className="img-steps__item">
                <span className="img-steps__num">{step.num}</span>
                <h3 className="img-steps__title">{step.title}</h3>
                <p className="img-steps__desc">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Brutally beautiful */}
        <section className="img-section">
          <span className="img-section__num">003</span>
          <h2 className="img-section__title">Brutally beautiful.</h2>
          <p className="img-section__subtitle">Designed for clarity and speed.</p>

          <div className="img-features">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="img-features__item">
                <span className="img-features__bullet"></span>
                <div>
                  <h3 className="img-features__title">{feature.title}</h3>
                  <p className="img-features__desc">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="img-section img-section--alt">
          <span className="img-section__num">004</span>
          <h2 className="img-section__title">Start free.<br />Upgrade when ready.</h2>
          <p className="img-section__subtitle">No credit card required to try.</p>
        </section>

        {/* Final CTA */}
        <section className="img-cta">
          <h2 className="img-cta__headline">
            TRY IT<br />
            <span className="img-cta__highlight">FREE.</span>
          </h2>
          <p className="img-cta__text">Start your 7-day free trial. No credit card required. Experience brutal image hosting.</p>
          <a 
            href="https://apps.apple.com/us/app/imghost/id6478843906" 
            target="_blank" 
            rel="noopener noreferrer"
            className="img-cta__btn"
          >
            Download on App Store
          </a>
        </section>
      </main>

      <footer className="img-footer">
        <span>© 2026 ISOLATED.TECH</span>
      </footer>
    </div>
  );
}
