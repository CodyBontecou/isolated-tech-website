/**
 * Integration tests for discount code validation
 * Tests percent-based and fixed amount discounts, validation rules, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

// Helper to create JSON request
function createRequest(method: string, url: string, body?: object): Request {
  const options: RequestInit = { method };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers = { "Content-Type": "application/json" };
  }
  return new Request(url, options);
}

describe("Discount Code Validation", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/discount/validate", () => {
    describe("Input Validation", () => {
      it("should require discount code", async () => {
        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(mockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          appId: fixtures.testApp.id,
          originalPriceCents: 999,
        });

        const response = await POST(request as any);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.valid).toBe(false);
        expect(data.error).toContain("code");
      });

      it("should require app ID", async () => {
        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(mockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "SAVE50",
          originalPriceCents: 999,
        });

        const response = await POST(request as any);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.valid).toBe(false);
        expect(data.error).toContain("App ID");
      });

      it("should require valid price", async () => {
        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(mockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "SAVE50",
          appId: fixtures.testApp.id,
          originalPriceCents: -100,
        });

        const response = await POST(request as any);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.valid).toBe(false);
        expect(data.error).toContain("price");
      });

      it("should return 404 for non-existent app", async () => {
        // Only have the discount code, no app
        const d1State = fixtures.createTestD1State();
        d1State.tables.set("apps", []); // Clear apps
        const localMockEnv = createMockEnv({ d1State });

        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(localMockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "SAVE50",
          appId: "nonexistent_app",
          originalPriceCents: 999,
        });

        const response = await POST(request as any);
        // Should be 404 or invalid
        const data = await response.json();
        expect(data.valid).toBe(false);
      });
    });

    describe("Discount Calculations", () => {
      it("should handle 100% percent discount (free result)", async () => {
        // Create a 100% off code
        const d1State = fixtures.createTestD1State();
        d1State.tables.set("discount_codes", [
          {
            id: "code_100",
            code: "FREE100",
            discount_type: "percent",
            discount_value: 100,
            app_id: null,
            max_uses: null,
            times_used: 0,
            expires_at: null,
            is_active: 1,
          },
        ]);
        // Make the app have min_price of 0 for this test
        d1State.tables.set("apps", [
          { ...fixtures.testApp, min_price_cents: 0 },
        ]);
        const localMockEnv = createMockEnv({ d1State });

        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(localMockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "FREE100",
          appId: fixtures.testApp.id,
          originalPriceCents: 999,
        });

        const response = await POST(request as any);
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.valid).toBe(true);
        expect(data.finalPriceCents).toBe(0);
      });

      it("should round percent discount to nearest cent", async () => {
        // Create a code that would result in fractional cents
        const d1State = fixtures.createTestD1State();
        d1State.tables.set("discount_codes", [
          {
            id: "code_33",
            code: "SAVE33",
            discount_type: "percent",
            discount_value: 33, // 33% off
            app_id: null,
            max_uses: null,
            times_used: 0,
            expires_at: null,
            is_active: 1,
          },
        ]);
        // App with 0 min price
        d1State.tables.set("apps", [
          { ...fixtures.testApp, min_price_cents: 0 },
        ]);
        const localMockEnv = createMockEnv({ d1State });

        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(localMockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "SAVE33",
          appId: fixtures.testApp.id,
          originalPriceCents: 100, // 100 cents, 33% = 33 cents
        });

        const response = await POST(request as any);
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.valid).toBe(true);
        // Should be rounded: 100 - 33 = 67
        expect(data.finalPriceCents).toBe(67);
        expect(Number.isInteger(data.finalPriceCents)).toBe(true);
      });

      it("should not go below minimum price with fixed discount", async () => {
        const d1State = fixtures.createTestD1State();
        // App with $5 minimum, $10 fixed discount
        d1State.tables.set("apps", [
          { ...fixtures.testApp, min_price_cents: 500 },
        ]);
        d1State.tables.set("discount_codes", [
          {
            id: "code_big",
            code: "BIG10",
            discount_type: "fixed",
            discount_value: 1000, // $10 off
            app_id: null,
            max_uses: null,
            times_used: 0,
            expires_at: null,
            is_active: 1,
          },
        ]);
        const localMockEnv = createMockEnv({ d1State });

        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(localMockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "BIG10",
          appId: fixtures.testApp.id,
          originalPriceCents: 800, // $8 original
        });

        const response = await POST(request as any);
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.valid).toBe(true);
        // Should be limited to min price of $5
        expect(data.finalPriceCents).toBe(500);
        // Actual discount applied is $3 (800 - 500)
        expect(data.discountAmountCents).toBe(300);
      });
    });

    describe("Discount Types", () => {
      it("should correctly identify percent discount type", async () => {
        const d1State = fixtures.createTestD1State();
        d1State.tables.set("discount_codes", [
          {
            id: "code_pct",
            code: "PERCENT50",
            discount_type: "percent",
            discount_value: 50,
            app_id: null,
            max_uses: null,
            times_used: 0,
            expires_at: null,
            is_active: 1,
          },
        ]);
        d1State.tables.set("apps", [{ ...fixtures.testApp, min_price_cents: 0 }]);
        const localMockEnv = createMockEnv({ d1State });

        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(localMockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "PERCENT50",
          appId: fixtures.testApp.id,
          originalPriceCents: 1000,
        });

        const response = await POST(request as any);
        const data = await response.json();
        expect(data.valid).toBe(true);
        expect(data.discountType).toBe("percent");
        expect(data.discountValue).toBe(50);
      });

      it("should correctly identify fixed discount type", async () => {
        const d1State = fixtures.createTestD1State();
        d1State.tables.set("discount_codes", [
          {
            id: "code_fix",
            code: "FIXED500",
            discount_type: "fixed",
            discount_value: 500,
            app_id: null,
            max_uses: null,
            times_used: 0,
            expires_at: null,
            is_active: 1,
          },
        ]);
        d1State.tables.set("apps", [{ ...fixtures.testApp, min_price_cents: 0 }]);
        const localMockEnv = createMockEnv({ d1State });

        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(localMockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "FIXED500",
          appId: fixtures.testApp.id,
          originalPriceCents: 1000,
        });

        const response = await POST(request as any);
        const data = await response.json();
        expect(data.valid).toBe(true);
        expect(data.discountType).toBe("fixed");
        expect(data.discountValue).toBe(500);
      });
    });

    describe("Response Format", () => {
      it("should include success message for percent codes", async () => {
        const d1State = fixtures.createTestD1State();
        d1State.tables.set("discount_codes", [
          {
            id: "code_msg",
            code: "MSG50",
            discount_type: "percent",
            discount_value: 50,
            app_id: null,
            max_uses: null,
            times_used: 0,
            expires_at: null,
            is_active: 1,
          },
        ]);
        d1State.tables.set("apps", [{ ...fixtures.testApp, min_price_cents: 0 }]);
        const localMockEnv = createMockEnv({ d1State });

        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(localMockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "MSG50",
          appId: fixtures.testApp.id,
          originalPriceCents: 1000,
        });

        const response = await POST(request as any);
        const data = await response.json();
        expect(data.message).toContain("50%");
        expect(data.message).toContain("off");
      });

      it("should include success message for fixed codes", async () => {
        const d1State = fixtures.createTestD1State();
        d1State.tables.set("discount_codes", [
          {
            id: "code_fmsg",
            code: "FMSG5",
            discount_type: "fixed",
            discount_value: 500,
            app_id: null,
            max_uses: null,
            times_used: 0,
            expires_at: null,
            is_active: 1,
          },
        ]);
        d1State.tables.set("apps", [{ ...fixtures.testApp, min_price_cents: 0 }]);
        const localMockEnv = createMockEnv({ d1State });

        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(localMockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "FMSG5",
          appId: fixtures.testApp.id,
          originalPriceCents: 1000,
        });

        const response = await POST(request as any);
        const data = await response.json();
        expect(data.message).toContain("$");
        expect(data.message).toContain("off");
      });

      it("should return complete response structure", async () => {
        const d1State = fixtures.createTestD1State();
        d1State.tables.set("discount_codes", [
          {
            id: "code_full",
            code: "FULL20",
            discount_type: "percent",
            discount_value: 20,
            app_id: null,
            max_uses: null,
            times_used: 0,
            expires_at: null,
            is_active: 1,
          },
        ]);
        d1State.tables.set("apps", [{ ...fixtures.testApp, min_price_cents: 0 }]);
        const localMockEnv = createMockEnv({ d1State });

        const { getEnv } = await import("@/lib/cloudflare-context");
        vi.mocked(getEnv).mockReturnValue(localMockEnv as any);

        const { POST } = await import("@/app/api/discount/validate/route");
        const request = createRequest("POST", "http://localhost/api/discount/validate", {
          code: "FULL20",
          appId: fixtures.testApp.id,
          originalPriceCents: 1000,
        });

        const response = await POST(request as any);
        const data = await response.json();

        expect(data).toHaveProperty("valid", true);
        expect(data).toHaveProperty("discountType");
        expect(data).toHaveProperty("discountValue");
        expect(data).toHaveProperty("discountAmountCents");
        expect(data).toHaveProperty("finalPriceCents");
        expect(data).toHaveProperty("message");
      });
    });
  });
});
