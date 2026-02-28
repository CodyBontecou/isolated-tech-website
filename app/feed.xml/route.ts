import { getEnv } from "@/lib/cloudflare-context";

const SITE_URL = "https://isolated.tech";

interface App {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  created_at: string;
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
 * Strip markdown formatting from description
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

export async function GET() {
  const env = getEnv();

  if (!env?.DB) {
    return new Response("Database not available", { status: 500 });
  }

  // Query published apps ordered by creation date
  const result = await env.DB.prepare(`
    SELECT slug, name, tagline, description, icon_url, created_at
    FROM apps
    WHERE is_published = 1
    ORDER BY created_at DESC
    LIMIT 20
  `).all<App>();

  const apps = result.results || [];

  // Build RSS items
  const items = apps
    .map((app) => {
      const description =
        app.tagline ||
        (app.description ? stripMarkdown(app.description).slice(0, 200) : "");
      const link = `${SITE_URL}/apps/${app.slug}`;

      return `
    <item>
      <title>${escapeXml(app.name)}</title>
      <link>${link}</link>
      <description>${escapeXml(description)}</description>
      <pubDate>${toRFC822(app.created_at)}</pubDate>
      <guid isPermaLink="true">${link}</guid>${
        app.icon_url
          ? `
      <enclosure url="${escapeXml(app.icon_url)}" type="image/png" length="0" />`
          : ""
      }
    </item>`;
    })
    .join("");

  // Build RSS feed
  const lastBuildDate =
    apps.length > 0 ? toRFC822(apps[0].created_at) : toRFC822(new Date().toISOString());

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ISOLATED.TECH Apps</title>
    <link>${SITE_URL}</link>
    <description>New apps from Isolated Tech — privacy-first iOS and macOS software</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
