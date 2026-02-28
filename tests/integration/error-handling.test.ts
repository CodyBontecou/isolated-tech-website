/**
 * Integration tests for error handling
 * Tests graceful degradation and error responses across the app
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockEnv, createMockD1, createMockR2 } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/auth/middleware", () => ({
  getSessionFromHeaders: vi.fn(),
}));

describe("Database Failures", () => {
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

  it("should handle D1 query failure gracefully", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    // Mock DB that throws on query
    const failingDb = {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          all: vi.fn().mockRejectedValue(new Error("D1 query timeout")),
          first: vi.fn().mockRejectedValue(new Error("D1 query timeout")),
          run: vi.fn().mockRejectedValue(new Error("D1 query timeout")),
        })),
      })),
    };

    vi.mocked(getEnv).mockReturnValue({
      ...mockEnv,
      DB: failingDb as any,
    } as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/apps/route");
    const request = new Request("https://isolated.tech/api/admin/apps");
    const response = await GET(request as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBeDefined();
    // Should not leak internal error details
    expect(data.error).not.toContain("D1");
    expect(data.error).not.toContain("timeout");
  });

  it("should return 500 with appropriate message for DB errors", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const failingDb = {
      prepare: vi.fn().mockImplementation(() => {
        throw new Error("SQLITE_BUSY");
      }),
    };

    vi.mocked(getEnv).mockReturnValue({
      ...mockEnv,
      DB: failingDb as any,
    } as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/codes/route");
    const request = new Request("https://isolated.tech/api/admin/codes");
    const response = await GET(request as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to fetch codes");
  });

  it("should not leak internal error details in response", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    // Simulate detailed internal error
    const failingDb = {
      prepare: vi.fn().mockImplementation(() => {
        throw new Error("SQLITE constraint violation: UNIQUE constraint failed on column 'email'");
      }),
    };

    vi.mocked(getEnv).mockReturnValue({
      ...mockEnv,
      DB: failingDb as any,
    } as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/apps/route");
    const request = new Request("https://isolated.tech/api/admin/apps");
    const response = await GET(request as any);

    const data = await response.json();
    // Response should not contain SQLITE, constraint, or column names
    expect(JSON.stringify(data)).not.toContain("SQLITE");
    expect(JSON.stringify(data)).not.toContain("constraint");
    expect(JSON.stringify(data)).not.toContain("column");
  });
});

describe("R2 Failures", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
      r2State: fixtures.createTestR2State(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle missing R2 files with 404", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.testUser },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

    const request = new Request("https://isolated.tech/api/download/app_test_123/version_missing_123");
    const params = { appId: fixtures.testApp.id, versionId: "version_missing_123" };
    
    const response = await GET(request as any, { params });

    // Should return 404 for missing file, not 500
    expect([404, 403]).toContain(response.status);
  });

  it("should handle R2 get failure gracefully", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    // Mock R2 that fails on get
    const failingR2 = {
      get: vi.fn().mockRejectedValue(new Error("R2 timeout")),
      put: vi.fn(),
      delete: vi.fn(),
    };

    vi.mocked(getEnv).mockReturnValue({
      ...mockEnv,
      APPS_BUCKET: failingR2 as any,
    } as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.testUser },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

    const request = new Request("https://isolated.tech/api/download/app_test_123/version_test_123");
    const params = { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id };
    
    const response = await GET(request as any, { params });

    // Should handle error gracefully - either 500 or appropriate error
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});

describe("Request Validation", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
    (mockEnv as any).ADMIN_API_KEY = "test_admin_api_key";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle malformed JSON with 400/500", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid json",
    });
    const response = await POST(request as any);

    // Should return error status, not crash
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("should handle missing required fields with 400", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/versions/route");

    const request = new Request("https://isolated.tech/api/admin/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing all required fields
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should handle invalid field types", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/codes/route");

    const request = new Request("https://isolated.tech/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: 12345, // Should be string
        discount_type: "percent",
        discount_value: "not a number", // Should be number
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("should handle empty request body", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    });
    const response = await POST(request as any);

    // Should handle gracefully
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("should handle oversized payloads gracefully", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/apps/route");

    // Create a very large description
    const largeDescription = "A".repeat(100000);
    
    const request = new Request("https://isolated.tech/api/admin/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test App",
        slug: "test-app-large",
        tagline: "A test application",
        platforms: "macos",
        description: largeDescription,
      }),
    });
    const response = await POST(request as any);

    // Should either succeed or reject with error, not crash
    expect([200, 400, 413, 500]).toContain(response.status);
  });
});

describe("Authentication Failures", () => {
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

  it("should return 403 for missing auth on admin routes", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: null,
      session: null,
    });

    const { GET } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps");
    const response = await GET(request as any);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("Admin access required");
  });

  it("should return 401 for invalid API key", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/api-keys/route");

    // Invalid API key should NOT fall back to session
    const request = new Request("https://isolated.tech/api/admin/api-keys", {
      headers: {
        "X-API-Key": "completely_invalid_key_that_doesnt_exist",
      },
    });
    const response = await GET(request as any);

    expect(response.status).toBe(401);
  });

  it("should handle expired sessions", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: null, // Expired session returns null
      session: null,
    });

    const { GET } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps");
    const response = await GET(request as any);

    expect(response.status).toBe(403);
  });
});

describe("Environment Configuration Errors", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle missing DB with 500", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue({
      AUTH_KV: {},
      // DB missing
    } as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps");
    const response = await GET(request as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Server configuration error");
  });

  it("should handle missing AUTH_KV with 500", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });

    vi.mocked(getEnv).mockReturnValue({
      DB: mockEnv.DB,
      // AUTH_KV missing
    } as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps");
    const response = await GET(request as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Server configuration error");
  });

  it("should handle null env gracefully", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(null as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: null,
      session: null,
    });

    const { GET } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps");
    const response = await GET(request as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Server configuration error");
  });
});

describe("Consistent Error Format", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
    (mockEnv as any).ADMIN_API_KEY = "test_admin_api_key";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return error in consistent format", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "A", // Invalid - too short
        slug: "a",
        tagline: "Short",
        platforms: "macos",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    
    // Check error format
    expect(data).toHaveProperty("error");
    expect(typeof data.error).toBe("string");
    expect(data.error.length).toBeGreaterThan(0);
  });

  it("should always have error field in error responses", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: null,
      session: null,
    });

    const routes = [
      { path: "/api/admin/apps", method: "GET" },
      { path: "/api/admin/codes", method: "GET" },
      { path: "/api/admin/api-keys", method: "GET" },
    ];

    for (const route of routes) {
      vi.resetModules();
      
      const { getEnv: getEnvAgain } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders: getSessionAgain } = await import("@/lib/auth/middleware");
      
      vi.mocked(getEnvAgain).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionAgain).mockResolvedValue({
        user: null,
        session: null,
      });

      const modulePath = route.path.replace("/api", "@/app/api") + "/route";
      const module = await import(modulePath);
      
      const request = new Request(`https://isolated.tech${route.path}`);
      const response = await module.GET(request as any);
      
      if (response.status >= 400) {
        const data = await response.json();
        expect(data).toHaveProperty("error");
        expect(typeof data.error).toBe("string");
      }
    }
  });
});
