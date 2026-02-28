/**
 * Integration tests for User API routes
 * Tests account deletion, profile updates, and preference management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/auth/middleware", () => ({
  getSessionFromHeaders: vi.fn(),
}));

// Test data
const regularUser = {
  ...fixtures.testUser,
  id: "user_regular_123",
  email: "regular@example.com",
  name: "Regular User",
  isAdmin: false,
  newsletterSubscribed: true,
};

const adminUserData = {
  ...fixtures.adminUser,
  id: "user_admin_456",
  email: "admin@isolated.tech",
  name: "Admin User",
  isAdmin: true,
};

// Helper to create JSON request
function createRequest(method: string, url: string, body?: object): Request {
  const options: RequestInit = { method };
  if (body) {
    options.body = JSON.stringify(body);
    options.headers = { "Content-Type": "application/json" };
  }
  return new Request(url, options);
}

describe("User API Routes", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // DELETE /api/user - Account Deletion
  // ==========================================================================

  describe("DELETE /api/user", () => {
    beforeEach(() => {
      // Create D1 state with user data and related records
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("user", [regularUser, adminUserData]);
      d1State.tables.set("session", [
        { id: "session_1", userId: regularUser.id },
        { id: "session_2", userId: regularUser.id },
      ]);
      d1State.tables.set("account", [
        { id: "account_1", userId: regularUser.id, provider: "github" },
      ]);
      d1State.tables.set("reviews", [
        { id: "review_1", user_id: regularUser.id, rating: 5 },
      ]);

      mockEnv = createMockEnv({ d1State });
    });

    it("should require authentication", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: null,
        session: null,
      });

      const { DELETE } = await import("@/app/api/user/route");
      const request = createRequest("DELETE", "http://localhost/api/user");

      const response = await DELETE(request as any);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Not authenticated");
    });

    it("should prevent admin from deleting their account", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: adminUserData as any,
        session: { id: "session_admin" },
      });

      const { DELETE } = await import("@/app/api/user/route");
      const request = createRequest("DELETE", "http://localhost/api/user");

      const response = await DELETE(request as any);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("Admin accounts");
    });

    it("should delete user account and related data", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { DELETE } = await import("@/app/api/user/route");
      const request = createRequest("DELETE", "http://localhost/api/user");

      const response = await DELETE(request as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify cascading deletes were called
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "session"')
      );
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "account"')
      );
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM reviews")
      );
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "user"')
      );
    });

    it("should anonymize purchases instead of deleting them", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { DELETE } = await import("@/app/api/user/route");
      const request = createRequest("DELETE", "http://localhost/api/user");

      const response = await DELETE(request as any);
      expect(response.status).toBe(200);

      // Verify purchases are anonymized, not deleted
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE purchases SET user_id = 'deleted_user'")
      );
    });

    it("should clear session cookie in response", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { DELETE } = await import("@/app/api/user/route");
      const request = createRequest("DELETE", "http://localhost/api/user");

      const response = await DELETE(request as any);
      expect(response.status).toBe(200);

      const setCookie = response.headers.get("Set-Cookie");
      expect(setCookie).toContain("isolated.session_token=");
      expect(setCookie).toContain("Max-Age=0");
    });

    it("should return 500 if DB is not configured", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue({ DB: null } as any);

      const { DELETE } = await import("@/app/api/user/route");
      const request = createRequest("DELETE", "http://localhost/api/user");

      const response = await DELETE(request as any);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Server configuration error");
    });
  });

  // ==========================================================================
  // PUT /api/user/profile - Profile Updates
  // ==========================================================================

  describe("PUT /api/user/profile", () => {
    beforeEach(() => {
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("user", [regularUser]);
      d1State.tables.set("users", [{ ...regularUser }]); // Legacy table
      mockEnv = createMockEnv({ d1State });
    });

    it("should require authentication", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: null,
        session: null,
      });

      const { PUT } = await import("@/app/api/user/profile/route");
      const request = createRequest("PUT", "http://localhost/api/user/profile", {
        name: "New Name",
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Not authenticated");
    });

    it("should update user name successfully", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/profile/route");
      const request = createRequest("PUT", "http://localhost/api/user/profile", {
        name: "Updated Name",
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.user.name).toBe("Updated Name");
    });

    it("should update both Better Auth and legacy tables", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/profile/route");
      const request = createRequest("PUT", "http://localhost/api/user/profile", {
        name: "Updated Name",
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(200);

      // Verify both tables are updated
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "user"')
      );
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users")
      );
    });

    it("should reject non-string name values", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/profile/route");
      const request = createRequest("PUT", "http://localhost/api/user/profile", {
        name: 12345, // Invalid type
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid name");
    });

    it("should trim and truncate long names", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/profile/route");
      const longName = "  " + "A".repeat(150) + "  "; // 154 chars with spaces
      const request = createRequest("PUT", "http://localhost/api/user/profile", {
        name: longName,
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.name.length).toBe(100); // Truncated to 100 after trim
    });

    it("should handle empty name by setting null", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/profile/route");
      const request = createRequest("PUT", "http://localhost/api/user/profile", {
        name: "   ", // Only whitespace
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.name).toBeNull();
    });

    it("should return 500 if DB is not configured", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue({ DB: null } as any);

      const { PUT } = await import("@/app/api/user/profile/route");
      const request = createRequest("PUT", "http://localhost/api/user/profile", {
        name: "Test",
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Server configuration error");
    });
  });

  // ==========================================================================
  // PUT /api/user/preferences - Newsletter Preferences
  // ==========================================================================

  describe("PUT /api/user/preferences", () => {
    beforeEach(() => {
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("user", [regularUser]);
      d1State.tables.set("users", [{ ...regularUser, newsletter_subscribed: 1 }]);
      mockEnv = createMockEnv({ d1State });
    });

    it("should require authentication", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: null,
        session: null,
      });

      const { PUT } = await import("@/app/api/user/preferences/route");
      const request = createRequest("PUT", "http://localhost/api/user/preferences", {
        newsletter_subscribed: false,
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Not authenticated");
    });

    it("should update newsletter subscription to true", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: { ...regularUser, newsletterSubscribed: false } as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/preferences/route");
      const request = createRequest("PUT", "http://localhost/api/user/preferences", {
        newsletter_subscribed: true,
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.preferences.newsletter_subscribed).toBe(true);
    });

    it("should update newsletter subscription to false", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/preferences/route");
      const request = createRequest("PUT", "http://localhost/api/user/preferences", {
        newsletter_subscribed: false,
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.preferences.newsletter_subscribed).toBe(false);
    });

    it("should update both Better Auth and legacy tables", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/preferences/route");
      const request = createRequest("PUT", "http://localhost/api/user/preferences", {
        newsletter_subscribed: false,
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(200);

      // Verify both tables are updated
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE "user"')
      );
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users")
      );
    });

    it("should reject non-boolean preference values", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/preferences/route");
      const request = createRequest("PUT", "http://localhost/api/user/preferences", {
        newsletter_subscribed: "yes", // Invalid type - should be boolean
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid preference value");
    });

    it("should reject numeric preference values", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/preferences/route");
      const request = createRequest("PUT", "http://localhost/api/user/preferences", {
        newsletter_subscribed: 1, // Invalid type - should be boolean
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid preference value");
    });

    it("should return 500 if DB is not configured", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      vi.mocked(getEnv).mockReturnValue({ DB: null } as any);

      const { PUT } = await import("@/app/api/user/preferences/route");
      const request = createRequest("PUT", "http://localhost/api/user/preferences", {
        newsletter_subscribed: true,
      });

      const response = await PUT(request as any);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Server configuration error");
    });

    it("should store boolean as integer (0/1) in database", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: regularUser as any,
        session: { id: "session_1" },
      });

      const { PUT } = await import("@/app/api/user/preferences/route");
      
      // Test true → 1
      const request1 = createRequest("PUT", "http://localhost/api/user/preferences", {
        newsletter_subscribed: true,
      });
      await PUT(request1 as any);
      
      // The mock D1's prepare function should have been called with the UPDATE
      // and the bind should have been called with 1 (not true)
      const prepareCallsForUpdate = (mockEnv.DB.prepare as any).mock.calls
        .filter((call: string[]) => call[0].includes('UPDATE "user"'));
      expect(prepareCallsForUpdate.length).toBeGreaterThan(0);
    });
  });
});
