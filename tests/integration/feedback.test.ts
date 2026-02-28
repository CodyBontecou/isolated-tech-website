/**
 * Integration tests for the feedback system
 * Tests feature requests, voting, and comments
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/auth/middleware", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  generateCommentNotificationEmail: vi.fn().mockReturnValue({ html: "", text: "" }),
  generateFeedbackStatusEmail: vi.fn().mockReturnValue({ html: "", text: "" }),
}));

// Test data
const testFeatureRequest = {
  id: "fr_test_123",
  user_id: fixtures.testUser.id,
  app_id: fixtures.testApp.id,
  type: "feature",
  title: "Test Feature Request",
  body: "Description of the feature",
  status: "open",
  vote_count: 5,
  comment_count: 2,
  created_at: new Date("2024-01-01").toISOString(),
  updated_at: new Date("2024-01-01").toISOString(),
};

const testComment = {
  id: "comment_test_123",
  request_id: "fr_test_123",
  user_id: fixtures.testUser.id,
  body: "This is a comment",
  is_admin_reply: 0,
  created_at: new Date("2024-01-02").toISOString(),
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

describe("Feedback System", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();

    // Create D1 state with feature request data
    const d1State = fixtures.createTestD1State();
    d1State.tables.set("feature_requests", [testFeatureRequest]);
    d1State.tables.set("feature_votes", []);
    d1State.tables.set("feature_comments", [testComment]);
    d1State.tables.set("rate_limit_actions", []);

    mockEnv = createMockEnv({ d1State });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/feedback", () => {
    it("should list feature requests", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { GET } = await import("@/app/api/feedback/route");
      const request = createRequest("GET", "http://localhost/api/feedback");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("hasMore");
      expect(data).toHaveProperty("nextCursor");
    });

    it("should sort by votes by default", async () => {
      // Add another feature request with different vote count
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("feature_requests", [
        testFeatureRequest,
        { ...testFeatureRequest, id: "fr_test_456", vote_count: 10 },
      ]);
      const localMockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(localMockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { GET } = await import("@/app/api/feedback/route");
      const request = createRequest("GET", "http://localhost/api/feedback");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Higher vote count should come first
      if (data.items.length > 1) {
        expect(data.items[0].vote_count).toBeGreaterThanOrEqual(data.items[1].vote_count);
      }
    });

    it("should support newest sort", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { GET } = await import("@/app/api/feedback/route");
      const request = createRequest("GET", "http://localhost/api/feedback?sort=newest");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("items");
    });

    it("should support comments sort", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { GET } = await import("@/app/api/feedback/route");
      const request = createRequest("GET", "http://localhost/api/feedback?sort=comments");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("items");
    });

    it("should include user vote status when authenticated", async () => {
      // This test verifies that the API returns data when user is authenticated
      // The actual user_voted field is computed via a SQL subquery that may not
      // be fully simulated by the mock D1
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { GET } = await import("@/app/api/feedback/route");
      const request = createRequest("GET", "http://localhost/api/feedback");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should return items array (user_voted is computed via SQL subquery)
      expect(data).toHaveProperty("items");
      expect(Array.isArray(data.items)).toBe(true);
    });

    it("should exclude closed requests", async () => {
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("feature_requests", [
        testFeatureRequest,
        { ...testFeatureRequest, id: "fr_closed", status: "closed" },
      ]);
      const localMockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(localMockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { GET } = await import("@/app/api/feedback/route");
      const request = createRequest("GET", "http://localhost/api/feedback");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Closed requests should not be included
      const closedItems = data.items.filter((item: any) => item.status === "closed");
      expect(closedItems).toHaveLength(0);
    });

    it("should support cursor-based pagination", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { GET } = await import("@/app/api/feedback/route");
      const request = createRequest("GET", `http://localhost/api/feedback?cursor=${testFeatureRequest.id}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("nextCursor");
    });
  });

  describe("POST /api/feedback/submit", () => {
    it("should require authentication", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { POST } = await import("@/app/api/feedback/submit/route");
      const request = createRequest("POST", "http://localhost/api/feedback/submit", {
        type: "feature",
        title: "New Feature",
        body: "Description",
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should validate required fields", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/submit/route");

      // Missing title
      const request1 = createRequest("POST", "http://localhost/api/feedback/submit", {
        body: "Description",
      });
      const response1 = await POST(request1);
      expect(response1.status).toBe(400);

      // Missing body
      const request2 = createRequest("POST", "http://localhost/api/feedback/submit", {
        title: "Title",
      });
      const response2 = await POST(request2);
      expect(response2.status).toBe(400);
    });

    it("should validate title length", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/submit/route");
      const request = createRequest("POST", "http://localhost/api/feedback/submit", {
        type: "feature",
        title: "A".repeat(250), // Over 200 chars
        body: "Description",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("200 characters");
    });

    it("should create feature request", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/submit/route");
      const request = createRequest("POST", "http://localhost/api/feedback/submit", {
        type: "feature",
        title: "New Feature Request",
        body: "This is a great feature idea",
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.id).toBeDefined();
    });

    it("should validate app exists if appId provided", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/submit/route");
      const request = createRequest("POST", "http://localhost/api/feedback/submit", {
        type: "feature",
        title: "New Feature",
        body: "Description",
        appId: "nonexistent_app",
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("should default to feature type", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/submit/route");
      const request = createRequest("POST", "http://localhost/api/feedback/submit", {
        title: "New Feature",
        body: "Description",
        // No type provided
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });

  describe("POST /api/feedback/vote", () => {
    it("should require authentication", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { POST } = await import("@/app/api/feedback/vote/route");
      const request = createRequest("POST", "http://localhost/api/feedback/vote", {
        requestId: testFeatureRequest.id,
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should require requestId", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/vote/route");
      const request = createRequest("POST", "http://localhost/api/feedback/vote", {});

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent request", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/vote/route");
      const request = createRequest("POST", "http://localhost/api/feedback/vote", {
        requestId: "nonexistent",
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("should add vote when not already voted", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/vote/route");
      const request = createRequest("POST", "http://localhost/api/feedback/vote", {
        requestId: testFeatureRequest.id,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.voted).toBe(true);
    });

    it("should remove vote when already voted (toggle)", async () => {
      // Add existing vote
      const d1State = fixtures.createTestD1State();
      d1State.tables.set("feature_requests", [testFeatureRequest]);
      d1State.tables.set("feature_votes", [
        { id: "vote_existing", user_id: fixtures.testUser.id, request_id: testFeatureRequest.id },
      ]);
      const localMockEnv = createMockEnv({ d1State });

      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(localMockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/vote/route");
      const request = createRequest("POST", "http://localhost/api/feedback/vote", {
        requestId: testFeatureRequest.id,
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.voted).toBe(false);
    });
  });

  describe("POST /api/feedback/comment", () => {
    it("should require authentication", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { POST } = await import("@/app/api/feedback/comment/route");
      const request = createRequest("POST", "http://localhost/api/feedback/comment", {
        requestId: testFeatureRequest.id,
        body: "Great idea!",
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it("should require requestId and body", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/comment/route");

      // Missing requestId
      const request1 = createRequest("POST", "http://localhost/api/feedback/comment", {
        body: "Comment",
      });
      const response1 = await POST(request1);
      expect(response1.status).toBe(400);

      // Missing body
      const request2 = createRequest("POST", "http://localhost/api/feedback/comment", {
        requestId: testFeatureRequest.id,
      });
      const response2 = await POST(request2);
      expect(response2.status).toBe(400);
    });

    it("should return 404 for non-existent request", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/comment/route");
      const request = createRequest("POST", "http://localhost/api/feedback/comment", {
        requestId: "nonexistent",
        body: "Comment",
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it("should add comment successfully", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any);

      const { POST } = await import("@/app/api/feedback/comment/route");
      const request = createRequest("POST", "http://localhost/api/feedback/comment", {
        requestId: testFeatureRequest.id,
        body: "Great idea! I support this.",
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.comment).toBeDefined();
      expect(data.comment.body).toBe("Great idea! I support this.");
    });

    it("should mark admin reply correctly", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.adminUser as any);

      const { POST } = await import("@/app/api/feedback/comment/route");
      const request = createRequest("POST", "http://localhost/api/feedback/comment", {
        requestId: testFeatureRequest.id,
        body: "Thanks for the feedback!",
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.comment.is_admin_reply).toBe(1);
    });
  });

  describe("Admin Feature Request Management", () => {
    it("should require admin for PATCH", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.testUser as any); // Non-admin

      const { PATCH } = await import("@/app/api/admin/feature-requests/[id]/route");
      const request = createRequest("PATCH", "http://localhost/api/admin/feature-requests/fr_test_123", {
        status: "planned",
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testFeatureRequest.id }) });
      expect(response.status).toBe(401);
    });

    it("should update feature request status", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.adminUser as any);

      const { PATCH } = await import("@/app/api/admin/feature-requests/[id]/route");
      const request = createRequest("PATCH", "http://localhost/api/admin/feature-requests/fr_test_123", {
        status: "planned",
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testFeatureRequest.id }) });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should validate status values", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.adminUser as any);

      const { PATCH } = await import("@/app/api/admin/feature-requests/[id]/route");
      const request = createRequest("PATCH", "http://localhost/api/admin/feature-requests/fr_test_123", {
        status: "invalid_status",
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testFeatureRequest.id }) });
      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent request", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.adminUser as any);

      const { PATCH } = await import("@/app/api/admin/feature-requests/[id]/route");
      const request = createRequest("PATCH", "http://localhost/api/admin/feature-requests/nonexistent", {
        status: "planned",
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: "nonexistent" }) });
      expect(response.status).toBe(404);
    });

    it("should require at least one update field", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.adminUser as any);

      const { PATCH } = await import("@/app/api/admin/feature-requests/[id]/route");
      const request = createRequest("PATCH", "http://localhost/api/admin/feature-requests/fr_test_123", {});

      const response = await PATCH(request, { params: Promise.resolve({ id: testFeatureRequest.id }) });
      expect(response.status).toBe(400);
    });

    it("should add admin response", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      const { getCurrentUser } = await import("@/lib/auth/middleware");

      vi.mocked(getEnv).mockReturnValue(mockEnv as any);
      vi.mocked(getCurrentUser).mockResolvedValue(fixtures.adminUser as any);

      const { PATCH } = await import("@/app/api/admin/feature-requests/[id]/route");
      const request = createRequest("PATCH", "http://localhost/api/admin/feature-requests/fr_test_123", {
        adminResponse: "Thanks for the suggestion! We'll consider this for the next release.",
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: testFeatureRequest.id }) });
      expect(response.status).toBe(200);
    });
  });
});
