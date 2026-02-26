import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SignOutButton } from "@/components/sign-out-button";
import "./instareply.css";

export const metadata: Metadata = {
  title: "instarep.ly — Instant Replies for Creators",
  description: "The iOS keyboard built for UGC creators. Generate contextual responses from your clipboard instantly. Reply to hundreds of TikTok, Instagram, and YouTube comments in seconds without the burnout.",
  openGraph: {
    type: "website",
    url: "https://isolated.tech/apps/instareply",
    title: "instarep.ly — Instant Replies for Creators",
    description: "Reply to hundreds of comments in seconds without the burnout.",
    images: [{ url: "/apps/instareply/icon", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary",
    title: "instarep.ly — Instant Replies for Creators",
    description: "Reply to hundreds of comments in seconds without the burnout.",
    images: ["/apps/instareply/icon"],
  },
};

const FEATURES = [
  {
    emoji: "⚡",
    title: "Lightning Fast",
    description: "Responses in under 200ms",
  },
  {
    emoji: "🦜",
    title: "On-brand Voice",
    description: "Train it with your style",
  },
  {
    emoji: "🔒",
    title: "Privacy First",
    description: "Clipboard data never leaves your device",
  },
  {
    emoji: "😏",
    title: "Emoji Intelligence",
    description: "Matches the energy of comments",
  },
  {
    emoji: "🌍",
    title: "Multi-language",
    description: "Automatic detection, no setup required",
  },
  {
    emoji: "📊",
    title: "Engagement Analytics",
    description: "Track your response patterns",
  },
];

export default async function InstaReplyPage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <div className="ir-page">
      {/* Navigation - matches isolated.tech style */}
      <nav className="nav ir-nav">
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
            <a href="/auth/login?redirect=/apps/instareply">SIGN IN</a>
          )}
        </div>
      </nav>

      <main className="ir-main">
        {/* Hero Section */}
        <section className="ir-hero">
          <a href="/apps" className="ir-back">← ALL APPS</a>
          
          <div className="ir-hero__grid">
            <div className="ir-hero__content">
              <div className="ir-hero__header">
                <img 
                  src="/apps/instareply/icon" 
                  alt="instarep.ly icon" 
                  className="ir-hero__icon"
                />
                <div className="ir-hero__title-group">
                  <span className="ir-badge">iOS</span>
                  <h1 className="ir-hero__title">instarep.ly</h1>
                  <p className="ir-hero__tagline">Instant replies for creators</p>
                </div>
              </div>

              <div className="ir-divider"></div>

              <h2 className="ir-hero__headline">
                Reply to <span className="ir-hero__highlight">hundreds</span> in seconds.
              </h2>

              <p className="ir-hero__desc">
                The iOS keyboard built for UGC creators. Generate contextual responses from your clipboard instantly. Reply to TikTok, Instagram, and YouTube comments without the burnout.
              </p>

              {/* Stats */}
              <div className="ir-stats">
                <div className="ir-stats__item">
                  <span className="ir-stats__value">10×</span>
                  <span className="ir-stats__label">Faster replies</span>
                </div>
                <div className="ir-stats__item">
                  <span className="ir-stats__value">500+</span>
                  <span className="ir-stats__label">Comments/hour</span>
                </div>
                <div className="ir-stats__item">
                  <span className="ir-stats__value">∞</span>
                  <span className="ir-stats__label">Creativity</span>
                </div>
              </div>
            </div>

            {/* App Store Card */}
            <aside className="ir-appstore">
              <div className="ir-appstore__card">
                <span className="ir-appstore__label">AVAILABLE ON</span>
                <h2 className="ir-appstore__title">App Store</h2>
                <a 
                  href="https://apps.apple.com/us/app/instarep-ly/id6754865693" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ir-appstore__btn"
                >
                  DOWNLOAD ON APP STORE
                </a>
                <p className="ir-appstore__note">Download from the iOS App Store.</p>
              </div>
            </aside>
          </div>
        </section>

        {/* How It Works */}
        <section className="ir-section">
          <span className="ir-section__num">001</span>
          <h2 className="ir-section__title">How It Works</h2>
          <p className="ir-section__subtitle">Three steps. Infinite replies. Zero burnout.</p>

          <div className="ir-steps">
            <div className="ir-steps__item">
              <span className="ir-steps__label">COPY</span>
              <span className="ir-steps__line"></span>
            </div>
            <div className="ir-steps__item">
              <span className="ir-steps__label">GENERATE</span>
              <span className="ir-steps__line"></span>
            </div>
            <div className="ir-steps__item">
              <span className="ir-steps__label">SEND</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="ir-section ir-section--alt">
          <span className="ir-section__num">002</span>
          <h2 className="ir-section__title">Built for Creators</h2>
          <p className="ir-section__subtitle">Every feature designed around the UGC workflow.</p>

          <div className="ir-features">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="ir-features__item">
                <span className="ir-features__emoji">{feature.emoji}</span>
                <h3 className="ir-features__title">{feature.title}</h3>
                <p className="ir-features__desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <section className="ir-quote">
          <blockquote className="ir-quote__text">
            <span className="ir-quote__mark">"</span>
            I used to spend 2 hours every night replying to comments. Now I do it in 15 minutes while waiting for my coffee.
          </blockquote>
        </section>

        {/* Quick Setup */}
        <section className="ir-section">
          <span className="ir-section__num">003</span>
          <h2 className="ir-section__title">Quick Setup</h2>
          <p className="ir-section__subtitle">Get started in under 60 seconds.</p>

          <div className="ir-setup">
            <div className="ir-setup__step">
              <div className="ir-setup__dot"></div>
              <span className="ir-setup__text">Download from the App Store</span>
            </div>
            <div className="ir-setup__step">
              <div className="ir-setup__dot"></div>
              <span className="ir-setup__text">Enable the keyboard in Settings</span>
            </div>
            <div className="ir-setup__step">
              <div className="ir-setup__dot"></div>
              <span className="ir-setup__text">Start replying instantly</span>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="ir-cta">
          <h2 className="ir-cta__headline">
            Stop typing.<br />
            <span className="ir-cta__sub">Start creating.</span>
          </h2>
          <p className="ir-cta__text">Join thousands of creators who've reclaimed their time.</p>
          <a 
            href="https://apps.apple.com/us/app/instarep-ly/id6754865693" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ir-cta__btn"
          >
            Download on App Store
          </a>
        </section>
      </main>

      <footer className="ir-footer">
        <span>© 2026 ISOLATED.TECH</span>
      </footer>
    </div>
  );
}
