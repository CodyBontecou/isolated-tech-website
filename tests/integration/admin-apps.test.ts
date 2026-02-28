/**
 * Integration tests for admin app management
 * Tests app creation, listing, and management
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

describe("GET /api/admin/apps", () => {
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

    const { GET } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps");
    const response = await GET(request as any);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Admin access required");
  });

  it("should return 403 for non-admin users", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.testUser, isAdmin: false },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps");
    const response = await GET(request as any);

    expect(response.status).toBe(403);
  });

  it("should list all apps for admin user", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { GET } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps");
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.apps).toBeDefined();
    expect(Array.isArray(data.apps)).toBe(true);
  });

  it("should work with API key authentication", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);

    const { GET } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps", {
      headers: {
        "X-API-Key": "test_admin_api_key",
      },
    });
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.apps).toBeDefined();
  });
});

describe("POST /api/admin/apps", () => {
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

    const { POST } = await import("@/app/api/admin/apps/route");

    const request = new Request("https://isolated.tech/api/admin/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New App",
        slug: "new-app",
        tagline: "A new application",
        platforms: "macos",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(403);
  });

  it("should create app with valid data", async () => {
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
        name: "New App",
        slug: "new-app",
        tagline: "A brand new application",
        platforms: "macos",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.app.name).toBe("New App");
    expect(data.app.slug).toBe("new-app");
    expect(data.app.id).toBeDefined();
  });

  it("should reject duplicate slugs", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/apps/route");

    // Try to create an app with existing slug
    const request = new Request("https://isolated.tech/api/admin/apps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate App",
        slug: fixtures.testApp.slug, // Already exists
        tagline: "This should fail",
        platforms: "macos",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("slug already exists");
  });

  it("should validate name is at least 2 characters", async () => {
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
        name: "A", // Too short
        slug: "short-name",
        tagline: "Valid tagline here",
        platforms: "macos",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Name must be at least 2 characters");
  });

  it("should validate slug format", async () => {
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
        name: "Valid Name",
        slug: "INVALID_SLUG!", // Invalid characters
        tagline: "Valid tagline",
        platforms: "macos",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("lowercase alphanumeric");
  });

  it("should validate tagline is at least 5 characters", async () => {
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
        name: "Valid Name",
        slug: "valid-slug",
        tagline: "Hi", // Too short
        platforms: "macos",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Tagline must be at least 5 characters");
  });

  it("should validate platforms is required", async () => {
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
        name: "Valid Name",
        slug: "valid-slug",
        tagline: "Valid tagline here",
        // platforms missing
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Platforms are required");
  });

  it("should handle optional fields", async () => {
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
        name: "Complete App",
        slug: "complete-app",
        tagline: "A complete application",
        platforms: "macos,ios",
        description: "Full description here",
        icon_url: "https://example.com/icon.png",
        min_price_cents: 999,
        suggested_price_cents: 1999,
        is_published: true,
        is_featured: true,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

describe("Admin apps edge cases", () => {
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

    // Return env without DB
    vi.mocked(getEnv).mockReturnValue({ AUTH_KV: mockEnv.AUTH_KV } as any);
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

  it("should handle invalid JSON in POST request", async () => {
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
      body: "not valid json",
    });
    const response = await POST(request as any);

    // Should return 500 due to JSON parse error
    expect(response.status).toBe(500);
  });
});
