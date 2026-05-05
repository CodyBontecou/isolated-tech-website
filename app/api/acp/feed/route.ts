/**
 * GET /api/acp/feed
 *
 * Public Agentic Commerce Protocol product feed. Lets AI agents (ChatGPT,
 * Claude, etc.) discover apps sold on isolated.tech and learn how to pay
 * for them via Shared Payment Tokens.
 *
 * No auth — this is the equivalent of robots-readable inventory.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getBaseUrl } from "@/lib/stripe";
import { buildAcpFeed, type AppFeedRow } from "@/lib/acp-feed";

export async function GET(request: NextRequest) {
  const env = getEnv();
  if (!env?.DB) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const rows = await env.DB.prepare(
    `SELECT
       a.id, a.slug, a.name, a.tagline, a.description, a.icon_url,
       a.screenshots, a.platforms, a.min_price_cents, a.suggested_price_cents,
       a.is_published, a.updated_at, a.owner_id,
       u.name AS owner_name, u.email AS owner_email
     FROM apps a
     LEFT JOIN user u ON u.id = a.owner_id
     WHERE a.is_published = 1
     ORDER BY a.updated_at DESC NULLS LAST`
  ).all<AppFeedRow>();

  const baseUrl = getBaseUrl(request);
  const feed = buildAcpFeed(rows.results, baseUrl);

  // Weak ETag from latest update timestamp + product count, so agents can
  // poll cheaply.
  const latest = rows.results[0]?.updated_at ?? "0";
  const etag = `W/"acp-${rows.results.length}-${latest}"`;

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return NextResponse.json(feed, {
    headers: {
      ETag: etag,
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
