import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare-context";

interface Version {
  id: string;
  version: string;
  build_number: number;
  release_notes: string | null;
  min_os_version: string;
  created_at: string;
}

// Mock data - will be replaced with D1 queries
const APPS: Record<
  string,
  { name: string; slug: string; versions: Version[] }
> = {
  voxboard: {
    name: "Voxboard",
    slug: "voxboard",
    versions: [
      {
        id: "v3",
        version: "1.2.0",
        build_number: 42,
        release_notes: `### New Features
- Added support for multiple audio input devices
- New floating window mode for quick dictation
- Keyboard shortcuts now fully customizable

### Improvements
- 30% faster transcription startup time
- Better handling of background noise
- Improved memory usage on longer sessions

### Bug Fixes
- Fixed crash when switching audio devices during transcription
- Fixed issue where some special characters weren't being typed correctly
- Fixed window position not being remembered after restart`,
        min_os_version: "14.0",
        created_at: "2026-02-20T12:00:00Z",
      },
      {
        id: "v2",
        version: "1.1.0",
        build_number: 30,
        release_notes: `### New Features
- Real-time transcription preview
- Added support for Apple Dictation fallback
- New menu bar mode

### Improvements
- Better accuracy for technical terms
- Reduced CPU usage during idle

### Bug Fixes
- Fixed occasional duplicate text insertion
- Fixed compatibility with Sonoma`,
        min_os_version: "13.0",
        created_at: "2026-01-15T10:00:00Z",
      },
      {
        id: "v1",
        version: "1.0.0",
        build_number: 1,
        release_notes: `### Initial Release
- Local voice transcription powered by Whisper
- Works with any text field on macOS
- Privacy-focused: all processing happens on-device
- Supports multiple languages`,
        min_os_version: "13.0",
        created_at: "2026-01-01T00:00:00Z",
      },
    ],
  },
  syncmd: {
    name: "sync.md",
    slug: "syncmd",
    versions: [
      {
        id: "v2",
        version: "2.0.0",
        build_number: 20,
        release_notes: `### Major Update
- Complete UI redesign
- Added iOS companion app
- iCloud sync support

### Bug Fixes
- Fixed git merge conflicts on shared repos`,
        min_os_version: "14.0",
        created_at: "2026-02-10T09:00:00Z",
      },
      {
        id: "v1",
        version: "1.0.0",
        build_number: 1,
        release_notes: `### Initial Release
- Git-backed markdown note-taking
- Automatic commits and pushes
- Syntax highlighting`,
        min_os_version: "13.0",
        created_at: "2026-01-15T00:00:00Z",
      },
    ],
  },
  healthmd: {
    name: "health.md",
    slug: "healthmd",
    versions: [
      {
        id: "v1",
        version: "1.0.0",
        build_number: 1,
        release_notes: `### Initial Release
- Export Apple Health data to markdown
- Daily, weekly, and monthly summaries
- Charts and visualizations`,
        min_os_version: "17.0",
        created_at: "2026-02-01T00:00:00Z",
      },
    ],
  },
  imghost: {
    name: "imghost",
    slug: "imghost",
    versions: [
      {
        id: "v1",
        version: "1.0.0",
        build_number: 1,
        release_notes: `### Initial Release
- Instant image hosting from menu bar
- Drag and drop support
- Auto-copy URL to clipboard`,
        min_os_version: "13.0",
        created_at: "2026-02-10T00:00:00Z",
      },
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const app = APPS[params.slug];
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

function renderMarkdown(text: string): string {
  // Simple markdown rendering
  return text
    .split("\n")
    .map((line) => {
      if (line.startsWith("### ")) {
        return `<h4 style="font-size: 0.85rem; font-weight: 700; margin: 1.25rem 0 0.5rem; color: var(--white);">${line.slice(4)}</h4>`;
      }
      if (line.startsWith("- ")) {
        return `<li style="font-size: 0.85rem; color: #aaa; margin-left: 1rem; margin-bottom: 0.25rem;">${line.slice(2)}</li>`;
      }
      if (line.trim() === "") {
        return "";
      }
      return `<p style="font-size: 0.85rem; color: #aaa;">${line}</p>`;
    })
    .join("\n");
}

export default async function ChangelogPage({
  params,
}: {
  params: { slug: string };
}) {
  const app = APPS[params.slug];

  if (!app) {
    notFound();
  }

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
        <Link href={`/apps/${app.slug}`} className="app-page__back">
          ← BACK TO {app.name.toUpperCase()}
        </Link>

        <header style={{ marginBottom: "2rem" }}>
          <h1 className="app-page__name">
            {app.name} Changelog<span className="dot">.</span>
          </h1>
          <p style={{ color: "var(--gray)", fontSize: "0.9rem" }}>
            Version history and release notes
          </p>
        </header>

        {/* Quick nav */}
        <div
          style={{
            marginBottom: "2rem",
            padding: "1rem",
            background: "var(--gray-dark)",
            border: "var(--border)",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "var(--gray)",
            }}
          >
            VERSIONS
          </span>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
            {app.versions.map((v) => (
              <a
                key={v.id}
                href={`#${v.version}`}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                {v.version}
              </a>
            ))}
          </div>
        </div>

        {/* Versions */}
        <div style={{ maxWidth: "700px" }}>
          {app.versions.map((version, idx) => (
            <article
              key={version.id}
              id={version.version}
              style={{
                marginBottom: "2.5rem",
                paddingBottom: "2.5rem",
                borderBottom: idx < app.versions.length - 1 ? "var(--border)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: "1rem",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                  }}
                >
                  {version.version}
                  {idx === 0 && (
                    <span
                      style={{
                        marginLeft: "0.75rem",
                        fontSize: "0.6rem",
                        color: "#4ade80",
                        fontWeight: 700,
                        verticalAlign: "middle",
                      }}
                    >
                      LATEST
                    </span>
                  )}
                </h2>
                <span style={{ color: "var(--gray)", fontSize: "0.8rem" }}>
                  {formatDate(version.created_at)}
                </span>
              </div>

              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--gray)",
                  marginBottom: "1rem",
                  display: "flex",
                  gap: "1rem",
                }}
              >
                <span>Build {version.build_number}</span>
                <span>macOS {version.min_os_version}+</span>
              </div>

              {version.release_notes && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(version.release_notes),
                  }}
                />
              )}
            </article>
          ))}
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
