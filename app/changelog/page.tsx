import { Metadata } from "next";
import Link from "next/link";
import { getEnv } from "@/lib/cloudflare-context";
import { getCurrentUser } from "@/lib/auth/middleware";
import { PlatformBadge } from "@/components/ui";
import { formatDate } from "@/lib/formatting";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Ship Log — ISOLATED.TECH",
  description: "Recent updates and releases from all Isolated Tech apps.",
};

interface Update {
  id: string;
  app_id: string;
  app_name: string;
  app_slug: string;
  app_icon: string | null;
  platform: string;
  version: string;
  release_notes: string | null;
  released_at: string;
}

async function getUpdates(): Promise<Update[]> {
  const env = getEnv();
  if (!env?.DB) return [];

  try {
    const result = await env.DB.prepare(`
      SELECT 
        u.id,
        u.app_id,
        u.platform,
        u.version,
        u.release_notes,
        u.released_at,
        a.name as app_name,
        a.slug as app_slug,
        a.icon_url as app_icon
      FROM app_updates u
      JOIN apps a ON u.app_id = a.id
      WHERE a.is_published = 1
      ORDER BY u.released_at DESC
      LIMIT 50
    `).all<Update>();
    return result.results || [];
  } catch {
    return [];
  }
}

interface MonthGroup {
  key: string;
  label: string;
  updates: Update[];
}

function groupByMonth(updates: Update[]): MonthGroup[] {
  const groupMap = new Map<string, Update[]>();
  const labelMap = new Map<string, string>();

  for (const update of updates) {
    const date = new Date(update.released_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    if (!groupMap.has(key)) {
      groupMap.set(key, []);
      labelMap.set(key, label);
    }
    groupMap.get(key)!.push(update);
  }

  return Array.from(groupMap.entries()).map(([key, updates]) => ({
    key,
    label: labelMap.get(key) || key,
    updates,
  }));
}

/**
 * Strip markdown and format release notes for display
 */
function formatReleaseNotes(notes: string): string {
  return notes
    .replace(/##?\s+/g, "") // headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/^-\s+/gm, "• "); // list items
}

function UpdateEntry({ update }: { update: Update }) {
  return (
    <div className="changelog-entry">
      <Link href={`/apps/${update.app_slug}`} className="changelog-entry__app">
        <div className="changelog-entry__icon">
          {update.app_icon ? (
            <img src={update.app_icon} alt={`${update.app_name} icon`} />
          ) : (
            <span>{update.app_name[0].toUpperCase()}</span>
          )}
        </div>
        <div className="changelog-entry__info">
          <div className="changelog-entry__header">
            <span className="changelog-entry__name">{update.app_name}</span>
            <span className="changelog-entry__version">v{update.version}</span>
            <PlatformBadge platform={update.platform as "ios" | "macos"} />
          </div>
          <span className="changelog-entry__date">{formatDate(update.released_at)}</span>
        </div>
      </Link>
      {update.release_notes && (
        <div className="changelog-entry__notes">
          {formatReleaseNotes(update.release_notes)
            .split("\n")
            .filter((line) => line.trim())
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </div>
      )}
    </div>
  );
}

export default async function ChangelogPage() {
  const env = getEnv();
  const [user, updates] = await Promise.all([
    env ? getCurrentUser(env) : null,
    getUpdates(),
  ]);

  const monthGroups = groupByMonth(updates);

  return (
    <>
      <SiteNav user={user} activePage="changelog" />

      <main className="changelog-page">
        <header className="changelog-page__header">
          <h1 className="changelog-page__title">
            SHIP LOG<span className="dot">.</span>
          </h1>
          <p className="changelog-page__subtitle">
            Recent updates and releases from all apps.
          </p>
          <div className="changelog-page__feeds">
            <a href="/feed/updates.xml" className="changelog-page__feed-link">
              <span className="changelog-page__feed-icon">◉</span>
              RSS FEED
            </a>
          </div>
        </header>

        {updates.length === 0 ? (
          <div className="changelog-page__empty">
            <p>No updates yet. Check back soon!</p>
          </div>
        ) : (
          <div className="changelog-page__content">
            {monthGroups.map((group) => (
              <section key={group.key} className="changelog-month">
                <h2 className="changelog-month__header">{group.label}</h2>
                <div className="changelog-month__entries">
                  {group.updates.map((update) => (
                    <UpdateEntry key={update.id} update={update} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
