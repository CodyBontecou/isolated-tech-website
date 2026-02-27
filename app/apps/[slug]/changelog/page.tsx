import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/middleware";
import { getEnv } from "@/lib/cloudflare-context";
import { queries, queryOne } from "@/lib/db";
import { SignOutButton } from "@/components/sign-out-button";

interface App {
  id: string;
  slug: string;
  name: string;
  platforms: string;
}

interface AppUpdate {
  id: string;
  app_id: string;
  platform: string;
  version: string;
  build_number: number | null;
  release_notes: string | null;
  released_at: string;
  created_at: string;
}

async function getApp(slug: string): Promise<App | null> {
  const env = getEnv();
  if (!env?.DB) return null;

  return queryOne<App>(
    `SELECT id, slug, name, platforms FROM apps WHERE slug = ? AND is_published = 1`,
    [slug],
    env
  );
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const app = await getApp(params.slug);
  if (!app) return { title: "Not Found" };

  return {
    title: `Changelog — ${app.name} — ISOLATED.TECH`,
    description: `Version history and release notes for ${app.name}`,
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatInline(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderMarkdown(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) {
        return `<h4 class="changelog__heading">${formatInline(line.slice(4))}</h4>`;
      }
      if (line.startsWith("- ")) {
        return `<li class="changelog__item">${formatInline(line.slice(2))}</li>`;
      }
      if (line.trim() === "") {
        return "";
      }
      return `<p class="changelog__text">${formatInline(line)}</p>`;
    })
    .join("\n");
}

function getPlatforms(platformsJson: string): string[] {
  try {
    return JSON.parse(platformsJson);
  } catch {
    return [];
  }
}

export default async function ChangelogPage({
  params,
}: {
  params: { slug: string };
}) {
  const app = await getApp(params.slug);

  if (!app) {
    notFound();
  }

  const env = getEnv();
  const [user, updates] = await Promise.all([
    env ? getCurrentUser(env) : null,
    queries.getAppUpdates(app.id, env || undefined),
  ]);

  const platforms = getPlatforms(app.platforms);
  const hasBothPlatforms = platforms.includes("macos") && platforms.includes("ios");

  // Group updates by platform if the app supports both
  const macosUpdates = updates.filter((u: AppUpdate) => u.platform === "macos");
  const iosUpdates = updates.filter((u: AppUpdate) => u.platform === "ios");

  return (
    <>
      <nav className="nav">
        {/* Use <a> tags to force full page navigation - vinext RSC fetch doesn't include credentials */}
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
            <a href="/auth/login">SIGN IN</a>
          )}
        </div>
      </nav>

      <main className="app-page">
        <a href={`/apps/${app.slug}`} className="app-page__back">
          ← BACK TO {app.name.toUpperCase()}
        </a>

        <header style={{ marginBottom: "2rem" }}>
          <h1 className="app-page__name">
            {app.name} Changelog<span className="dot">.</span>
          </h1>
          <p style={{ color: "var(--gray)", fontSize: "0.9rem" }}>
            Version history and release notes
          </p>
        </header>

        {updates.length === 0 ? (
          <div className="changelog-empty">
            <p className="changelog-empty__text">No releases yet.</p>
          </div>
        ) : (
          <>
            {/* Versions */}
            <div className="changelog-versions">
              {hasBothPlatforms ? (
                <>
                  {macosUpdates.length > 0 && (
                    <VersionSection
                      label="macOS"
                      updates={macosUpdates}
                      showPlatform={false}
                    />
                  )}
                  {iosUpdates.length > 0 && (
                    <VersionSection
                      label="iOS"
                      updates={iosUpdates}
                      showPlatform={false}
                    />
                  )}
                </>
              ) : (
                <VersionSection
                  updates={updates}
                  showPlatform={false}
                />
              )}
            </div>
          </>
        )}
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

function VersionSection({
  label,
  updates,
  showPlatform,
}: {
  label?: string;
  updates: AppUpdate[];
  showPlatform: boolean;
}) {
  return (
    <section className="changelog-section">
      {label && (
        <h2 className="changelog-section__label">{label}</h2>
      )}

      {updates.map((update, idx) => (
        <article
          key={update.id}
          id={`${update.platform}-${update.version}`}
          className={`changelog-entry ${idx < updates.length - 1 ? "changelog-entry--bordered" : ""}`}
        >
          <div className="changelog-entry__header">
            <h3 className="changelog-entry__version">
              {update.version}
              {idx === 0 && (
                <span className="changelog-entry__latest">LATEST</span>
              )}
            </h3>
            <span className="changelog-entry__date">
              {formatDate(update.released_at)}
            </span>
          </div>

          <div className="changelog-entry__meta">
            {update.build_number && <span>Build {update.build_number}</span>}
            {showPlatform && (
              <span>{update.platform === "ios" ? "iOS" : "macOS"}</span>
            )}
          </div>

          {update.release_notes && (
            <div
              className="changelog-entry__notes"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(update.release_notes),
              }}
            />
          )}
        </article>
      ))}
    </section>
  );
}
