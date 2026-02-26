import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SignOutButton } from "@/components/sign-out-button";
import "./healthmd.css";

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

export default async function HealthMdPage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <div className="hmd-page">
      <nav className="nav hmd-nav">
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
              <div className="hmd-purchase__card">
                <span className="hmd-purchase__label">NAME YOUR PRICE</span>
                <h2 className="hmd-purchase__title">Pay what you want</h2>
                <a 
                  href="/apps/healthmd" 
                  className="hmd-purchase__btn"
                >
                  GET THE APP
                </a>
                <p className="hmd-purchase__note">Also available on the iOS App Store and macOS via Gumroad.</p>
              </div>
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

        {/* Final CTA */}
        <section className="hmd-cta">
          <h2 className="hmd-cta__headline">
            Start syncing your<br />
            <span className="hmd-cta__highlight">health data</span>
          </h2>
          <p className="hmd-cta__text">$5 one-time purchase. No subscription. No hidden costs.</p>
          <div className="hmd-cta__buttons">
            <a 
              href="https://apps.apple.com/us/app/health-md/id6757763969" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hmd-cta__btn"
            >
              Download on App Store
            </a>
            <a 
              href="https://isolated.gumroad.com/l/healthmd-macos" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hmd-cta__btn hmd-cta__btn--secondary"
            >
              macOS on Gumroad
            </a>
          </div>
        </section>
      </main>

      <footer className="hmd-footer">
        <span>© 2026 ISOLATED.TECH</span>
      </footer>
    </div>
  );
}
