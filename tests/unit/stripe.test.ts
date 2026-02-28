/**
 * Unit tests for Stripe utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStripeClient, getBaseUrl } from "@/lib/stripe";

describe("Stripe Utilities", () => {
  describe("createStripeClient", () => {
    it("should return null when STRIPE_SECRET_KEY is not configured", () => {
      const env = {} as any;
      const client = createStripeClient(env);
      expect(client).toBeNull();
    });

    it("should create a Stripe client when key is configured", () => {
      const env = { STRIPE_SECRET_KEY: "sk_test_fake" } as any;
      const client = createStripeClient(env);
      expect(client).not.toBeNull();
    });
  });

  describe("getBaseUrl", () => {
    it("should extract base URL from request", () => {
      const request = new Request("https://isolated.tech/api/checkout");
      const baseUrl = getBaseUrl(request);
      expect(baseUrl).toBe("https://isolated.tech");
    });

    it("should handle localhost", () => {
      const request = new Request("http://localhost:3000/api/checkout");
      const baseUrl = getBaseUrl(request);
      expect(baseUrl).toBe("http://localhost:3000");
    });

    it("should preserve port numbers", () => {
      const request = new Request("http://localhost:5173/test");
      const baseUrl = getBaseUrl(request);
      expect(baseUrl).toBe("http://localhost:5173");
    });
  });
});
