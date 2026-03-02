/**
 * Integration tests for admin version management
 * Tests version creation, presigning, and upload flow
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

describe("POST /api/admin/versions/presign", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
    (mockEnv as any).ADMIN_API_KEY = "test_admin_api_key";
    (mockEnv as any).SUPERUSER_EMAILS = fixtures.adminUser.email;
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

    const { POST } = await import("@/app/api/admin/versions/presign/route");

    const request = new Request("https://isolated.tech/api/admin/versions/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId: fixtures.testApp.id,
        appSlug: fixtures.testApp.slug,
        version: "1.0.0",
        filename: "app.zip",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(403);
  });

  it("should return R2 key for valid upload", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/versions/presign/route");

    const request = new Request("https://isolated.tech/api/admin/versions/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId: fixtures.testApp.id,
        appSlug: "my-app",
        version: "2.0.0",
        filename: "my-app-2.0.0.zip",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.r2Key).toBe("apps/my-app/versions/2.0.0/my-app-2.0.0.zip");
  });

  it("should generate correct R2 key format", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/versions/presign/route");

    const request = new Request("https://isolated.tech/api/admin/versions/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId: "app_123",
        appSlug: "super-app",
        version: "3.1.4",
        filename: "SuperApp.dmg",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.r2Key).toContain("apps/super-app/versions/3.1.4/");
    expect(data.r2Key).toContain("SuperApp.dmg");
  });

  it("should require all fields", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/versions/presign/route");

    // Missing version
    const request = new Request("https://isolated.tech/api/admin/versions/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId: fixtures.testApp.id,
        appSlug: fixtures.testApp.slug,
        filename: "app.zip",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("should only allow .zip and .dmg files", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/versions/presign/route");

    const request = new Request("https://isolated.tech/api/admin/versions/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId: fixtures.testApp.id,
        appSlug: fixtures.testApp.slug,
        version: "1.0.0",
        filename: "malware.exe",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Only .zip and .dmg are allowed");
  });

  it("should sanitize special characters in filename", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/versions/presign/route");

    const request = new Request("https://isolated.tech/api/admin/versions/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId: fixtures.testApp.id,
        appSlug: fixtures.testApp.slug,
        version: "1.0.0",
        filename: "My App (v1.0).zip",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    // Special chars should be replaced with underscores
    expect(data.r2Key).not.toContain("(");
    expect(data.r2Key).not.toContain(")");
    expect(data.r2Key).not.toContain(" ");
  });
});

describe("POST /api/admin/versions", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
    (mockEnv as any).ADMIN_API_KEY = "test_admin_api_key";
    (mockEnv as any).SUPERUSER_EMAILS = fixtures.adminUser.email;
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

    const { POST } = await import("@/app/api/admin/versions/route");

    const request = new Request("https://isolated.tech/api/admin/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId: fixtures.testApp.id,
        version: "2.0.0",
        buildNumber: 100,
        r2Key: "apps/test/v2.zip",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(403);
  });

  it("should create version record with valid data", async () => {
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
        appId: fixtures.testApp.id,
        version: "2.0.0",
        buildNumber: 100,
        r2Key: "apps/test-app/versions/2.0.0/app.zip",
        fileSize: 1024 * 1024,
        releaseNotes: "New features and bug fixes",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.version.version).toBe("2.0.0");
    expect(data.version.buildNumber).toBe(100);
  });

  it("should validate required fields", async () => {
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
        appId: fixtures.testApp.id,
        // Missing version, buildNumber, r2Key
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("should validate version format (x.y.z)", async () => {
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
        appId: fixtures.testApp.id,
        version: "v2.0", // Invalid format
        buildNumber: 100,
        r2Key: "apps/test/v2.zip",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("Invalid version format");
  });

  it("should return 404 for non-existent app", async () => {
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
        appId: "non_existent_app",
        version: "1.0.0",
        buildNumber: 1,
        r2Key: "apps/fake/v1.zip",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("App not found");
  });

  it("should handle optional fields like signature", async () => {
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
        appId: fixtures.testApp.id,
        version: "3.0.0",
        buildNumber: 200,
        r2Key: "apps/test-app/versions/3.0.0/app.zip",
        minOsVersion: "14.0",
        releaseNotes: "Major update",
        signature: "edDSA_signature_here",
        fileSize: 2048000,
        binaryR2Key: "apps/test-app/versions/3.0.0/app.dmg",
        binaryFileSize: 1024000,
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});

describe("Admin versions edge cases", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
    (mockEnv as any).ADMIN_API_KEY = "test_admin_api_key";
    (mockEnv as any).SUPERUSER_EMAILS = fixtures.adminUser.email;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle missing DB configuration", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue({ AUTH_KV: mockEnv.AUTH_KV } as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/versions/route");

    const request = new Request("https://isolated.tech/api/admin/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appId: fixtures.testApp.id,
        version: "1.0.0",
        buildNumber: 1,
        r2Key: "apps/test/v1.zip",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Server configuration error");
  });

  it("should work with API key authentication", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);

    const { POST } = await import("@/app/api/admin/versions/presign/route");

    const request = new Request("https://isolated.tech/api/admin/versions/presign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": "test_admin_api_key",
      },
      body: JSON.stringify({
        appId: fixtures.testApp.id,
        appSlug: fixtures.testApp.slug,
        version: "1.0.0",
        filename: "app.zip",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.r2Key).toBeDefined();
  });
});
