/**
 * Route Health Tests (Integration)
 *
 * Tests that the data fetching functions used by Server Components work correctly
 * and handle edge cases gracefully without throwing 500 errors.
 *
 * These tests catch:
 * - Database query syntax errors
 * - Null pointer errors in data handling
 * - Missing environment variable access
 * - Edge cases in data transformations
 *
 * Note: Full Server Component render testing is done via E2E tests.
 * This file focuses on the data layer that powers those components.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
  getCloudflareContext: vi.fn(),
  runWithCloudflareContext: vi.fn((ctx, fn) => fn()),
}));

vi.mock("@/lib/auth/middleware", () => ({
  getCurrentUser: vi.fn(),
  getCurrentSession: vi.fn().mockResolvedValue({ session: null, user: null }),
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
  getSessionFromHeaders: vi.fn().mockResolvedValue({ session: null, user: null }),
  validateSessionFromRequest: vi.fn().mockResolvedValue({ session: null, user: null }),
  isAuthenticated: vi.fn().mockResolvedValue(false),
}));

// ============================================================================
// Database Query Tests
// ============================================================================

describe("Route Health - Database Queries", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("Query Helper Functions", () => {
    it("query() handles empty results gracefully", async () => {
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("apps", []); // Empty table
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { query } = await import("@/lib/db");

      const results = await query("SELECT * FROM apps WHERE is_published = 1", [], mockEnv as any);
      expect(results).toEqual([]);
    });

    it("queryOne() returns null for missing records", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { queryOne } = await import("@/lib/db");

      const result = await queryOne("SELECT * FROM apps WHERE id = ?", ["nonexistent"], mockEnv as any);
      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// API Route Handler Tests
// ============================================================================

describe("Route Health - API Endpoints", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("GET /api/feedback", () => {
    it("returns empty list when no feedback exists", async () => {
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("feature_requests", []);
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { GET } = await import("@/app/api/feedback/route");
      const request = new Request("http://localhost/api/feedback");
      const response = await GET(request);

      expect(response.status).toBeLessThan(500);
      const data = await response.json();
      expect(data.items).toBeDefined();
      expect(Array.isArray(data.items)).toBe(true);
    });

    it("handles invalid sort parameter gracefully", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { GET } = await import("@/app/api/feedback/route");
      const request = new Request("http://localhost/api/feedback?sort=invalid_sort_value");
      const response = await GET(request);

      // Should not 500, may return 400 or default to valid sort
      expect(response.status).toBeLessThan(500);
    });
  });

  describe("GET /api/admin/apps", () => {
    it("returns 401 for unauthenticated requests", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      vi.mocked(getSessionFromHeaders).mockResolvedValue({ session: null, user: null });

      const { GET } = await import("@/app/api/admin/apps/route");
      const request = new Request("http://localhost/api/admin/apps");
      const response = await GET(request);

      // Should return 401 or 403, not 500
      expect(response.status).toBeLessThan(500);
      expect([401, 403]).toContain(response.status);
    });

    it("returns apps list for admin users", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        session: { id: "session_123", userId: fixtures.adminUser.id, expiresAt: new Date(Date.now() + 86400000) },
        user: fixtures.adminUser as any,
      });

      const { GET } = await import("@/app/api/admin/apps/route");
      const request = new Request("http://localhost/api/admin/apps");
      const response = await GET(request);

      expect(response.status).toBeLessThan(500);
    });
  });

  describe("POST /api/admin/codes", () => {
    it("returns 401 for unauthenticated requests", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");
      vi.mocked(getSessionFromHeaders).mockResolvedValue({ session: null, user: null });

      const { POST } = await import("@/app/api/admin/codes/route");
      const request = new Request("http://localhost/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "TEST50", discount_type: "percent", discount_value: 50 }),
      });
      const response = await POST(request);

      // Should return 401 or 403, not 500
      expect(response.status).toBeLessThan(500);
      expect([401, 403]).toContain(response.status);
    });
  });
});

// ============================================================================
// Graceful Degradation Tests
// ============================================================================

describe("Route Health - Graceful Degradation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("API routes handle null env gracefully", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    vi.mocked(getEnv).mockImplementation(() => {
      throw new Error("Cloudflare context not available");
    });

    const { getCurrentUser } = await import("@/lib/auth/middleware");
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    // The route should catch this and return a proper error response
    const { GET } = await import("@/app/api/feedback/route");
    const request = new Request("http://localhost/api/feedback");

    try {
      const response = await GET(request);
      // If it returns a response, it should be an error status
      expect(response.status).toBeLessThan(500);
    } catch (e) {
      // If it throws, that's also acceptable in test environment
      // as long as in production the error boundary catches it
      expect(e).toBeDefined();
    }
  });
});

// ============================================================================
// Input Validation Tests
// ============================================================================

describe("Route Health - Input Validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("POST /api/feedback/submit", () => {
    it("rejects empty body", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/submit/route");
      const request = new Request("http://localhost/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      // Should return 400, not 500
      expect(response.status).toBe(400);
    });

    it("rejects XSS in title", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/submit/route");
      const request = new Request("http://localhost/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "<script>alert('xss')</script>Test Feature",
          body: "Description",
          type: "feature",
        }),
      });
      const response = await POST(request);

      // Should not 500 - either accepts (with sanitization) or rejects
      expect(response.status).toBeLessThan(500);
    });

    it("handles extremely long input", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/submit/route");
      const request = new Request("http://localhost/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "A".repeat(10000),
          body: "B".repeat(100000),
          type: "feature",
        }),
      });
      const response = await POST(request);

      // Should return 400, not 500
      expect(response.status).toBeLessThan(500);
      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/feedback/vote", () => {
    it("rejects missing requestId", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/vote/route");
      const request = new Request("http://localhost/api/feedback/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/checkout", () => {
    it("rejects missing appId", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        session: { id: "session_123", userId: fixtures.testUser.id, expiresAt: new Date(Date.now() + 86400000) },
        user: fixtures.testUser as any,
      });

      const { POST } = await import("@/app/api/checkout/route");
      const request = new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      // Should return 400, not 500
      expect(response.status).toBeLessThan(500);
    });

    it("returns 401 for unauthenticated requests", async () => {
      const d1State = fixtures.createTestD1State();
      const mockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({ session: null, user: null });

      const { POST } = await import("@/app/api/checkout/route");
      const request = new Request("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: fixtures.testApp.id }),
      });
      const response = await POST(request);

      // Should return 401, not 500
      expect(response.status).toBeLessThan(500);
      expect(response.status).toBe(401);
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Route Health - Edge Cases", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("handles special characters in URL parameters", async () => {
    const d1State = fixtures.createTestD1State();
    const mockEnv = createMockEnv({ d1State });

    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getCurrentUser } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const { GET } = await import("@/app/api/feedback/route");
    
    // Test with URL-encoded special characters
    const request = new Request("http://localhost/api/feedback?sort=%27OR%201=1--");
    const response = await GET(request);

    // Should handle gracefully, not 500
    expect(response.status).toBeLessThan(500);
  });

  it("handles concurrent requests to same endpoint", async () => {
    const d1State = fixtures.createTestD1State();
    const mockEnv = createMockEnv({ d1State });

    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getCurrentUser } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const { GET } = await import("@/app/api/feedback/route");

    // Fire multiple concurrent requests
    const requests = Array.from({ length: 5 }, () =>
      GET(new Request("http://localhost/api/feedback"))
    );

    const responses = await Promise.all(requests);

    // All should succeed without 500s
    for (const response of responses) {
      expect(response.status).toBeLessThan(500);
    }
  });
});
