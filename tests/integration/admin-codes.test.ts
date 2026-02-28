/**
 * Integration tests for admin discount code management
 * Tests code creation, listing, and validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/auth/middleware", () => ({
  getSessionFromHeaders: vi.fn(),
}));

describe("GET /api/admin/codes", () => {
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

  it("should require admin authentication", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: null,
      session: null,
    });

    const { GET } = await import("@/app/api/admin/codes/route");

    const request = new Request("https://isolated.tech/api/admin/codes");
    const response = await GET(request as any);

    expect(response.status).toBe(403);
  });

  it("should return 403 for non-admin users", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.testUser, isAdmin: false },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/codes/route");

    const request = new Request("https://isolated.tech/api/admin/codes");
    const response = await GET(request as any);

    expect(response.status).toBe(403);
  });

  it("should list all discount codes for admin", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/codes/route");

    const request = new Request("https://isolated.tech/api/admin/codes");
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.codes).toBeDefined();
    expect(Array.isArray(data.codes)).toBe(true);
  });

  it("should work with API key authentication", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);

    const { GET } = await import("@/app/api/admin/codes/route");

    const request = new Request("https://isolated.tech/api/admin/codes", {
      headers: {
        "X-API-Key": "test_admin_api_key",
      },
    });
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.codes).toBeDefined();
  });
});

describe("POST /api/admin/codes", () => {
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

  it("should require admin authentication", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: null,
      session: null,
    });

    const { POST } = await import("@/app/api/admin/codes/route");

    const request = new Request("https://isolated.tech/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "NEWCODE",
        discount_type: "percent",
        discount_value: 20,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(403);
  });

  it("should create percent discount code", async () => {
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
        code: "PERCENT20",
        discount_type: "percent",
        discount_value: 20,
        is_active: true,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.code.code).toBe("PERCENT20");
    expect(data.code.discount_type).toBe("percent");
    expect(data.code.discount_value).toBe(20);
  });

  it("should create fixed discount code", async () => {
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
        code: "FIXED10",
        discount_type: "fixed",
        discount_value: 1000, // $10
        is_active: true,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.code.discount_type).toBe("fixed");
    expect(data.code.discount_value).toBe(1000);
  });

  it("should convert code to uppercase", async () => {
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
        code: "lowercase",
        discount_type: "percent",
        discount_value: 10,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.code.code).toBe("LOWERCASE");
  });

  it("should validate code length", async () => {
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
        code: "A", // Too short
        discount_type: "percent",
        discount_value: 10,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("at least 2 characters");
  });

  it("should validate discount_type is percent or fixed", async () => {
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
        code: "INVALID",
        discount_type: "invalid_type",
        discount_value: 10,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid discount type");
  });

  it("should reject percent > 100", async () => {
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
        code: "TOOMUCH",
        discount_type: "percent",
        discount_value: 150, // Invalid
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid discount value");
  });

  it("should reject zero or negative discount", async () => {
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
        code: "ZERO",
        discount_type: "percent",
        discount_value: 0,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid discount value");
  });

  it("should reject duplicate code", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/codes/route");

    // Try to create with existing code
    const request = new Request("https://isolated.tech/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: fixtures.percentDiscountCode.code,
        discount_type: "percent",
        discount_value: 10,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("already exists");
  });

  it("should support optional app_id for app-specific codes", async () => {
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
        code: "APPONLY",
        discount_type: "percent",
        discount_value: 25,
        app_id: fixtures.testApp.id,
        is_active: true,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("should support optional max_uses limit", async () => {
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
        code: "LIMITED",
        discount_type: "percent",
        discount_value: 50,
        max_uses: 100,
        is_active: true,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("should support optional expires_at", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/codes/route");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const request = new Request("https://isolated.tech/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "EXPIRING",
        discount_type: "percent",
        discount_value: 15,
        expires_at: expiresAt,
        is_active: true,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

describe("Admin codes edge cases", () => {
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

  it("should handle missing DB configuration", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue({} as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/codes/route");

    const request = new Request("https://isolated.tech/api/admin/codes");
    const response = await GET(request as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Server configuration error");
  });

  it("should handle invalid JSON in POST", async () => {
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
      body: "not valid json",
    });
    const response = await POST(request as any);

    expect(response.status).toBe(500);
  });

  it("should work with API key for POST", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);

    const { POST } = await import("@/app/api/admin/codes/route");

    const request = new Request("https://isolated.tech/api/admin/codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "test_admin_api_key",
      },
      body: JSON.stringify({
        code: "APIKEY",
        discount_type: "percent",
        discount_value: 10,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
