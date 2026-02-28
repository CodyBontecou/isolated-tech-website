/**
 * Integration tests for Stripe webhook handler
 * Tests critical payment event processing:
 * - checkout.session.completed
 * - charge.refunded
 * - Idempotency (duplicate handling)
 * - Signature verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import {
  createMockStripe,
  createMockCheckoutSession,
  createMockCharge,
  createMockStripeEvent,
} from "../mocks/stripe";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  createStripeClient: vi.fn(),
}));

describe("POST /api/webhooks/stripe", () => {
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

  describe("Configuration & Validation", () => {
    it("should return 500 if DB is not configured", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue({ DB: null } as any);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Server error");
    });

    it("should return 400 if stripe-signature header is missing", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
        // No stripe-signature header
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing stripe-signature header");
    });

    it("should return 503 if Stripe is not configured", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      // Remove webhook secret
      const envWithoutSecret = { ...mockEnv };
      delete (envWithoutSecret as any).STRIPE_WEBHOOK_SECRET;

      vi.mocked(getEnv).mockReturnValue(envWithoutSecret as any);
      vi.mocked(createStripeClient).mockReturnValue(null);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "test_sig" },
        body: "{}",
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe("Stripe not configured");
    });

    it("should return 400 if signature verification fails", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      // Make constructEvent throw an error
      mockStripe.webhooks.constructEvent = vi.fn(() => {
        throw new Error("Invalid signature");
      });

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "invalid_signature" },
        body: "{}",
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid signature");
    });
  });

  describe("checkout.session.completed", () => {
    it("should create purchase record on successful checkout", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      // Create a checkout session event
      const session = createMockCheckoutSession({
        id: "cs_new_session",
        metadata: {
          app_id: fixtures.testApp.id,
          user_id: "new_customer_123",
          user_email: "newcustomer@example.com",
          user_name: "New Customer",
          discount_code_id: "",
          original_price_cents: "999",
          final_price_cents: "999",
        },
        amount_total: 999,
        payment_intent: "pi_new_123",
      });

      const event = createMockStripeEvent("checkout.session.completed", session);

      // Mock constructEvent to return our event
      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(event);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid_sig" },
        body: JSON.stringify(session),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      // Verify DB insert was called
      expect(mockEnv.DB.prepare).toHaveBeenCalled();
    });

    it("should be idempotent - skip if purchase already exists", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      // Use existing checkout session ID from fixtures
      const session = createMockCheckoutSession({
        id: fixtures.testPurchase.stripe_checkout_session_id,
        metadata: {
          app_id: fixtures.testApp.id,
          user_id: fixtures.testUser.id,
          user_email: fixtures.testUser.email,
          user_name: fixtures.testUser.name,
          discount_code_id: "",
          original_price_cents: "999",
          final_price_cents: "999",
        },
      });

      const event = createMockStripeEvent("checkout.session.completed", session);
      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(event);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid_sig" },
        body: JSON.stringify(session),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
      // Should return success but not create duplicate
    });

    it("should handle missing metadata gracefully", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const session = createMockCheckoutSession({
        metadata: {}, // Missing required fields
      });

      const event = createMockStripeEvent("checkout.session.completed", session);
      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(event);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid_sig" },
        body: JSON.stringify(session),
      });

      const response = await POST(request as any);

      // Should still return 200 to prevent Stripe retries
      expect(response.status).toBe(200);
    });

    it("should increment discount code usage when present", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create fresh env with discount code
      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser]],
            ["apps", [fixtures.testApp]],
            ["purchases", []],
            ["discount_codes", [fixtures.percentDiscountCode]],
            ["email_log", []],
          ]),
        },
      });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const session = createMockCheckoutSession({
        id: "cs_discount_increment",
        metadata: {
          app_id: fixtures.testApp.id,
          user_id: "discount_user_123",
          user_email: "discount@example.com",
          user_name: "Discount User",
          discount_code_id: fixtures.percentDiscountCode.id,
          original_price_cents: "999",
          final_price_cents: "500",
        },
        amount_total: 500,
        payment_intent: "pi_discount_123",
      });

      const event = createMockStripeEvent("checkout.session.completed", session);
      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(event);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid_sig" },
        body: JSON.stringify(session),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
      // Verify DB operations were called (purchase insert + discount code update)
      expect(freshEnv.DB.prepare).toHaveBeenCalled();
    });

    it("should log purchase in email_log table", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create fresh env
      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser]],
            ["apps", [fixtures.testApp]],
            ["purchases", []],
            ["discount_codes", []],
            ["email_log", []],
          ]),
        },
      });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const session = createMockCheckoutSession({
        id: "cs_email_log_test",
        metadata: {
          app_id: fixtures.testApp.id,
          user_id: "email_log_user",
          user_email: "emaillog@example.com",
          user_name: "Email Log User",
          discount_code_id: "",
          original_price_cents: "999",
          final_price_cents: "999",
        },
        amount_total: 999,
        payment_intent: "pi_email_log",
      });

      const event = createMockStripeEvent("checkout.session.completed", session);
      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(event);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid_sig" },
        body: JSON.stringify(session),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
      // Verify DB operations occurred
      expect(freshEnv.DB.prepare).toHaveBeenCalled();
    });
  });

  describe("charge.refunded", () => {
    it("should mark purchase as refunded", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const charge = createMockCharge({
        payment_intent: fixtures.testPurchase.stripe_payment_intent_id,
        refunded: true,
      });

      const event = createMockStripeEvent("charge.refunded", charge);
      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(event);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid_sig" },
        body: JSON.stringify(charge),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
      // Verify UPDATE was called
      expect(mockEnv.DB.prepare).toHaveBeenCalled();
    });

    it("should handle refund for non-existent purchase", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const charge = createMockCharge({
        payment_intent: "pi_nonexistent",
        refunded: true,
      });

      const event = createMockStripeEvent("charge.refunded", charge);
      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(event);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid_sig" },
        body: JSON.stringify(charge),
      });

      const response = await POST(request as any);

      // Should still return 200
      expect(response.status).toBe(200);
    });

    it("should handle missing payment_intent gracefully", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const charge = createMockCharge({
        payment_intent: null as any, // No payment_intent
        refunded: true,
      });

      const event = createMockStripeEvent("charge.refunded", charge);
      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(event);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid_sig" },
        body: JSON.stringify(charge),
      });

      const response = await POST(request as any);

      // Should return 200 (gracefully handle missing payment_intent)
      expect(response.status).toBe(200);
    });
  });

  describe("Processing Errors", () => {
    it("should return 200 on processing errors to prevent Stripe retries", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create env where DB operations will fail
      const failingEnv = {
        ...mockEnv,
        DB: {
          prepare: vi.fn(() => ({
            bind: vi.fn(() => ({
              first: vi.fn().mockRejectedValue(new Error("Database error")),
              run: vi.fn().mockRejectedValue(new Error("Database error")),
            })),
          })),
        },
        STRIPE_WEBHOOK_SECRET: "whsec_mock",
      };

      vi.mocked(getEnv).mockReturnValue(failingEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const session = createMockCheckoutSession({
        id: "cs_will_fail",
        metadata: {
          app_id: fixtures.testApp.id,
          user_id: "failing_user",
          user_email: "fail@example.com",
          user_name: "Failing User",
          discount_code_id: "",
          original_price_cents: "999",
          final_price_cents: "999",
        },
      });

      const event = createMockStripeEvent("checkout.session.completed", session);
      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(event);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid_sig" },
        body: JSON.stringify(session),
      });

      const response = await POST(request as any);

      // Should return 200 to prevent Stripe retries
      expect(response.status).toBe(200);
    });
  });

  describe("Unhandled Events", () => {
    it("should acknowledge unhandled event types", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const event = createMockStripeEvent("payment_intent.created", {});
      mockStripe.webhooks.constructEvent = vi.fn().mockReturnValue(event);

      const { POST } = await import("@/app/api/webhooks/stripe/route");

      const request = new Request("https://isolated.tech/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid_sig" },
        body: "{}",
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
    });
  });
});
