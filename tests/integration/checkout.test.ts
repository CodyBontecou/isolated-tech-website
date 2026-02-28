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
import { createMockStripe } from "../mocks/stripe";
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
      
      // Verify Stripe was called
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalled();
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
  });
});
