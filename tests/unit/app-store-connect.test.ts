/**
 * Unit tests for App Store Connect API integration
 * Tests JWT generation, token caching, and review fetching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Test config with valid base64 (32 bytes of zeros encoded)
const MOCK_KEY_BASE64 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const TEST_CONFIG = {
  keyId: "TEST_KEY_123",
  issuerId: "TEST_ISSUER_456",
  privateKey: `-----BEGIN PRIVATE KEY-----\n${MOCK_KEY_BASE64}\n-----END PRIVATE KEY-----`,
};

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock crypto.subtle for JWT signing
const mockSign = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5]));
const mockImportKey = vi.fn().mockResolvedValue({ type: "private" });

vi.stubGlobal("crypto", {
  subtle: {
    importKey: mockImportKey,
    sign: mockSign,
  },
});

describe("App Store Connect Integration", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    mockSign.mockClear();
    mockImportKey.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // JWT Token Generation
  // ==========================================================================

  describe("JWT Generation", () => {
    it("should generate a valid JWT structure with three parts", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], links: { self: "" } }),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      await client.getReviews("123456789");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, options] = mockFetch.mock.calls[0];
      
      // JWT format: header.payload.signature
      expect(options.headers.Authorization).toMatch(/^Bearer .+\..+\..+$/);
    });

    it("should include correct JWT header with ES256 algorithm", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], links: { self: "" } }),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      await client.getReviews("123456789");

      const authHeader = mockFetch.mock.calls[0][1].headers.Authorization;
      const token = authHeader.replace("Bearer ", "");
      const [headerB64] = token.split(".");
      
      // Decode header (add padding if needed)
      const padding = "=".repeat((4 - (headerB64.length % 4)) % 4);
      const headerJson = atob(headerB64.replace(/-/g, "+").replace(/_/g, "/") + padding);
      const header = JSON.parse(headerJson);

      expect(header.alg).toBe("ES256");
      expect(header.typ).toBe("JWT");
      expect(header.kid).toBe(TEST_CONFIG.keyId);
    });

    it("should include correct JWT payload claims", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], links: { self: "" } }),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      const beforeCall = Math.floor(Date.now() / 1000);
      await client.getReviews("123456789");
      const afterCall = Math.floor(Date.now() / 1000);

      const authHeader = mockFetch.mock.calls[0][1].headers.Authorization;
      const token = authHeader.replace("Bearer ", "");
      const [, payloadB64] = token.split(".");
      
      // Decode payload
      const padding = "=".repeat((4 - (payloadB64.length % 4)) % 4);
      const payloadJson = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/") + padding);
      const payload = JSON.parse(payloadJson);

      expect(payload.iss).toBe(TEST_CONFIG.issuerId);
      expect(payload.aud).toBe("appstoreconnect-v1");
      expect(payload.iat).toBeGreaterThanOrEqual(beforeCall);
      expect(payload.iat).toBeLessThanOrEqual(afterCall);
      expect(payload.exp).toBe(payload.iat + 20 * 60); // 20 minutes
    });

    it("should use ES256 (ECDSA P-256) for signing", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], links: { self: "" } }),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      await client.getReviews("123456789");

      // Verify importKey was called with ECDSA P-256
      expect(mockImportKey).toHaveBeenCalledWith(
        "pkcs8",
        expect.any(Uint8Array),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
      );

      // Verify sign was called with SHA-256
      expect(mockSign).toHaveBeenCalledWith(
        { name: "ECDSA", hash: "SHA-256" },
        expect.anything(),
        expect.any(Uint8Array)
      );
    });

    it("should cache tokens and reuse them within validity period", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [], links: { self: "" } }),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      // Make two requests
      await client.getReviews("123456789");
      await client.getReviews("123456789");

      // Both should use the same token (importKey called only once)
      expect(mockImportKey).toHaveBeenCalledTimes(1);
      
      // Tokens should be identical
      const token1 = mockFetch.mock.calls[0][1].headers.Authorization;
      const token2 = mockFetch.mock.calls[1][1].headers.Authorization;
      expect(token1).toBe(token2);
    });
  });

  // ==========================================================================
  // getReviews
  // ==========================================================================

  describe("getReviews", () => {
    const mockReviewsResponse = {
      data: [
        {
          id: "review_1",
          type: "customerReviews",
          attributes: {
            rating: 5,
            title: "Great app!",
            body: "Love this app, use it daily.",
            reviewerNickname: "HappyUser123",
            createdDate: "2024-01-15T10:30:00Z",
            territory: "USA",
          },
        },
        {
          id: "review_2",
          type: "customerReviews",
          attributes: {
            rating: 3,
            title: null,
            body: "It's okay.",
            reviewerNickname: "SomeUser",
            createdDate: "2024-01-14T08:00:00Z",
            territory: "GBR",
          },
        },
      ],
      links: {
        self: "https://api.appstoreconnect.apple.com/v1/apps/123456789/customerReviews",
      },
    };

    it("should fetch reviews successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReviewsResponse),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      const reviews = await client.getReviews("123456789");

      expect(reviews).toHaveLength(2);
      expect(reviews[0]).toEqual({
        id: "review_1",
        rating: 5,
        title: "Great app!",
        body: "Love this app, use it daily.",
        reviewerNickname: "HappyUser123",
        territory: "USA",
        createdDate: "2024-01-15T10:30:00Z",
      });
    });

    it("should normalize reviews correctly with null fields", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReviewsResponse),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      const reviews = await client.getReviews("123456789");

      // Check that null title is preserved
      expect(reviews[1].title).toBeNull();
      expect(reviews[1].rating).toBe(3);
    });

    it("should use correct API endpoint and parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], links: { self: "" } }),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      await client.getReviews("123456789", { limit: 100, sortBy: "rating" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("api.appstoreconnect.apple.com");
      expect(url).toContain("/apps/123456789/customerReviews");
      expect(url).toContain("limit=100");
      expect(url).toContain("sort=rating");
    });

    it("should handle pagination with next links", async () => {
      const page1Response = {
        data: [
          {
            id: "review_1",
            type: "customerReviews",
            attributes: {
              rating: 5,
              title: "Review 1",
              body: "Body 1",
              reviewerNickname: "User1",
              createdDate: "2024-01-15T10:30:00Z",
              territory: "USA",
            },
          },
        ],
        links: {
          self: "https://api.appstoreconnect.apple.com/v1/apps/123/customerReviews",
          next: "https://api.appstoreconnect.apple.com/v1/apps/123/customerReviews?cursor=abc",
        },
      };

      const page2Response = {
        data: [
          {
            id: "review_2",
            type: "customerReviews",
            attributes: {
              rating: 4,
              title: "Review 2",
              body: "Body 2",
              reviewerNickname: "User2",
              createdDate: "2024-01-14T08:00:00Z",
              territory: "GBR",
            },
          },
        ],
        links: {
          self: "https://api.appstoreconnect.apple.com/v1/apps/123/customerReviews?cursor=abc",
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page1Response),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(page2Response),
        });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      const reviews = await client.getReviews("123456789");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(reviews).toHaveLength(2);
      expect(reviews[0].id).toBe("review_1");
      expect(reviews[1].id).toBe("review_2");
    });

    it("should respect maxPages limit", async () => {
      // Create response that always has a next page
      const createPageResponse = (pageNum: number) => ({
        data: [
          {
            id: `review_${pageNum}`,
            type: "customerReviews",
            attributes: {
              rating: 5,
              title: `Review ${pageNum}`,
              body: `Body ${pageNum}`,
              reviewerNickname: `User${pageNum}`,
              createdDate: "2024-01-15T10:30:00Z",
              territory: "USA",
            },
          },
        ],
        links: {
          self: `https://api.appstoreconnect.apple.com/v1/apps/123/customerReviews?page=${pageNum}`,
          next: `https://api.appstoreconnect.apple.com/v1/apps/123/customerReviews?page=${pageNum + 1}`,
        },
      });

      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createPageResponse(i + 1)),
        });
      }

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      await client.getReviews("123456789", { maxPages: 3 });

      // Should stop at 3 pages even though more are available
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should throw on API error with status code", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized: Invalid token"),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      await expect(client.getReviews("123456789")).rejects.toThrow(
        "App Store Connect API error (401)"
      );
    });

    it("should handle empty response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], links: { self: "" } }),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      const reviews = await client.getReviews("123456789");

      expect(reviews).toEqual([]);
    });

    it("should use default sort order of -createdDate (most recent first)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], links: { self: "" } }),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      await client.getReviews("123456789");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("sort=-createdDate");
    });
  });

  // ==========================================================================
  // getReviewsSince
  // ==========================================================================

  describe("getReviewsSince", () => {
    it("should filter reviews by date", async () => {
      const reviewsResponse = {
        data: [
          {
            id: "review_new",
            type: "customerReviews",
            attributes: {
              rating: 5,
              title: "New review",
              body: "Recent",
              reviewerNickname: "NewUser",
              createdDate: "2024-01-20T10:00:00Z",
              territory: "USA",
            },
          },
          {
            id: "review_old",
            type: "customerReviews",
            attributes: {
              rating: 4,
              title: "Old review",
              body: "Old",
              reviewerNickname: "OldUser",
              createdDate: "2024-01-10T10:00:00Z",
              territory: "USA",
            },
          },
        ],
        links: { self: "" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(reviewsResponse),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      const cutoffDate = new Date("2024-01-15T00:00:00Z");
      const reviews = await client.getReviewsSince("123456789", cutoffDate);

      expect(reviews).toHaveLength(1);
      expect(reviews[0].id).toBe("review_new");
    });

    it("should return empty array if no reviews after date", async () => {
      const reviewsResponse = {
        data: [
          {
            id: "review_old",
            type: "customerReviews",
            attributes: {
              rating: 4,
              title: "Old review",
              body: "Old",
              reviewerNickname: "OldUser",
              createdDate: "2024-01-10T10:00:00Z",
              territory: "USA",
            },
          },
        ],
        links: { self: "" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(reviewsResponse),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      const cutoffDate = new Date("2024-01-15T00:00:00Z");
      const reviews = await client.getReviewsSince("123456789", cutoffDate);

      expect(reviews).toEqual([]);
    });

    it("should use high limit and more pages for comprehensive fetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], links: { self: "" } }),
      });

      const { createAppStoreConnectClient } = await import("@/lib/app-store-connect");
      const client = createAppStoreConnectClient(TEST_CONFIG);
      
      await client.getReviewsSince("123456789", new Date());

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("limit=200");
    });
  });

  // ==========================================================================
  // getAppStoreConnectClient (from env)
  // ==========================================================================

  describe("getAppStoreConnectClient", () => {
    it("should create client with valid environment variables", async () => {
      const { getAppStoreConnectClient } = await import("@/lib/app-store-connect");
      
      const env = {
        APP_STORE_CONNECT_KEY_ID: "KEY_123",
        APP_STORE_CONNECT_ISSUER_ID: "ISSUER_456",
        APP_STORE_CONNECT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\ndata\n-----END PRIVATE KEY-----",
      };

      const client = getAppStoreConnectClient(env);
      expect(client).toBeDefined();
      expect(client.getReviews).toBeInstanceOf(Function);
      expect(client.getReviewsSince).toBeInstanceOf(Function);
    });

    it("should throw if KEY_ID is missing", async () => {
      const { getAppStoreConnectClient } = await import("@/lib/app-store-connect");
      
      const env = {
        APP_STORE_CONNECT_ISSUER_ID: "ISSUER_456",
        APP_STORE_CONNECT_PRIVATE_KEY: "key",
      };

      expect(() => getAppStoreConnectClient(env)).toThrow(
        "Missing App Store Connect credentials"
      );
    });

    it("should throw if ISSUER_ID is missing", async () => {
      const { getAppStoreConnectClient } = await import("@/lib/app-store-connect");
      
      const env = {
        APP_STORE_CONNECT_KEY_ID: "KEY_123",
        APP_STORE_CONNECT_PRIVATE_KEY: "key",
      };

      expect(() => getAppStoreConnectClient(env)).toThrow(
        "Missing App Store Connect credentials"
      );
    });

    it("should throw if PRIVATE_KEY is missing", async () => {
      const { getAppStoreConnectClient } = await import("@/lib/app-store-connect");
      
      const env = {
        APP_STORE_CONNECT_KEY_ID: "KEY_123",
        APP_STORE_CONNECT_ISSUER_ID: "ISSUER_456",
      };

      expect(() => getAppStoreConnectClient(env)).toThrow(
        "Missing App Store Connect credentials"
      );
    });

    it("should handle escaped newlines in private key", async () => {
      const { getAppStoreConnectClient } = await import("@/lib/app-store-connect");
      
      // Private key with literal \n instead of actual newlines (common in env vars)
      const env = {
        APP_STORE_CONNECT_KEY_ID: "KEY_123",
        APP_STORE_CONNECT_ISSUER_ID: "ISSUER_456",
        APP_STORE_CONNECT_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\ndata\\n-----END PRIVATE KEY-----",
      };

      const client = getAppStoreConnectClient(env);
      expect(client).toBeDefined();
    });
  });
});
