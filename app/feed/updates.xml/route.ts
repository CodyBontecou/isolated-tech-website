import { getEnv } from "@/lib/cloudflare-context";

const SITE_URL = "https://isolated.tech";

interface AppUpdate {
  id: string;
  app_id: string;
  app_name: string;
  app_slug: string;
  platform: string;
  version: string;
  release_notes: string | null;
  released_at: string;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Convert date string to RFC 822 format for RSS
 */
function toRFC822(dateStr: string): string {
  return new Date(dateStr).toUTCString();
}

/**
 * Strip markdown formatting from release notes
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/##?\s+/g, "") // headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // links
    .replace(/^-\s+/gm, "• "); // list items
}

/**
 * Get platform label
 */
function getPlatformLabel(platform: string): string {
  return platform === "ios" ? "iOS" : platform === "macos" ? "macOS" : platform.toUpperCase();
}

export async function GET() {
  const env = getEnv();

  if (!env?.DB) {
    return new Response("Database not available", { status: 500 });
  }

  // Query recent updates with app info
  const result = await env.DB.prepare(`
    SELECT 
      u.id,
      u.app_id,
      a.name as app_name,
      a.slug as app_slug,
      u.platform,
      u.version,
      u.release_notes,
      u.released_at
    FROM app_updates u
    JOIN apps a ON u.app_id = a.id
    WHERE a.is_published = 1
    ORDER BY u.released_at DESC
    LIMIT 30
  `).all<AppUpdate>();

  const updates = result.results || [];

  // Build RSS items
  const items = updates
    .map((update) => {
      const title = `${update.app_name} v${update.version} (${getPlatformLabel(update.platform)})`;
      const link = `${SITE_URL}/apps/${update.app_slug}/changelog`;
      const description = update.release_notes
        ? stripMarkdown(update.release_notes).slice(0, 500)
        : `Version ${update.version} released for ${getPlatformLabel(update.platform)}`;

      return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <description>${escapeXml(description)}</description>
      <pubDate>${toRFC822(update.released_at)}</pubDate>
      <guid isPermaLink="false">update-${update.id}</guid>
      <category>${getPlatformLabel(update.platform)}</category>
    </item>`;
    })
    .join("");

  // Build RSS feed
  const lastBuildDate =
    updates.length > 0
      ? toRFC822(updates[0].released_at)
      : toRFC822(new Date().toISOString());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ISOLATED.TECH Updates</title>
    <link>${SITE_URL}</link>
    <description>App updates and releases from Isolated Tech</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed/updates.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
