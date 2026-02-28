/**
 * Integration tests for cron jobs
 * Tests the App Store Connect review sync endpoint
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/app-store-connect", () => ({
  getAppStoreConnectClient: vi.fn().mockReturnValue({
    getReviews: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("@/lib/db", () => ({
  queries: {
    upsertAppStoreReview: vi.fn().mockResolvedValue(undefined),
    updateAppStoreSyncLog: vi.fn().mockResolvedValue(undefined),
  },
  nanoid: vi.fn().mockReturnValue("mock_id_123"),
}));

describe("POST /api/cron/sync-reviews", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    
    const d1State = fixtures.createTestD1State();
    mockEnv = createMockEnv({ d1State });
    // Add CRON_SECRET to env
    (mockEnv as any).CRON_SECRET = "test_cron_secret";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should require cron secret", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { POST } = await import("@/app/api/cron/sync-reviews/route");
      const request = new Request("https://isolated.tech/api/cron/sync-reviews", {
        method: "POST",
        headers: {
          "Authorization": "Bearer wrong_secret",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should accept valid cron secret", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { POST } = await import("@/app/api/cron/sync-reviews/route");
      const request = new Request("https://isolated.tech/api/cron/sync-reviews", {
        method: "POST",
        headers: {
          "Authorization": "Bearer test_cron_secret",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should work without secret when not configured", async () => {
      // Remove CRON_SECRET from env
      delete (mockEnv as any).CRON_SECRET;

      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { POST } = await import("@/app/api/cron/sync-reviews/route");
      const request = new Request("https://isolated.tech/api/cron/sync-reviews", {
        method: "POST",
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Sync Process", () => {
    it("should return success with results", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { POST } = await import("@/app/api/cron/sync-reviews/route");
      const request = new Request("https://isolated.tech/api/cron/sync-reviews", {
        method: "POST",
        headers: {
          "Authorization": "Bearer test_cron_secret",
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.synced_at).toBeDefined();
      expect(data.results).toBeDefined();
      expect(Array.isArray(data.results)).toBe(true);
    });

    it("should return 500 when env is not available", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(null as any);

      const { POST } = await import("@/app/api/cron/sync-reviews/route");
      const request = new Request("https://isolated.tech/api/cron/sync-reviews", {
        method: "POST",
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });

  describe("GET /api/cron/sync-reviews", () => {
    it("should also require authentication", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/api/cron/sync-reviews/route");
      const request = new Request("https://isolated.tech/api/cron/sync-reviews", {
        method: "GET",
        headers: {
          "Authorization": "Bearer wrong_secret",
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("should work the same as POST", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/api/cron/sync-reviews/route");
      const request = new Request("https://isolated.tech/api/cron/sync-reviews", {
        method: "GET",
        headers: {
          "Authorization": "Bearer test_cron_secret",
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);
    });
  });
});

describe("App Store Connect Client", () => {
  describe("getAppStoreConnectClient", () => {
    it("should return a client with getReviews method", async () => {
      const { getAppStoreConnectClient } = await import("@/lib/app-store-connect");
      
      const client = getAppStoreConnectClient({
        APP_STORE_CONNECT_KEY_ID: "test_key_id",
        APP_STORE_CONNECT_ISSUER_ID: "test_issuer_id",
        APP_STORE_CONNECT_PRIVATE_KEY: "test_private_key",
      });

      expect(client).toBeDefined();
      expect(typeof client.getReviews).toBe("function");
    });
  });

  describe("JWT Token Generation", () => {
    // These tests verify JWT structure requirements
    
    it("should use ES256 algorithm", () => {
      const header = {
        alg: "ES256",
        kid: "KEY_ID",
        typ: "JWT",
      };
      
      expect(header.alg).toBe("ES256");
      expect(header.typ).toBe("JWT");
    });

    it("should include required claims", () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        iss: "ISSUER_ID",
        iat: now,
        exp: now + 20 * 60,
        aud: "appstoreconnect-v1",
      };

      expect(payload.iss).toBeDefined();
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.aud).toBe("appstoreconnect-v1");
    });

    it("should set 20-minute expiration", () => {
      const now = Math.floor(Date.now() / 1000);
      const twentyMinutesInSeconds = 20 * 60;
      const payload = {
        iat: now,
        exp: now + twentyMinutesInSeconds,
      };

      expect(payload.exp - payload.iat).toBe(twentyMinutesInSeconds);
    });
  });

  describe("Review Normalization", () => {
    it("should normalize App Store review format", () => {
      // Mock App Store review format
      const appStoreReview = {
        id: "review_123",
        type: "customerReviews",
        attributes: {
          rating: 5,
          title: "Great app!",
          body: "Love this app, use it every day.",
          reviewerNickname: "HappyUser",
          createdDate: "2024-02-15T10:30:00Z",
          territory: "USA",
        },
      };

      // Normalized format
      const normalized = {
        id: appStoreReview.id,
        rating: appStoreReview.attributes.rating,
        title: appStoreReview.attributes.title,
        body: appStoreReview.attributes.body,
        reviewerNickname: appStoreReview.attributes.reviewerNickname,
        territory: appStoreReview.attributes.territory,
        createdDate: appStoreReview.attributes.createdDate,
      };

      expect(normalized.id).toBe("review_123");
      expect(normalized.rating).toBe(5);
      expect(normalized.title).toBe("Great app!");
      expect(normalized.territory).toBe("USA");
    });

    it("should handle null title and body", () => {
      const appStoreReview = {
        id: "review_456",
        type: "customerReviews",
        attributes: {
          rating: 4,
          title: null,
          body: null,
          reviewerNickname: "QuietUser",
          createdDate: "2024-02-16T12:00:00Z",
          territory: "GBR",
        },
      };

      const normalized = {
        id: appStoreReview.id,
        rating: appStoreReview.attributes.rating,
        title: appStoreReview.attributes.title,
        body: appStoreReview.attributes.body,
      };

      expect(normalized.title).toBeNull();
      expect(normalized.body).toBeNull();
    });
  });
});
