import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PurchaseCard } from "./purchase-card";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare-context";

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

// Static data for now - will be replaced with D1 query
const APPS: Record<string, App> = {
  voxboard: {
    id: "app_voxboard_001",
    slug: "voxboard",
    name: "Voxboard",
    tagline: "Your voice. Your keyboard.",
    description: `On-device voice transcription that works in any text field. Private. No cloud. No network required.

## Features

- **On-Device Processing** — All transcription happens locally using Apple's Speech Recognition
- **Works Everywhere** — Use in any app with a text field via the custom keyboard
- **Privacy First** — No data leaves your device. Ever.
- **No Internet Required** — Works completely offline
- **Multiple Languages** — Supports all languages available in iOS Speech Recognition

## How It Works

1. Install Voxboard from the App Store
2. Enable the keyboard in Settings → General → Keyboard → Keyboards
3. Switch to Voxboard in any text field
4. Tap the microphone and speak

Your voice is transcribed instantly, right on your device.`,
    icon_url: "/apps/voxboard/icon.png",
    platforms: '["ios"]',
    min_price_cents: 0,
    suggested_price_cents: 500,
  },
  syncmd: {
    id: "app_syncmd_001",
    slug: "syncmd",
    name: "sync.md",
    tagline: "Git on your iPhone.",
    description: `Real Git on your iPhone. Clone, pull, commit & push any repo. No terminal, no keys layer, no lock-in.

## Features

- **Full Git Support** — Clone, pull, commit, push, branch, merge
- **GitHub & GitLab Integration** — Connect your accounts seamlessly
- **Markdown Editor** — Built-in editor for your notes and docs
- **Offline First** — Work on your repos without internet
- **iCloud Sync** — Your repos are backed up automatically

## Perfect For

- Developers who want to review code on the go
- Writers using Git-based publishing workflows
- Anyone who needs their repos accessible on mobile`,
    icon_url: "/apps/syncmd/icon.png",
    platforms: '["ios"]',
    min_price_cents: 0,
    suggested_price_cents: 800,
  },
  healthmd: {
    id: "app_healthmd_001",
    slug: "healthmd",
    name: "health.md",
    tagline: "Apple Health → Markdown",
    description: `Export your Apple Health data directly to Markdown files in your iOS file system. On-device. Private. Automated.

## Features

- **Automated Exports** — Schedule daily, weekly, or monthly exports
- **Markdown Format** — Perfect for Obsidian, Notion, or any markdown app
- **Privacy First** — All processing happens on your device
- **Customizable** — Choose which health metrics to export
- **Files App Integration** — Export directly to iCloud, Dropbox, or local storage

## Supported Data

- Steps & Distance
- Heart Rate & HRV
- Sleep Analysis
- Workouts
- Weight & Body Measurements
- And more...`,
    icon_url: "/apps/healthmd/icon.png",
    platforms: '["ios"]',
    min_price_cents: 0,
    suggested_price_cents: 500,
  },
  imghost: {
    id: "app_imghost_001",
    slug: "imghost",
    name: "imghost",
    tagline: "Upload. Share. Done.",
    description: `Brutal image hosting for iOS. No fluff, no friction. Share images and get instant, direct links.

## Features

- **Instant Upload** — Share any image from your camera roll
- **Direct Links** — Get a direct link to your image, not a landing page
- **Share Sheet Integration** — Upload from any app
- **No Account Required** — Just upload and share
- **Fast CDN** — Images served from a global edge network

## How It Works

1. Select an image from your camera roll or capture one
2. Tap upload
3. Get a direct link to share anywhere

No watermarks. No compression. No bullshit.`,
    icon_url: "/apps/imghost/icon.png",
    platforms: '["ios"]',
    min_price_cents: 0,
    suggested_price_cents: 0,
  },
};

function getApp(slug: string): App | undefined {
  return APPS[slug];
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const app = getApp(params.slug);

  if (!app) {
    return { title: "App Not Found" };
  }

  const description = app.tagline || app.description?.slice(0, 160) || "";
  const siteUrl = "https://isolated.tech";
  const appUrl = `${siteUrl}/apps/${app.slug}`;

  return {
    title: app.name,
    description,
    openGraph: {
      type: "website",
      url: appUrl,
      title: `${app.name} — ISOLATED.TECH`,
      description,
      images: app.icon_url ? [{ url: app.icon_url, width: 256, height: 256, alt: app.name }] : [],
    },
    twitter: {
      card: "summary",
      title: `${app.name} — ISOLATED.TECH`,
      description,
      images: app.icon_url ? [app.icon_url] : [],
    },
    alternates: {
      canonical: appUrl,
    },
  };
}

function getPlatforms(platformsJson: string): string[] {
  try {
    return JSON.parse(platformsJson);
  } catch {
    return [];
  }
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown-to-HTML conversion
  const html = content
    .split("\n\n")
    .map((block) => {
      if (block.startsWith("## ")) {
        return `<h2>${block.slice(3)}</h2>`;
      }
      if (block.startsWith("- ")) {
        const items = block
          .split("\n")
          .map((line) => {
            if (line.startsWith("- ")) {
              const text = line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
              return `<li>${text}</li>`;
            }
            return "";
          })
          .join("");
        return `<ul>${items}</ul>`;
      }
      if (block.match(/^\d\./)) {
        const items = block
          .split("\n")
          .map((line) => {
            const match = line.match(/^\d\.\s*(.+)/);
            if (match) {
              return `<li>${match[1]}</li>`;
            }
            return "";
          })
          .join("");
        return `<ol>${items}</ol>`;
      }
      return `<p>${block.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("");

  return (
    <div
      className="app-page__description"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default async function AppPage({ params }: { params: { slug: string } }) {
  const app = getApp(params.slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const user = env ? await getCurrentUser(env) : null;

  const platforms = getPlatforms(app.platforms);
  const isFree = app.min_price_cents === 0 && (!app.suggested_price_cents || app.suggested_price_cents === 0);

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

      <main className="app-page">
        <Link href="/apps" className="app-page__back">
          ← ALL APPS
        </Link>

        <header className="app-page__header">
          <div className="app-page__icon">
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
                  {p === "ios" ? "iOS" : p.toUpperCase()}
                </span>
              ))}
            </div>
            <h1 className="app-page__name">{app.name}</h1>
            {app.tagline && <p className="app-page__tagline">{app.tagline}</p>}
          </div>
        </header>

        <div className="app-page__content">
          {app.description && <MarkdownContent content={app.description} />}

          <aside>
            <PurchaseCard
              appId={app.id}
              appName={app.name}
              minPriceCents={app.min_price_cents}
              suggestedPriceCents={app.suggested_price_cents}
              isFree={isFree}
              isAuthenticated={!!user}
            />
          </aside>
        </div>
      </main>

      <footer className="footer">
        <div className="footer__left">
          <span>© 2026 ISOLATED.TECH</span>
        </div>
        <div className="footer__right" />
      </footer>
    </>
  );
}
