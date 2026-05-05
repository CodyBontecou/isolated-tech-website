/**
 * Unit tests for the Agentic Commerce Protocol product feed transform.
 */

import { describe, it, expect } from "vitest";
import { appRowToAcp, buildAcpFeed, type AppFeedRow } from "@/lib/acp-feed";

const baseUrl = "https://isolated.tech";

function row(overrides: Partial<AppFeedRow> = {}): AppFeedRow {
  return {
    id: "app_test_123",
    slug: "test-app",
    name: "Test App",
    tagline: "A test application",
    description: "Plain description.",
    icon_url: "/icons/test-app.png",
    screenshots: null,
    platforms: '["macos"]',
    min_price_cents: 999,
    suggested_price_cents: null,
    is_published: 1,
    updated_at: "2026-05-01T00:00:00Z",
    owner_id: null,
    owner_name: null,
    owner_email: null,
    ...overrides,
  };
}

describe("appRowToAcp", () => {
  it("maps required ACP fields from a platform-owned app", () => {
    const product = appRowToAcp(row(), baseUrl);

    expect(product.id).toBe("app_test_123");
    expect(product.title).toBe("Test App");
    expect(product.link).toBe("https://isolated.tech/apps/test-app");
    expect(product.image_link).toBe("https://isolated.tech/icons/test-app.png");
    expect(product.availability).toBe("in_stock");
    expect(product.price).toBe("9.99 USD");
    expect(product.brand).toBe("isolated.tech");
    expect(product.condition).toBe("new");
    expect(product.sale_price).toBeUndefined();
  });

  it("marks unpublished apps out_of_stock", () => {
    const product = appRowToAcp(row({ is_published: 0 }), baseUrl);
    expect(product.availability).toBe("out_of_stock");
  });

  it("uses suggested price as price and min as sale_price for PWYW", () => {
    const product = appRowToAcp(
      row({ min_price_cents: 500, suggested_price_cents: 900 }),
      baseUrl
    );
    expect(product.price).toBe("9.00 USD");
    expect(product.sale_price).toBe("5.00 USD");
  });

  it("ignores suggested price when not greater than min", () => {
    const product = appRowToAcp(
      row({ min_price_cents: 900, suggested_price_cents: 900 }),
      baseUrl
    );
    expect(product.price).toBe("9.00 USD");
    expect(product.sale_price).toBeUndefined();
  });

  it("brands seller-owned apps with the seller name", () => {
    const product = appRowToAcp(
      row({
        owner_id: "user_seller_1",
        owner_name: "Cody Bontecou",
        owner_email: "cody@example.com",
      }),
      baseUrl
    );
    expect(product.brand).toBe("Cody Bontecou");
  });

  it("falls back to email local-part when seller has no name", () => {
    const product = appRowToAcp(
      row({
        owner_id: "user_seller_1",
        owner_name: null,
        owner_email: "indie@example.com",
      }),
      baseUrl
    );
    expect(product.brand).toBe("indie");
  });

  it("strips markdown from description and combines with tagline", () => {
    const product = appRowToAcp(
      row({
        tagline: "Tagline goes here.",
        description: "# Heading\n\nSome **bold** with [a link](https://example.com).",
      }),
      baseUrl
    );
    expect(product.description).toContain("Tagline goes here.");
    expect(product.description).toContain("Heading Some bold with a link.");
    expect(product.description).not.toContain("**");
    expect(product.description).not.toContain("](");
  });

  it("absolutizes screenshot URLs", () => {
    const product = appRowToAcp(
      row({
        screenshots: JSON.stringify([
          "/shots/a.png",
          "https://cdn.example.com/b.png",
        ]),
      }),
      baseUrl
    );
    expect(product.additional_image_link).toEqual([
      "https://isolated.tech/shots/a.png",
      "https://cdn.example.com/b.png",
    ]);
  });

  it("exposes the agent checkout endpoint and SPT contract", () => {
    const product = appRowToAcp(row(), baseUrl);
    expect(product.x_isolated.checkout.endpoint).toBe(
      "https://isolated.tech/api/checkout/agent"
    );
    expect(product.x_isolated.checkout.method).toBe("POST");
    expect(product.x_isolated.checkout.protocol).toBe(
      "stripe.shared_payment_token"
    );
    expect(product.x_isolated.app_slug).toBe("test-app");
    expect(product.x_isolated.platforms).toEqual(["macos"]);
  });

  it("survives malformed JSON in screenshots/platforms", () => {
    const product = appRowToAcp(
      row({ screenshots: "not json", platforms: "{}" }),
      baseUrl
    );
    expect(product.additional_image_link).toBeUndefined();
    expect(product.x_isolated.platforms).toEqual([]);
  });

  it("handles a missing icon", () => {
    const product = appRowToAcp(row({ icon_url: null }), baseUrl);
    expect(product.image_link).toBeNull();
  });
});

describe("buildAcpFeed", () => {
  it("wraps products with merchant + version metadata", () => {
    const feed = buildAcpFeed([row(), row({ id: "app_2", slug: "two" })], baseUrl);

    expect(feed.feed_version).toBe("2026-04-17");
    expect(feed.merchant).toEqual({ name: "isolated.tech", url: baseUrl });
    expect(feed.products).toHaveLength(2);
    expect(feed.products[1].id).toBe("app_2");
    expect(typeof feed.generated_at).toBe("string");
  });

  it("returns an empty product list when there are no apps", () => {
    const feed = buildAcpFeed([], baseUrl);
    expect(feed.products).toEqual([]);
  });
});
