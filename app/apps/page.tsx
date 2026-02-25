import { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare-context";

export const metadata: Metadata = {
  title: "Apps — ISOLATED.TECH",
  description:
    "iOS and macOS apps by Isolated Tech. Privacy-first, on-device processing, brutalist design.",
};

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
}

// For now, use static data until we wire up D1 access in server components
// TODO: Fetch from D1 when env bindings are available in RSC
const APPS: App[] = [
  {
    id: "app_voxboard_001",
    slug: "voxboard",
    name: "Voxboard",
    tagline: "Your voice. Your keyboard.",
    description:
      "On-device voice transcription that works in any text field. Private. No cloud. No network required.",
    icon_url: "/apps/voxboard/icon.png",
    platforms: '["ios"]',
    min_price_cents: 0,
    suggested_price_cents: 500,
  },
  {
    id: "app_syncmd_001",
    slug: "syncmd",
    name: "sync.md",
    tagline: "Git on your iPhone.",
    description:
      "Real Git on your iPhone. Clone, pull, commit & push any repo. No terminal, no keys layer, no lock-in.",
    icon_url: "/apps/syncmd/icon.png",
    platforms: '["ios"]',
    min_price_cents: 0,
    suggested_price_cents: 800,
  },
  {
    id: "app_healthmd_001",
    slug: "healthmd",
    name: "health.md",
    tagline: "Apple Health → Markdown",
    description:
      "Export your Apple Health data directly to Markdown files in your iOS file system. On-device. Private. Automated.",
    icon_url: "/apps/healthmd/icon.png",
    platforms: '["ios"]',
    min_price_cents: 0,
    suggested_price_cents: 500,
  },
  {
    id: "app_imghost_001",
    slug: "imghost",
    name: "imghost",
    tagline: "Upload. Share. Done.",
    description:
      "Brutal image hosting for iOS. No fluff, no friction. Share images and get instant, direct links.",
    icon_url: "/apps/imghost/icon.png",
    platforms: '["ios"]',
    min_price_cents: 0,
    suggested_price_cents: 0,
  },
];

function formatPrice(minCents: number, suggestedCents: number | null): string {
  if (minCents === 0 && (!suggestedCents || suggestedCents === 0)) {
    return "Free";
  }
  if (minCents === 0) {
    return "Name your price";
  }
  return `From $${(minCents / 100).toFixed(2)}`;
}

function getPlatforms(platformsJson: string): string[] {
  try {
    return JSON.parse(platformsJson);
  } catch {
    return [];
  }
}

function AppCard({ app }: { app: App }) {
  const platforms = getPlatforms(app.platforms);
  const isFree = app.min_price_cents === 0 && (!app.suggested_price_cents || app.suggested_price_cents === 0);
  const price = formatPrice(app.min_price_cents, app.suggested_price_cents);

  return (
    <Link href={`/apps/${app.slug}`} className="app-card">
      <div className="app-card__header">
        <div className="app-card__icon">
          {app.icon_url ? (
            <img src={app.icon_url} alt={`${app.name} icon`} />
          ) : (
            app.name[0].toUpperCase()
          )}
        </div>
        <div className="app-card__info">
          <h3 className="app-card__name">{app.name}</h3>
          {app.tagline && <p className="app-card__tagline">{app.tagline}</p>}
        </div>
      </div>

      <div className="app-card__badges">
        {platforms.map((p) => (
          <span
            key={p}
            className={`badge ${p === "ios" ? "badge--ios" : "badge--web"}`}
          >
            {p === "ios" ? "iOS" : p.toUpperCase()}
          </span>
        ))}
      </div>

      {app.description && (
        <p className="app-card__description">{app.description}</p>
      )}

      <div className="app-card__footer">
        <span className={`app-card__price ${isFree ? "app-card__price--free" : "app-card__price--paid"}`}>
          {price}
        </span>
        <span className="app-card__arrow">↗</span>
      </div>
    </Link>
  );
}

export default async function AppsPage() {
  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  return (
    <>
      <nav className="nav">
        <Link href="/" className="nav__logo">
          ISOLATED<span className="dot">.</span>TECH
        </Link>
        <div className="nav__links">
          <Link href="/apps">APPS</Link>
          <Link href="/#about">ABOUT</Link>
          {user ? (
            <>
              <Link href="/dashboard">DASHBOARD</Link>
              <Link href="/api/auth/logout">SIGN OUT</Link>
            </>
          ) : (
            <Link href="/auth/login">SIGN IN</Link>
          )}
        </div>
      </nav>

      <header className="store-header">
        <h1 className="store-header__title">
          Apps<span className="dot">.</span>
        </h1>
        <p className="store-header__subtitle">
          iOS apps built with privacy in mind. On-device processing, no cloud
          dependencies, brutalist design. Pay what you want.
        </p>
      </header>

      {APPS.length === 0 ? (
        <div className="empty-state">
          <h2 className="empty-state__title">No apps yet</h2>
          <p className="empty-state__text">
            Check back soon for new releases.
          </p>
        </div>
      ) : (
        <div className="app-grid">
          {APPS.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}

      <footer className="footer">
        <div className="footer__left">
          <span>© 2026 ISOLATED.TECH</span>
        </div>
        <div className="footer__right" />
      </footer>
    </>
  );
}
