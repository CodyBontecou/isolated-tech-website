/**
 * Unit tests for Stripe utilities
 */

import { describe, it, expect } from "vitest";
import { createStripeClient, getBaseUrl, isMissingStripeAccountError } from "@/lib/stripe";

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

    it("should prefer APP_URL when configured", () => {
      const request = new Request("http://localhost:5173/test");
      const baseUrl = getBaseUrl(request, { APP_URL: "https://app.isolated.tech/" } as any);
      expect(baseUrl).toBe("https://app.isolated.tech");
    });

    it("should use forwarded host/proto headers when present", () => {
      const request = new Request("http://localhost:5173/test", {
        headers: {
          "x-forwarded-proto": "https",
          "x-forwarded-host": "isolated.tech",
        },
      });

      const baseUrl = getBaseUrl(request);
      expect(baseUrl).toBe("https://isolated.tech");
    });
  });

  describe("isMissingStripeAccountError", () => {
    it("should detect Stripe missing account errors", () => {
      const err = {
        code: "resource_missing",
        param: "account",
        message: "No such account: 'acct_123'",
      };

      expect(isMissingStripeAccountError(err)).toBe(true);
    });

    it("should return false for unrelated errors", () => {
      const err = {
        code: "invalid_request_error",
        param: "email",
        message: "Invalid email",
      };

      expect(isMissingStripeAccountError(err)).toBe(false);
    });
  });
});
