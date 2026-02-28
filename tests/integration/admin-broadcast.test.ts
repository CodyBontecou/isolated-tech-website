/**
 * Integration tests for admin broadcast functionality
 * Tests email campaign creation and sending
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

// Mock email module
const mockSendEmail = vi.fn();
const mockLogEmail = vi.fn();
vi.mock("@/lib/email", () => ({
  sendEmail: mockSendEmail,
  logEmail: mockLogEmail,
}));

describe("POST /api/admin/broadcast", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
    mockSendEmail.mockReset();
    mockLogEmail.mockReset();
    mockSendEmail.mockResolvedValue({ messageId: "msg_123" });
    mockLogEmail.mockResolvedValue(undefined);
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

    const { POST } = await import("@/app/api/admin/broadcast/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "newsletter",
        subject: "Test Subject",
        body: "Test body",
      }),
    });
    const response = await POST(request as any);

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

    const { POST } = await import("@/app/api/admin/broadcast/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "newsletter",
        subject: "Test Subject",
        body: "Test body",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(403);
  });

  it("should require subject field", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/broadcast/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "newsletter",
        subject: "",
        body: "Test body",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Subject is required");
  });

  it("should require body field", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/broadcast/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "newsletter",
        subject: "Test Subject",
        body: "",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Body is required");
  });

  it("should validate audience field", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/broadcast/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "invalid",
        subject: "Test Subject",
        body: "Test body",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid audience");
  });

  it("should require appId for app audience", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/broadcast/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "app",
        subject: "Test Subject",
        body: "Test body",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("App ID required for app audience");
  });

  it("should return error when no recipients found", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    // Create mock env with no newsletter subscribers - empty tables
    const emptyMockEnv = createMockEnv({
      d1State: {
        tables: new Map([
          ["user", []],
          ["apps", []],
          ["purchases", []],
        ]),
      },
    });

    vi.mocked(getEnv).mockReturnValue(emptyMockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/broadcast/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "newsletter",
        subject: "Test Subject",
        body: "Test body",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("No recipients found for this audience");
  });

  it("should send broadcast to newsletter subscribers", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    // Create mock with newsletter subscribers
    const subscriberMockEnv = createMockEnv({
      d1State: {
        tables: new Map([
          ["user", [
            {
              id: "sub_1",
              email: "subscriber1@example.com",
              name: "Subscriber One",
              emailVerified: true,
              newsletterSubscribed: 1,
              isAdmin: false,
            },
            {
              id: "sub_2",
              email: "subscriber2@example.com",
              name: "Subscriber Two",
              emailVerified: true,
              newsletterSubscribed: 1,
              isAdmin: false,
            },
          ]],
          ["email_log", []],
        ]),
      },
    });

    vi.mocked(getEnv).mockReturnValue(subscriberMockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/broadcast/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "newsletter",
        subject: "Newsletter Update",
        body: "Hello newsletter subscribers!",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.sent_count).toBeGreaterThan(0);
    expect(data.broadcast_id).toBeDefined();

    // Verify sendEmail was called for each subscriber
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("should handle email send failures gracefully", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    const subscriberMockEnv = createMockEnv({
      d1State: {
        tables: new Map([
          ["user", [
            {
              id: "sub_1",
              email: "subscriber@example.com",
              name: "Subscriber",
              emailVerified: true,
              newsletterSubscribed: 1,
              isAdmin: false,
            },
          ]],
          ["email_log", []],
        ]),
      },
    });

    vi.mocked(getEnv).mockReturnValue(subscriberMockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    // Mock email failure
    mockSendEmail.mockResolvedValue({ error: "SMTP error" });

    const { POST } = await import("@/app/api/admin/broadcast/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "newsletter",
        subject: "Newsletter Update",
        body: "Hello!",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.failed_count).toBeGreaterThan(0);
    expect(data.errors).toBeDefined();
  });
});

describe("POST /api/admin/broadcast/test", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue({ messageId: "msg_test_123" });
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

    const { POST } = await import("@/app/api/admin/broadcast/test/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Test Subject",
        body: "Test body",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe("Admin access required");
  });

  it("should require subject field", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/broadcast/test/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "",
        body: "Test body",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Subject is required");
  });

  it("should require body field", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/broadcast/test/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Test Subject",
        body: "",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Body is required");
  });

  it("should send test email to admin address", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    const { POST } = await import("@/app/api/admin/broadcast/test/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Test Email Subject",
        body: "This is a test email body.",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.messageId).toBe("msg_test_123");

    // Verify sendEmail was called with correct parameters
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cody@isolated.tech",
        subject: "[TEST] Test Email Subject",
        text: "This is a test email body.",
      }),
      expect.any(Object)
    );
  });

  it("should return error when email send fails", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    const { getSessionFromHeaders } = await import("@/lib/auth/middleware");

    vi.mocked(getEnv).mockReturnValue(mockEnv as any);
    vi.mocked(getSessionFromHeaders).mockResolvedValue({
      user: { ...fixtures.adminUser, isAdmin: true },
      session: { id: "session_123" },
    });

    mockSendEmail.mockResolvedValue({ error: "SES configuration error" });

    const { POST } = await import("@/app/api/admin/broadcast/test/route");

    const request = new Request("https://isolated.tech/api/admin/broadcast/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: "Test Subject",
        body: "Test body",
      }),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("SES configuration error");
  });
});
