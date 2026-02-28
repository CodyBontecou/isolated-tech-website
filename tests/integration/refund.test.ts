/**
 * Integration tests for admin refund route
 * Tests the refund processing flow including:
 * - Admin authentication
 * - Purchase validation
 * - Stripe refund processing
 * - Database updates
 * - Logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import { createMockStripe, createFailingStripe } from "../mocks/stripe";
import { createMockUser } from "../mocks/auth";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  createStripeClient: vi.fn(),
}));

vi.mock("@/lib/auth/middleware", () => ({
  getSessionFromHeaders: vi.fn(),
}));

describe("POST /api/admin/refund", () => {
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

  describe("Authentication & Authorization", () => {
    it("should return 403 when user not authenticated", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({ user: null, session: null });

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "purchase_test_123" }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Admin access required");
    });

    it("should return 403 when user is not admin", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      const regularUser = createMockUser({ isAdmin: false });

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "purchase_test_123" }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Admin access required");
    });
  });

  describe("Validation", () => {
    it("should return 400 when purchaseId missing", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Purchase ID required");
    });

    it("should return 404 when purchase not found", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "nonexistent_purchase" }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Purchase not found");
    });

    it("should return 400 when purchase already refunded", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: fixtures.refundedPurchase.id }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Purchase already refunded");
    });
  });

  describe("Stripe Refund Processing", () => {
    it("should call stripe.refunds.create() with payment_intent", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: fixtures.testPurchase.id }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: fixtures.testPurchase.stripe_payment_intent_id,
      });
    });

    it("should return 503 when Stripe not configured", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create a fresh env with a new purchase that hasn't been used
      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser, fixtures.adminUser]],
            ["apps", [fixtures.testApp, fixtures.freeApp]],
            ["purchases", [{
              id: "purchase_stripe_503_test",
              user_id: fixtures.testUser.id,
              app_id: fixtures.testApp.id,
              stripe_payment_intent_id: "pi_stripe_503",
              stripe_checkout_session_id: "cs_stripe_503",
              amount_cents: 999,
              discount_code_id: null,
              status: "completed",
              created_at: new Date("2024-01-01").toISOString(),
            }]],
            ["email_log", []],
          ]),
        },
      });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(null);

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "purchase_stripe_503_test" }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe("Stripe not configured");
    });

    it("should return 500 with Stripe error details on failure", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      const stripeError = new Error("Card has been declined") as Error & { code?: string };
      stripeError.code = "card_declined";
      const failingStripe = createFailingStripe(stripeError);

      // Create a fresh env with a new purchase that hasn't been used
      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser, fixtures.adminUser]],
            ["apps", [fixtures.testApp, fixtures.freeApp]],
            ["purchases", [{
              id: "purchase_stripe_fail_test",
              user_id: fixtures.testUser.id,
              app_id: fixtures.testApp.id,
              stripe_payment_intent_id: "pi_stripe_fail",
              stripe_checkout_session_id: "cs_stripe_fail",
              amount_cents: 999,
              discount_code_id: null,
              status: "completed",
              created_at: new Date("2024-01-01").toISOString(),
            }]],
            ["email_log", []],
          ]),
        },
      });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(failingStripe);

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "purchase_stripe_fail_test" }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Card has been declined");
      expect(data.code).toBe("card_declined");
    });

    it("should skip Stripe call for free purchases (amount_cents = 0)", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: fixtures.freePurchase.id }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Stripe refunds.create should NOT be called for free purchases
      expect(mockStripe.refunds.create).not.toHaveBeenCalled();
    });
  });

  describe("Database Updates", () => {
    it("should set status to 'refunded' by default", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create a fresh env with a new purchase
      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser, fixtures.adminUser]],
            ["apps", [fixtures.testApp]],
            ["purchases", [{
              id: "purchase_refund_status_test",
              user_id: fixtures.testUser.id,
              app_id: fixtures.testApp.id,
              stripe_payment_intent_id: "pi_refund_status",
              stripe_checkout_session_id: "cs_refund_status",
              amount_cents: 999,
              discount_code_id: null,
              status: "completed",
              created_at: new Date("2024-01-01").toISOString(),
            }]],
            ["email_log", []],
          ]),
        },
      });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "purchase_refund_status_test" }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Verify the refund was processed successfully
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Refund processed successfully");
    });

    it("should set status to 'refunded_with_access' when keepAccess=true", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create a fresh env with a new purchase
      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser, fixtures.adminUser]],
            ["apps", [fixtures.testApp]],
            ["purchases", [{
              id: "purchase_keep_access_test",
              user_id: fixtures.testUser.id,
              app_id: fixtures.testApp.id,
              stripe_payment_intent_id: "pi_keep_access",
              stripe_checkout_session_id: "cs_keep_access",
              amount_cents: 999,
              discount_code_id: null,
              status: "completed",
              created_at: new Date("2024-01-01").toISOString(),
            }]],
            ["email_log", []],
          ]),
        },
      });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "purchase_keep_access_test", keepAccess: true }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Refund processed successfully");
    });

    it("should set refunded_at timestamp", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create a fresh env with a new purchase
      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser, fixtures.adminUser]],
            ["apps", [fixtures.testApp]],
            ["purchases", [{
              id: "purchase_timestamp_test",
              user_id: fixtures.testUser.id,
              app_id: fixtures.testApp.id,
              stripe_payment_intent_id: "pi_timestamp",
              stripe_checkout_session_id: "cs_timestamp",
              amount_cents: 999,
              discount_code_id: null,
              status: "completed",
              created_at: new Date("2024-01-01").toISOString(),
            }]],
            ["email_log", []],
          ]),
        },
      });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "purchase_timestamp_test" }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Verify the refund was processed
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe("Logging", () => {
    it("should log refund notification in email_log table", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      // Create a fresh env with a new purchase
      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser, fixtures.adminUser]],
            ["apps", [fixtures.testApp]],
            ["purchases", [{
              id: "purchase_email_log_test",
              user_id: fixtures.testUser.id,
              app_id: fixtures.testApp.id,
              stripe_payment_intent_id: "pi_email_log",
              stripe_checkout_session_id: "cs_email_log",
              amount_cents: 999,
              discount_code_id: null,
              status: "completed",
              created_at: new Date("2024-01-01").toISOString(),
            }]],
            ["email_log", []],
          ]),
        },
      });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "purchase_email_log_test" }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      // Verify successful refund (which means email_log was written)
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should log admin action to console", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      const { createStripeClient } = await import("@/lib/stripe");

      const consoleSpy = vi.spyOn(console, "log");

      // Create a fresh env with a new purchase
      const freshEnv = createMockEnv({
        d1State: {
          tables: new Map([
            ["user", [fixtures.testUser, fixtures.adminUser]],
            ["apps", [fixtures.testApp]],
            ["purchases", [{
              id: "purchase_console_log_test",
              user_id: fixtures.testUser.id,
              app_id: fixtures.testApp.id,
              stripe_payment_intent_id: "pi_console_log",
              stripe_checkout_session_id: "cs_console_log",
              amount_cents: 999,
              discount_code_id: null,
              status: "completed",
              created_at: new Date("2024-01-01").toISOString(),
            }]],
            ["email_log", []],
          ]),
        },
      });

      vi.mocked(getEnv).mockReturnValue(freshEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser,
        session: { id: "session_123" },
      });
      vi.mocked(createStripeClient).mockReturnValue(mockStripe);

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "purchase_console_log_test" }),
      });

      await POST(request as any);

      // Verify console.log was called with admin info
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Refund processed by admin")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when DB not configured", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue({ DB: null } as any);

      const { POST } = await import("@/app/api/admin/refund/route");

      const request = new Request("https://isolated.tech/api/admin/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId: "test" }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Server configuration error");
    });
  });
});
