/**
 * Integration tests for session validation
 * Tests Better Auth session middleware behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import { 
  createMockUser, 
  createMockSession,
  createExpiredSession,
  createAuthHeaders,
  createUnauthHeaders,
} from "../mocks/auth";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

// We'll mock createAuth to control Better Auth behavior
vi.mock("@/lib/auth", () => ({
  createAuth: vi.fn(),
}));

describe("getSessionFromHeaders", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return user for valid session cookie", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    const mockUser = createMockUser({ 
      id: "user_valid",
      email: "valid@example.com",
      name: "Valid User",
      isAdmin: false,
    });

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: mockUser,
          session: {
            id: "session_valid",
            userId: mockUser.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers = createAuthHeaders("valid_session_token");
    const result = await getSessionFromHeaders(headers, mockEnv as any);

    expect(result.user).not.toBeNull();
    expect(result.user?.id).toBe("user_valid");
    expect(result.user?.email).toBe("valid@example.com");
    expect(result.session).not.toBeNull();
    expect(result.session?.userId).toBe("user_valid");
  });

  it("should return null for missing cookie", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue(null),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers = createUnauthHeaders();
    const result = await getSessionFromHeaders(headers, mockEnv as any);

    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
  });

  it("should return null for invalid session token", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue(null),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers = createAuthHeaders("invalid_token_that_does_not_exist");
    const result = await getSessionFromHeaders(headers, mockEnv as any);

    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
  });

  it("should return null for expired session", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    // Better Auth returns null for expired sessions
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue(null),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers = createAuthHeaders("expired_session_token");
    const result = await getSessionFromHeaders(headers, mockEnv as any);

    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
  });

  it("should include isAdmin flag for admin users", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    const adminUser = createMockUser({ 
      id: "user_admin",
      email: "admin@isolated.tech",
      name: "Admin User",
      isAdmin: true,
    });

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: adminUser,
          session: {
            id: "session_admin",
            userId: adminUser.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers = createAuthHeaders("admin_session_token");
    const result = await getSessionFromHeaders(headers, mockEnv as any);

    expect(result.user).not.toBeNull();
    expect(result.user?.isAdmin).toBe(true);
  });

  it("should include user metadata (name, email, image)", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    const userWithMeta = createMockUser({ 
      id: "user_meta",
      email: "meta@example.com",
      name: "User With Metadata",
      image: "https://example.com/avatar.png",
      newsletterSubscribed: true,
    });

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: userWithMeta,
          session: {
            id: "session_meta",
            userId: userWithMeta.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers = createAuthHeaders("meta_session_token");
    const result = await getSessionFromHeaders(headers, mockEnv as any);

    expect(result.user).not.toBeNull();
    expect(result.user?.name).toBe("User With Metadata");
    expect(result.user?.email).toBe("meta@example.com");
    expect(result.user?.image).toBe("https://example.com/avatar.png");
    expect(result.user?.newsletterSubscribed).toBe(true);
  });

  it("should handle errors gracefully and return null", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockRejectedValue(new Error("Database error")),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers = createAuthHeaders("any_token");
    const result = await getSessionFromHeaders(headers, mockEnv as any);

    // Should gracefully handle error and return null
    expect(result.user).toBeNull();
    expect(result.session).toBeNull();
  });

  it("should transform session dates to proper Date objects", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    const mockUser = createMockUser({ id: "user_dates" });
    const expiresAt = new Date(Date.now() + 86400000);

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: mockUser,
          session: {
            id: "session_dates",
            userId: mockUser.id,
            expiresAt,
          },
        }),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers = createAuthHeaders("dates_token");
    const result = await getSessionFromHeaders(headers, mockEnv as any);

    expect(result.session).not.toBeNull();
    expect(result.session?.expiresAt).toBeInstanceOf(Date);
  });
});

describe("Session validation in protected routes", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
      r2State: fixtures.createTestR2State(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should pass session to route handlers correctly", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    const testUser = createMockUser({ id: fixtures.testUser.id }); // Use fixture user who has a purchase

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: testUser,
          session: {
            id: "session_route",
            userId: testUser.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
      },
    } as any);

    // Test with download route
    const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

    const request = new Request(
      `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
    );

    const response = await GET(request as any, {
      params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
    });

    // User has a purchase in fixtures, so should get 200
    expect(response.status).toBe(200);
  });
});

describe("Session cookie formats", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle cookie with isolated prefix", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    const mockUser = createMockUser({ id: "user_cookie" });

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: mockUser,
          session: {
            id: "session_cookie",
            userId: mockUser.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    // Cookie with 'isolated' prefix as configured in auth.ts
    const headers = new Headers();
    headers.set("cookie", "isolated.session_token=valid_token; other_cookie=value");
    
    const result = await getSessionFromHeaders(headers, mockEnv as any);

    expect(result.user).not.toBeNull();
  });

  it("should handle multiple cookies in header", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    const mockUser = createMockUser({ id: "user_multi" });

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue({
          user: mockUser,
          session: {
            id: "session_multi",
            userId: mockUser.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
        }),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers = new Headers();
    headers.set("cookie", "tracking=abc123; isolated.session_token=valid_token; analytics=xyz");
    
    const result = await getSessionFromHeaders(headers, mockEnv as any);

    expect(result.user).not.toBeNull();
    expect(result.user?.id).toBe("user_multi");
  });
});

describe("Better Auth integration", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
    // Add Better Auth required env vars
    (mockEnv as any).BETTER_AUTH_SECRET = "test_secret_key_for_better_auth";
    (mockEnv as any).APP_URL = "https://isolated.tech";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create auth instance per request", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue(null),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers1 = createAuthHeaders("token1");
    const headers2 = createAuthHeaders("token2");
    
    await getSessionFromHeaders(headers1, mockEnv as any);
    await getSessionFromHeaders(headers2, mockEnv as any);

    // createAuth should be called for each request
    expect(createAuth).toHaveBeenCalledTimes(2);
  });

  it("should pass environment to createAuth", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { createAuth } = await import("@/lib/auth");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(createAuth).mockReturnValue({
      api: {
        getSession: vi.fn().mockResolvedValue(null),
      },
    } as any);

    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const headers = createAuthHeaders("test_token");
    await getSessionFromHeaders(headers, mockEnv as any);

    expect(createAuth).toHaveBeenCalledWith(mockEnv);
  });
});
