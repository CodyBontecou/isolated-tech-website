/**
 * Agentic Commerce Protocol (ACP) product feed.
 *
 * Exposes isolated.tech's published apps in the field shape AI agents expect
 * (Stripe / OpenAI / Meta's catalog spec). Field reference:
 *   https://docs.stripe.com/agentic-commerce/product-feed
 *
 * Notes:
 * - Stripe's hosted ingestion is CSV-pushed-to-Catalog-API. This module
 *   produces the same fields in JSON so agents can consume our feed
 *   directly without a Stripe-hosted intermediary.
 * - We add a non-standard `x_isolated` block exposing the agent checkout
 *   endpoint and the SPT-acceptance contract; standards-compliant agents
 *   ignore unknown fields.
 */

export type AcpAvailability =
  | "in_stock"
  | "out_of_stock"
  | "preorder"
  | "backorder";

export type AcpCondition = "new" | "refurbished" | "used";

export interface AcpProduct {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string | null;
  additional_image_link?: string[];
  availability: AcpAvailability;
  /** "<amount> <ISO 4217>" e.g. "12.99 USD" */
  price: string;
  sale_price?: string;
  brand: string;
  condition: AcpCondition;
  /** ISO 8601. */
  updated_at: string;
  /** Custom: how an agent actually pays for this product. */
  x_isolated: {
    app_slug: string;
    min_price_cents: number;
    suggested_price_cents: number | null;
    platforms: string[];
    checkout: {
      endpoint: string;
      method: "POST";
      protocol: "stripe.shared_payment_token";
      body_schema: {
        appId: "string";
        sharedPaymentToken: "string (spt_…)";
        priceCents: "integer >= min_price_cents";
        discountCode: "string (optional)";
      };
    };
  };
}

export interface AcpFeed {
  /** Spec we're targeting; bump when fields change. */
  feed_version: "2026-04-17";
  generated_at: string;
  merchant: {
    name: string;
    url: string;
  };
  products: AcpProduct[];
}

export interface AppFeedRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
  screenshots: string | null;
  platforms: string | null;
  min_price_cents: number;
  suggested_price_cents: number | null;
  is_published: number;
  updated_at: string | null;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
}

const PLATFORM_BRAND = "isolated.tech";

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\n+/g, " ")
    .trim();
}

function buildDescription(row: AppFeedRow): string {
  const parts: string[] = [];
  if (row.tagline) parts.push(row.tagline);
  if (row.description) {
    const plain = stripMarkdown(row.description);
    if (plain) parts.push(plain.length > 4000 ? `${plain.slice(0, 3997)}...` : plain);
  }
  return parts.join("\n\n") || row.name;
}

function priceString(cents: number): string {
  return `${(cents / 100).toFixed(2)} USD`;
}

function absolutize(baseUrl: string, path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}

function parseScreenshots(raw: string | null, baseUrl: string): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((u) => (typeof u === "string" ? absolutize(baseUrl, u) : null))
      .filter((u): u is string => Boolean(u));
  } catch {
    return [];
  }
}

function parsePlatforms(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

export function appRowToAcp(row: AppFeedRow, baseUrl: string): AcpProduct {
  const link = `${baseUrl}/apps/${row.slug}`;
  const screenshots = parseScreenshots(row.screenshots, baseUrl);
  const platforms = parsePlatforms(row.platforms);

  // Sellers brand as themselves; platform-owned apps brand as isolated.tech.
  const brand = row.owner_id
    ? row.owner_name?.trim() || row.owner_email?.split("@")[0] || PLATFORM_BRAND
    : PLATFORM_BRAND;

  // ACP sale_price applies when suggested > min (pay-what-you-want floor).
  const hasSuggested =
    row.suggested_price_cents != null &&
    row.suggested_price_cents > row.min_price_cents;

  return {
    id: row.id,
    title: row.name,
    description: buildDescription(row),
    link,
    image_link: absolutize(baseUrl, row.icon_url),
    additional_image_link: screenshots.length ? screenshots : undefined,
    availability: row.is_published ? "in_stock" : "out_of_stock",
    price: hasSuggested
      ? priceString(row.suggested_price_cents!)
      : priceString(row.min_price_cents),
    sale_price: hasSuggested ? priceString(row.min_price_cents) : undefined,
    brand,
    condition: "new",
    updated_at:
      row.updated_at ?? new Date().toISOString(),
    x_isolated: {
      app_slug: row.slug,
      min_price_cents: row.min_price_cents,
      suggested_price_cents: row.suggested_price_cents,
      platforms,
      checkout: {
        endpoint: `${baseUrl}/api/checkout/agent`,
        method: "POST",
        protocol: "stripe.shared_payment_token",
        body_schema: {
          appId: "string",
          sharedPaymentToken: "string (spt_…)",
          priceCents: "integer >= min_price_cents",
          discountCode: "string (optional)",
        },
      },
    },
  };
}

export function buildAcpFeed(
  rows: AppFeedRow[],
  baseUrl: string
): AcpFeed {
  return {
    feed_version: "2026-04-17",
    generated_at: new Date().toISOString(),
    merchant: {
      name: PLATFORM_BRAND,
      url: baseUrl,
    },
    products: rows.map((r) => appRowToAcp(r, baseUrl)),
  };
}
