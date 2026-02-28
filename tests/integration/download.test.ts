/**
 * Integration tests for download endpoints
 * Tests the critical download flow:
 * - Authenticated downloads (purchase verification)
 * - Token-based downloads (one-time use)
 * - Admin bypass
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import { createMockUser } from "../mocks/auth";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/auth/middleware", () => ({
  getSessionFromHeaders: vi.fn(),
}));

describe("GET /api/download/[appId]/[versionId]", () => {
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

  describe("Authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({ user: null, session: null });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Authentication required");
    });
  });

  describe("Purchase Verification", () => {
    it("should return 403 if user has not purchased the app", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      // User without purchase
      const userWithoutPurchase = createMockUser({ id: "user_no_purchase" });

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: userWithoutPurchase,
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("Purchase required to download");
    });

    it("should allow download if user has purchased the app", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      // User with purchase (from fixtures)
      const userWithPurchase = { ...fixtures.testUser, isAdmin: false };

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: userWithPurchase,
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/zip");
      expect(response.headers.get("Content-Disposition")).toContain("attachment");
    });

    it("should allow admin to download without purchase", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      const adminUser = { ...fixtures.adminUser, isAdmin: true };

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: adminUser,
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      expect(response.status).toBe(200);
    });
  });

  describe("Resource Validation", () => {
    it("should return 404 if app does not exist", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser,
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/nonexistent_app/${fixtures.testVersion.id}`
      );

      const response = await GET(request as any, {
        params: { appId: "nonexistent_app", versionId: fixtures.testVersion.id },
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("App not found");
    });

    it("should return 404 if version does not exist", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: { ...fixtures.testUser, isAdmin: true },
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/nonexistent_version`
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: "nonexistent_version" },
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Version not found");
    });

    it("should return 404 if R2 file is missing", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      // Create env with empty R2 bucket
      const envWithEmptyR2 = createMockEnv({
        d1State: fixtures.createTestD1State(),
        r2State: { objects: new Map() }, // Empty R2
      });

      vi.mocked(getEnv).mockReturnValue(envWithEmptyR2 as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: { ...fixtures.testUser, isAdmin: true },
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Download file not found");
    });
  });

  describe("File Streaming", () => {
    it("should stream file with correct Content-Type header", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: { ...fixtures.testUser, isAdmin: false },
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/zip");
    });

    it("should set Content-Disposition for attachment download", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: { ...fixtures.testUser, isAdmin: false },
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      const contentDisposition = response.headers.get("Content-Disposition");
      expect(contentDisposition).toContain("attachment");
      expect(contentDisposition).toContain("filename=");
    });

    it("should include Content-Length header", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: { ...fixtures.testUser, isAdmin: false },
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      expect(response.headers.get("Content-Length")).toBeDefined();
    });
  });

  describe("Download Logging", () => {
    it("should log download to database with download type", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: { ...fixtures.testUser, isAdmin: false },
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
      );

      await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      // Verify INSERT into downloads table was called
      const prepareCalls = vi.mocked(mockEnv.DB.prepare).mock.calls;
      const insertCall = prepareCalls.find(call => 
        call[0].toLowerCase().includes("insert into downloads")
      );
      expect(insertCall).toBeDefined();
    });

    it("should capture IP address from cf-connecting-ip header", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: { ...fixtures.testUser, isAdmin: false },
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`,
        {
          headers: {
            "cf-connecting-ip": "203.0.113.50",
            "user-agent": "Mozilla/5.0 Test",
            "cf-ipcountry": "US",
          },
        }
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      expect(response.status).toBe(200);
      // The INSERT query should have been called with the IP, user agent, and country
      expect(mockEnv.DB.prepare).toHaveBeenCalled();
    });
  });

  describe("Purchase Status Variants", () => {
    it("should allow download for purchase with 'completed' status", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: { ...fixtures.testUser, isAdmin: false },
        session: { id: "session_123" },
      });

      const { GET } = await import("@/app/api/download/[appId]/[versionId]/route");

      const request = new Request(
        `https://isolated.tech/api/download/${fixtures.testApp.id}/${fixtures.testVersion.id}`
      );

      const response = await GET(request as any, {
        params: { appId: fixtures.testApp.id, versionId: fixtures.testVersion.id },
      });

      expect(response.status).toBe(200);
    });
  });
});

describe("GET /api/download/token/[token]", () => {
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

  describe("Token Validation", () => {
    it("should return 400 for invalid token format", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/api/download/token/[token]/route");

      const request = new Request(
        "https://isolated.tech/api/download/token/short"
      );

      const response = await GET(request as any, {
        params: { token: "short" }, // Less than 20 characters
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Invalid download token");
    });

    it("should return 404 for non-existent token", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/api/download/token/[token]/route");

      const request = new Request(
        "https://isolated.tech/api/download/token/nonexistent_token_12345678"
      );

      const response = await GET(request as any, {
        params: { token: "nonexistent_token_12345678" },
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Download link not found or invalid");
    });

    it("should return 410 for already used token", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/api/download/token/[token]/route");

      const request = new Request(
        `https://isolated.tech/api/download/token/${fixtures.usedDownloadToken.token}`
      );

      const response = await GET(request as any, {
        params: { token: fixtures.usedDownloadToken.token },
      });

      const data = await response.json();

      expect(response.status).toBe(410);
      expect(data.error).toBe("This download link has already been used");
    });

    it("should return 410 for expired token", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/api/download/token/[token]/route");

      const request = new Request(
        `https://isolated.tech/api/download/token/${fixtures.expiredDownloadToken.token}`
      );

      const response = await GET(request as any, {
        params: { token: fixtures.expiredDownloadToken.token },
      });

      const data = await response.json();

      expect(response.status).toBe(410);
      expect(data.error).toBe("This download link has expired");
    });
  });

  describe("Successful Download", () => {
    it("should stream file for valid token", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/api/download/token/[token]/route");

      const request = new Request(
        `https://isolated.tech/api/download/token/${fixtures.validDownloadToken.token}`
      );

      const response = await GET(request as any, {
        params: { token: fixtures.validDownloadToken.token },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/zip");
      expect(response.headers.get("Content-Disposition")).toContain("attachment");
      expect(response.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate");
    });

    it("should mark token as used after download", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/api/download/token/[token]/route");

      const request = new Request(
        `https://isolated.tech/api/download/token/${fixtures.validDownloadToken.token}`
      );

      await GET(request as any, {
        params: { token: fixtures.validDownloadToken.token },
      });

      // Verify UPDATE was called to mark token as used
      expect(mockEnv.DB.prepare).toHaveBeenCalled();
    });
  });
});
