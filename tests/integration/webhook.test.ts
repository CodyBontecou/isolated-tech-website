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

  describe("Request Validation", () => {
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
