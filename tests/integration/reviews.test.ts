/**
 * Integration tests for the reviews system
 * Tests review CRUD operations and rating validation
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
const testReview = {
  id: "review_test_123",
  user_id: fixtures.testUser.id,
  app_id: fixtures.testApp.id,
  purchase_id: fixtures.testPurchase.id,
  rating: 5,
  title: "Great app!",
  body: "This app is amazing, I use it every day.",
  is_approved: 1,
  created_at: new Date("2024-01-15").toISOString(),
  updated_at: new Date("2024-01-15").toISOString(),
};

const otherUser = {
  ...fixtures.testUser,
  id: "user_other_123",
  email: "other@example.com",
  name: "Other User",
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

describe("Reviews System", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();

    // Create D1 state with review data
    const d1State = fixtures.createTestD1State();
    d1State.tables.set("reviews", [testReview]);

    mockEnv = createMockEnv({ d1State });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/reviews", () => {
    it("should require authentication", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: null,
        session: null,
      });

      const { POST } = await import("@/app/api/reviews/route");
      const request = createRequest("POST", "http://localhost/api/reviews", {
        appId: fixtures.testApp.id,
        rating: 5,
        title: "Great!",
        body: "Love it.",
      });

      const response = await POST(request as any);
      expect(response.status).toBe(401);
    });

    it("should require app purchase", async () => {
      // Use a user without a purchase
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("purchases", []); // No purchases
      const localMockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(localMockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: otherUser as any,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/reviews/route");
      const request = createRequest("POST", "http://localhost/api/reviews", {
        appId: fixtures.testApp.id,
        rating: 5,
        title: "Great!",
        body: "Love it.",
      });

      const response = await POST(request as any);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("purchase");
    });

    it("should validate rating is required", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser as any,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/reviews/route");
      const request = createRequest("POST", "http://localhost/api/reviews", {
        appId: fixtures.testApp.id,
        // No rating
        title: "Great!",
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Rating");
    });

    it("should validate rating is between 1 and 5", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser as any,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/reviews/route");

      // Test rating too low
      const request1 = createRequest("POST", "http://localhost/api/reviews", {
        appId: fixtures.testApp.id,
        rating: 0,
      });
      const response1 = await POST(request1 as any);
      expect(response1.status).toBe(400);

      // Test rating too high
      const request2 = createRequest("POST", "http://localhost/api/reviews", {
        appId: fixtures.testApp.id,
        rating: 6,
      });
      const response2 = await POST(request2 as any);
      expect(response2.status).toBe(400);
    });

    it("should require appId", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser as any,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/reviews/route");
      const request = createRequest("POST", "http://localhost/api/reviews", {
        rating: 5,
        // No appId
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("App ID");
    });

    it("should create review successfully", async () => {
      // Use a user who has a purchase but no review yet
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("reviews", []); // No existing reviews
      d1State.tables.set("purchases", [
        { ...fixtures.testPurchase, user_id: otherUser.id },
      ]);
      const localMockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(localMockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: otherUser as any,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/reviews/route");
      const request = createRequest("POST", "http://localhost/api/reviews", {
        appId: fixtures.testApp.id,
        rating: 4,
        title: "Really good",
        body: "Works great for my workflow.",
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.review).toBeDefined();
      expect(data.review.rating).toBe(4);
    });

    it("should not allow duplicate reviews", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser as any,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/reviews/route");
      const request = createRequest("POST", "http://localhost/api/reviews", {
        appId: fixtures.testApp.id, // User already reviewed this app
        rating: 4,
        title: "Second review",
      });

      const response = await POST(request as any);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("already reviewed");
    });

    it("should truncate long titles and bodies", async () => {
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("reviews", []);
      d1State.tables.set("purchases", [
        { ...fixtures.testPurchase, user_id: otherUser.id },
      ]);
      const localMockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(localMockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: otherUser as any,
        session: { id: "session_123" },
      });

      const { POST } = await import("@/app/api/reviews/route");
      const request = createRequest("POST", "http://localhost/api/reviews", {
        appId: fixtures.testApp.id,
        rating: 5,
        title: "A".repeat(200), // Will be truncated to 100
        body: "B".repeat(3000), // Will be truncated to 2000
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);
    });
  });

  describe("PUT /api/reviews/[id]", () => {
    it("should require authentication", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: null,
        session: null,
      });

      const { PUT } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("PUT", "http://localhost/api/reviews/review_test_123", {
        rating: 4,
      });

      const response = await PUT(request as any, { params: { id: testReview.id } });
      expect(response.status).toBe(401);
    });

    it("should require ownership", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: otherUser as any, // Different user
        session: { id: "session_123" },
      });

      const { PUT } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("PUT", "http://localhost/api/reviews/review_test_123", {
        rating: 4,
      });

      const response = await PUT(request as any, { params: { id: testReview.id } });
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain("own reviews");
    });

    it("should return 404 for non-existent review", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser as any,
        session: { id: "session_123" },
      });

      const { PUT } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("PUT", "http://localhost/api/reviews/nonexistent", {
        rating: 4,
      });

      const response = await PUT(request as any, { params: { id: "nonexistent" } });
      expect(response.status).toBe(404);
    });

    it("should validate rating on update", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser as any,
        session: { id: "session_123" },
      });

      const { PUT } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("PUT", "http://localhost/api/reviews/review_test_123", {
        rating: 10, // Invalid
      });

      const response = await PUT(request as any, { params: { id: testReview.id } });
      expect(response.status).toBe(400);
    });

    it("should require at least one update field", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser as any,
        session: { id: "session_123" },
      });

      const { PUT } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("PUT", "http://localhost/api/reviews/review_test_123", {});

      const response = await PUT(request as any, { params: { id: testReview.id } });
      expect(response.status).toBe(400);
    });

    it("should update review successfully", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser as any,
        session: { id: "session_123" },
      });

      const { PUT } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("PUT", "http://localhost/api/reviews/review_test_123", {
        rating: 4,
        title: "Updated title",
        body: "Updated body text",
      });

      const response = await PUT(request as any, { params: { id: testReview.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("DELETE /api/reviews/[id]", () => {
    it("should require authentication", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: null,
        session: null,
      });

      const { DELETE } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("DELETE", "http://localhost/api/reviews/review_test_123");

      const response = await DELETE(request as any, { params: { id: testReview.id } });
      expect(response.status).toBe(401);
    });

    it("should require ownership for non-admin", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: otherUser as any, // Different user, not admin
        session: { id: "session_123" },
      });

      const { DELETE } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("DELETE", "http://localhost/api/reviews/review_test_123");

      const response = await DELETE(request as any, { params: { id: testReview.id } });
      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent review", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser as any,
        session: { id: "session_123" },
      });

      const { DELETE } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("DELETE", "http://localhost/api/reviews/nonexistent");

      const response = await DELETE(request as any, { params: { id: "nonexistent" } });
      expect(response.status).toBe(404);
    });

    it("should allow owner to delete review", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.testUser as any,
        session: { id: "session_123" },
      });

      const { DELETE } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("DELETE", "http://localhost/api/reviews/review_test_123");

      const response = await DELETE(request as any, { params: { id: testReview.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should allow admin to delete any review", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getSessionFromHeaders).mockResolvedValue({
        user: fixtures.adminUser as any, // Admin user
        session: { id: "session_123" },
      });

      const { DELETE } = await import("@/app/api/reviews/[id]/route");
      const request = createRequest("DELETE", "http://localhost/api/reviews/review_test_123");

      const response = await DELETE(request as any, { params: { id: testReview.id } });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
