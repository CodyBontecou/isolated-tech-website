import { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { SignOutButton } from "@/components/sign-out-button";
import "./instarep-ly.css";

export const metadata: Metadata = {
  title: "instarep.ly — Instant Replies for Creators",
  description: "The iOS keyboard built for UGC creators. Generate contextual responses from your clipboard instantly. Reply to hundreds of TikTok, Instagram, and YouTube comments in seconds without the burnout.",
  openGraph: {
    type: "website",
    url: "https://isolated.tech/apps/instarep-ly",
    title: "instarep.ly — Instant Replies for Creators",
    description: "Reply to hundreds of comments in seconds without the burnout.",
    images: [{ url: "https://appicons.isolated.tech/instarep-ly-1024.png", width: 1024, height: 1024 }],
  },
  twitter: {
    card: "summary",
    title: "instarep.ly — Instant Replies for Creators",
    description: "Reply to hundreds of comments in seconds without the burnout.",
    images: ["https://appicons.isolated.tech/instarep-ly-1024.png"],
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

const STEPS = [
  {
    num: "01",
    title: "Copy",
    description: "Copy a comment from any app",
  },
  {
    num: "02",
    title: "Generate",
    description: "Tap to generate a contextual reply",
  },
  {
    num: "03",
    title: "Send",
    description: "Paste and post instantly",
  },
];

export default async function InstarepLyPage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <>
      <nav className="nav">
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
            <a href="/auth/login?redirect=/apps/instarep-ly">SIGN IN</a>
          )}
        </div>
      </nav>

      <main className="instarep">
        {/* Hero Section */}
        <section className="instarep__hero">
          <a href="/apps" className="instarep__back">← ALL APPS</a>
          
          <div className="instarep__hero-content">
            <div className="instarep__hero-left">
              <span className="instarep__badge">iOS KEYBOARD</span>
              <h1 className="instarep__headline">
                Reply to <span className="instarep__highlight">hundreds</span> in seconds.
              </h1>
              <p className="instarep__subheadline">
                The keyboard built for UGC creators. Generate contextual responses from your clipboard instantly. Reply to TikTok, Instagram, and YouTube comments without the burnout.
              </p>
              
              <div className="instarep__ctas">
                <a 
                  href="https://apps.apple.com/us/app/instarep-ly/id6754865693" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="instarep__cta instarep__cta--primary"
                >
                  Download on App Store
                </a>
              </div>

              <div className="instarep__stats">
                <div className="instarep__stat">
                  <span className="instarep__stat-value">10×</span>
                  <span className="instarep__stat-label">Faster replies</span>
                </div>
                <div className="instarep__stat">
                  <span className="instarep__stat-value">500+</span>
                  <span className="instarep__stat-label">Comments/hour</span>
                </div>
                <div className="instarep__stat">
                  <span className="instarep__stat-value">∞</span>
                  <span className="instarep__stat-label">Creativity</span>
                </div>
              </div>
            </div>

            <div className="instarep__hero-right">
              <div className="instarep__phone-frame">
                <div className="instarep__phone-notch"></div>
                <div className="instarep__phone-screen">
                  <div className="instarep__demo-comment">
                    <span className="instarep__demo-user">@creativefan</span>
                    <span className="instarep__demo-text">omg where did you get that outfit?! 😍</span>
                  </div>
                  <div className="instarep__demo-reply">
                    <div className="instarep__demo-input">
                      <span className="instarep__demo-cursor"></span>
                    </div>
                    <button className="instarep__demo-generate">⚡ Generate</button>
                  </div>
                  <div className="instarep__demo-keyboard">
                    <div className="instarep__demo-keys">
                      {['Q','W','E','R','T','Y','U','I','O','P'].map(k => <span key={k}>{k}</span>)}
                    </div>
                    <div className="instarep__demo-keys">
                      {['A','S','D','F','G','H','J','K','L'].map(k => <span key={k}>{k}</span>)}
                    </div>
                    <div className="instarep__demo-keys">
                      {['⇧','Z','X','C','V','B','N','M','⌫'].map(k => <span key={k}>{k}</span>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="instarep__section instarep__section--alt">
          <span className="instarep__section-num">001</span>
          <h2 className="instarep__section-title">How It Works</h2>
          <p className="instarep__section-subtitle">Three steps. Infinite replies. Zero burnout.</p>

          <div className="instarep__steps">
            {STEPS.map((step, i) => (
              <div key={step.num} className="instarep__step">
                <span className="instarep__step-num">{step.num}</span>
                <h3 className="instarep__step-title">{step.title}</h3>
                <p className="instarep__step-desc">{step.description}</p>
                {i < STEPS.length - 1 && <div className="instarep__step-arrow">→</div>}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="instarep__section">
          <span className="instarep__section-num">002</span>
          <h2 className="instarep__section-title">Built for Creators</h2>
          <p className="instarep__section-subtitle">Every feature designed around the UGC workflow.</p>

          <div className="instarep__features">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="instarep__feature">
                <span className="instarep__feature-emoji">{feature.emoji}</span>
                <h3 className="instarep__feature-title">{feature.title}</h3>
                <p className="instarep__feature-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial */}
        <section className="instarep__section instarep__section--quote">
          <blockquote className="instarep__quote">
            <span className="instarep__quote-mark">"</span>
            <p>I used to spend 2 hours every night replying to comments. Now I do it in 15 minutes while waiting for my coffee.</p>
          </blockquote>
        </section>

        {/* Quick Setup */}
        <section className="instarep__section instarep__section--alt">
          <span className="instarep__section-num">003</span>
          <h2 className="instarep__section-title">Quick Setup</h2>
          <p className="instarep__section-subtitle">Get started in under 60 seconds.</p>

          <div className="instarep__setup">
            <div className="instarep__setup-step">
              <div className="instarep__setup-line"></div>
              <span className="instarep__setup-dot"></span>
              <span className="instarep__setup-text">Download from the App Store</span>
            </div>
            <div className="instarep__setup-step">
              <div className="instarep__setup-line"></div>
              <span className="instarep__setup-dot"></span>
              <span className="instarep__setup-text">Enable the keyboard in Settings</span>
            </div>
            <div className="instarep__setup-step">
              <span className="instarep__setup-dot"></span>
              <span className="instarep__setup-text">Start replying instantly</span>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="instarep__cta-section">
          <h2 className="instarep__cta-headline">Stop typing.<br /><span>Start creating.</span></h2>
          <p className="instarep__cta-text">Join thousands of creators who've reclaimed their time.</p>
          <a 
            href="https://apps.apple.com/us/app/instarep-ly/id6754865693" 
            target="_blank" 
            rel="noopener noreferrer"
            className="instarep__cta instarep__cta--light"
          >
            Download on App Store
          </a>
        </section>
      </main>

      <footer className="instarep__footer">
        <div className="instarep__footer-content">
          <div className="instarep__footer-brand">
            <span className="instarep__footer-logo">[instarep.ly]</span>
            <span className="instarep__footer-tagline">Instant replies for creators.</span>
          </div>
          
          <div className="instarep__footer-links">
            <div className="instarep__footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
            </div>
            <div className="instarep__footer-col">
              <h4>Legal</h4>
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
            </div>
            <div className="instarep__footer-col">
              <h4>Connect</h4>
              <a href="https://twitter.com/isolatedtech" target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href="mailto:support@isolated.tech">Contact</a>
            </div>
          </div>
        </div>
        
        <div className="instarep__footer-bottom">
          <span>© 2026 instarep.ly</span>
          <span className="instarep__footer-credit">CRAFTED BY <a href="/">isolated.tech</a></span>
        </div>
      </footer>
    </>
  );
}
