/**
 * Integration tests for checkout flow
 * Tests the complete checkout process including:
 * - Authenticated vs unauthenticated requests
 * - Paid vs free apps
 * - Discount code application
 * - Duplicate purchase prevention
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockEnv, createMockD1 } from "../mocks/cloudflare";
import { createMockStripe, createFailingStripe } from "../mocks/stripe";
import { createMockUser } from "../mocks/auth";
import * as fixtures from "../fixtures";

// Mock the dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  createStripeClient: vi.fn(),
  getBaseUrl: vi.fn(() => "https://isolated.tech"),
}));

vi.mock("@/lib/auth/middleware", () => ({
  getSessionFromHeaders: vi.fn(),
}));

describe("POST /api/checkout", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;
  let mockStripe: ReturnType<typeof createMockStripe>;

  beforeEach(() => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
    mockStripe = createMockStripe();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({ user: null, session: null });

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: "app_123", priceCents: 999 }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Please sign in to purchase");
    });
  });

  describe("Validation", () => {
    it("should return 400 if appId is missing", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: createMockUser(),
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceCents: 999 }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("App ID required");
    });

    it("should return 404 if app does not exist", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: createMockUser(),
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: "nonexistent_app", priceCents: 999 }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("App not found");
    });
  });

  describe("Duplicate Purchase Prevention", () => {
    it("should return 400 if user already owns the app", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Use user who already has a purchase
      const user = { ...fixtures.testUser, isAdmin: false };

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: fixtures.testApp.id, priceCents: 999 }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("You already own this app");
    });
  });

  describe("Free App Purchase", () => {
    it("should create purchase directly for free apps", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // New user without existing purchase
      const newUser = createMockUser({ id: "new_user_123" });

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: fixtures.freeApp.id, priceCents: 0 }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.free).toBe(true);
      expect(data.redirectUrl).toContain("/dashboard?purchased=");
    });
  });

  describe("Discount Codes", () => {
    it("should apply percent discount correctly", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      const newUser = createMockUser({ id: "new_user_456" });

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: fixtures.testApp.id,
          priceCents: 1000,
          discountCode: "SAVE50",
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Should create Stripe session with discounted price
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify Stripe was called with 50% discount (1000 -> 500)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 500, // 50% of 1000
              }),
            }),
          ]),
          metadata: expect.objectContaining({
            discount_code_id: fixtures.percentDiscountCode.id,
          }),
        })
      );
    });

    it("should apply fixed discount correctly", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      const newUser = createMockUser({ id: "new_user_fixed" });

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: fixtures.testApp.id, // TAKE5 code is app-specific
          priceCents: 1000,
          discountCode: "TAKE5",
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Should create Stripe session with $5.00 discount (1000 - 500 = 500)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify Stripe was called with fixed discount
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 500, // 1000 - 500 ($5.00 off)
              }),
            }),
          ]),
        })
      );
    });

    it("should ignore invalid discount code (wrong app_id)", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create a second paid app to test wrong app_id scenario
      const secondPaidApp = {
        ...fixtures.testApp,
        id: "app_second_paid",
        slug: "second-paid-app",
        name: "Second Paid App",
        min_price_cents: 500,
      };

      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser]],
            ["apps", [fixtures.testApp, secondPaidApp]],
            ["purchases", []],
            ["discount_codes", [fixtures.fixedDiscountCode]], // TAKE5 is for testApp only
          ]),
        },
      });

      const newUser = createMockUser({ id: "new_user_wrong_app" });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      // Try to use TAKE5 code (which is testApp-specific) on secondPaidApp
      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: "app_second_paid", // Wrong app - TAKE5 is for testApp only
          priceCents: 1000,
          discountCode: "TAKE5",
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify Stripe was called with full price (discount code ignored)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 1000, // Full price, discount not applied
              }),
            }),
          ]),
          metadata: expect.objectContaining({
            discount_code_id: "", // No discount code applied
          }),
        })
      );
    });

    it("should ignore expired discount code", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      const newUser = createMockUser({ id: "new_user_expired" });

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: fixtures.testApp.id,
          priceCents: 1000,
          discountCode: "EXPIRED",
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Should succeed but with full price (expired code ignored)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify Stripe was called with full price (no discount)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 1000, // Full price, no discount
              }),
            }),
          ]),
          metadata: expect.objectContaining({
            discount_code_id: "", // No discount code applied
          }),
        })
      );
    });

    it("should ignore maxed out discount code (times_used >= max_uses)", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      const newUser = createMockUser({ id: "new_user_maxed" });

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: fixtures.testApp.id,
          priceCents: 1000,
          discountCode: "MAXED",
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Should succeed but with full price (maxed code ignored)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify Stripe was called with full price (no discount)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 1000, // Full price, no discount
              }),
            }),
          ]),
          metadata: expect.objectContaining({
            discount_code_id: "", // No discount code applied
          }),
        })
      );
    });

    it("should handle discount code that brings price to 0 (free purchase)", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create fresh env with 100% discount code
      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser, fixtures.adminUser]],
            ["apps", [fixtures.testApp, fixtures.freeApp]],
            ["purchases", []],
            ["discount_codes", [{
              id: "code_100_percent",
              code: "FREE100",
              discount_type: "percent",
              discount_value: 100, // 100% off
              app_id: null,
              max_uses: 100,
              times_used: 0,
              expires_at: null,
              is_active: 1,
              created_at: new Date("2024-01-01").toISOString(),
            }]],
            ["email_log", []],
          ]),
        },
      });

      const newUser = createMockUser({ id: "new_user_free100" });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: fixtures.testApp.id,
          priceCents: 999,
          discountCode: "FREE100",
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Should be a free purchase (price = 0 after discount)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.free).toBe(true);
      expect(data.redirectUrl).toContain("/dashboard?purchased=");
      
      // Stripe should NOT be called for free purchases
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });

  describe("Stripe Session Creation", () => {
    it("should create Stripe checkout session for paid apps", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      const newUser = createMockUser({ id: "new_user_789" });

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: fixtures.testApp.id,
          priceCents: 999,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.url).toBeDefined();
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
          customer_email: newUser.email,
          metadata: expect.objectContaining({
            app_id: fixtures.testApp.id,
            user_id: newUser.id,
          }),
        })
      );
    });

    it("should return 503 if Stripe is not configured", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      const newUser = createMockUser({ id: "new_user_no_stripe" });

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(null); // Stripe not configured

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: fixtures.testApp.id,
          priceCents: 999,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe("Payment processing not configured");
    });

    it("should build description from tagline and description", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create app with both tagline and description
      const appWithDescription = {
        ...fixtures.testApp,
        id: "app_with_desc",
        slug: "app-with-desc",
        tagline: "Amazing App",
        description: "This is a **powerful** app with _many_ features.",
      };

      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser]],
            ["apps", [appWithDescription]],
            ["purchases", []],
            ["discount_codes", []],
          ]),
        },
      });

      const newUser = createMockUser({ id: "new_user_desc" });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: "app_with_desc",
          priceCents: 999,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify Stripe session includes description with tagline
      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0];
      const productData = createCall.line_items[0].price_data.product_data;
      
      expect(productData.description).toContain("Amazing App");
    });

    it("should strip markdown from description", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create app with markdown in description
      const appWithMarkdown = {
        ...fixtures.testApp,
        id: "app_markdown",
        slug: "app-markdown",
        tagline: null,
        description: "# Heading\n\n**Bold text** and *italic* and `code` and [link](http://example.com)",
      };

      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser]],
            ["apps", [appWithMarkdown]],
            ["purchases", []],
            ["discount_codes", []],
          ]),
        },
      });

      const newUser = createMockUser({ id: "new_user_md" });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: "app_markdown",
          priceCents: 999,
        }),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
      
      // Verify markdown was stripped
      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0];
      const productData = createCall.line_items[0].price_data.product_data;
      
      // Should not contain markdown characters
      expect(productData.description).not.toContain("**");
      expect(productData.description).not.toContain("*");
      expect(productData.description).not.toContain("`");
      expect(productData.description).not.toContain("[link]");
      expect(productData.description).not.toContain("# ");
      
      // Should contain plain text
      expect(productData.description).toContain("Bold text");
      expect(productData.description).toContain("italic");
      expect(productData.description).toContain("link");
    });

    it("should truncate description to 500 chars", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create app with very long description
      const longDescription = "A".repeat(600); // 600 chars
      const appWithLongDesc = {
        ...fixtures.testApp,
        id: "app_long_desc",
        slug: "app-long-desc",
        tagline: null,
        description: longDescription,
      };

      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser]],
            ["apps", [appWithLongDesc]],
            ["purchases", []],
            ["discount_codes", []],
          ]),
        },
      });

      const newUser = createMockUser({ id: "new_user_long" });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: "app_long_desc",
          priceCents: 999,
        }),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
      
      // Verify description was truncated
      const createCall = mockStripe.checkout.sessions.create.mock.calls[0][0];
      const productData = createCall.line_items[0].price_data.product_data;
      
      // Should be truncated with ellipsis
      expect(productData.description.length).toBeLessThanOrEqual(500);
      expect(productData.description).toContain("...");
    });
  });

  describe("Error Handling", () => {
    it("should return 500 with error details on Stripe failure", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      const stripeError = new Error("Your card was declined");
      const failingStripe = createFailingStripe(stripeError);

      const newUser = createMockUser({ id: "new_user_stripe_fail" });

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: newUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(failingStripe);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: fixtures.testApp.id,
          priceCents: 999,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to create checkout session");
      expect(data.details).toBe("Your card was declined");
    });

    it("should return 500 on server configuration error", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue({ DB: null } as any);

      const { POST } = await import("@/app/api/checkout/route");

      const request = new Request("https://isolated.tech/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: "test_app",
          priceCents: 999,
        }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Server configuration error");
    });
  });
});
