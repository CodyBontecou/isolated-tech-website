/**
 * Unit tests for email system
 * Tests email templates and sendEmail function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEmailEnv, createMockSESFetch } from "../mocks/email";

// Store original fetch
const originalFetch = global.fetch;

describe("Email Templates", () => {
  describe("generateReceiptEmail", () => {
    it("should include app name in both HTML and text", async () => {
      const { generateReceiptEmail } = await import("@/lib/email");
      
      const { html, text } = generateReceiptEmail(
        "SuperApp Pro",
        999,
        "John Doe",
        "https://isolated.tech/dashboard"
      );

      expect(html).toContain("SuperApp Pro");
      expect(text).toContain("SuperApp Pro");
    });

    it("should format price correctly in cents", async () => {
      const { generateReceiptEmail } = await import("@/lib/email");
      
      const { html, text } = generateReceiptEmail(
        "Test App",
        1999,
        "User",
        "https://isolated.tech/dashboard"
      );

      expect(html).toContain("$19.99");
      expect(text).toContain("$19.99");
    });

    it("should handle free apps with 0 cents", async () => {
      const { generateReceiptEmail } = await import("@/lib/email");
      
      const { html, text } = generateReceiptEmail(
        "Free App",
        0,
        "User",
        "https://isolated.tech/dashboard"
      );

      expect(html).toContain("Free");
      expect(text).toContain("Free");
      expect(html).not.toContain("$0.00");
    });

    it("should include dashboard link", async () => {
      const { generateReceiptEmail } = await import("@/lib/email");
      
      const dashboardUrl = "https://isolated.tech/dashboard?purchase=123";
      const { html, text } = generateReceiptEmail(
        "Test App",
        999,
        "User",
        dashboardUrl
      );

      expect(html).toContain(dashboardUrl);
      expect(text).toContain(dashboardUrl);
    });

    it("should include personalized greeting when userName provided", async () => {
      const { generateReceiptEmail } = await import("@/lib/email");
      
      const { html, text } = generateReceiptEmail(
        "Test App",
        999,
        "Jane Smith",
        "https://isolated.tech/dashboard"
      );

      expect(html).toContain("Hi Jane Smith,");
      expect(text).toContain("Hi Jane Smith,");
    });

    it("should use generic greeting when userName is null", async () => {
      const { generateReceiptEmail } = await import("@/lib/email");
      
      const { html, text } = generateReceiptEmail(
        "Test App",
        999,
        null,
        "https://isolated.tech/dashboard"
      );

      expect(html).toContain("Hi,");
      expect(text).toContain("Hi,");
      expect(html).not.toContain("Hi null");
    });

    it("should generate valid HTML structure", async () => {
      const { generateReceiptEmail } = await import("@/lib/email");
      
      const { html } = generateReceiptEmail(
        "Test App",
        999,
        "User",
        "https://isolated.tech/dashboard"
      );

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html>");
      expect(html).toContain("</html>");
      expect(html).toContain("ISOLATED");
      expect(html).toContain("TECH");
    });

    it("should include thank you message", async () => {
      const { generateReceiptEmail } = await import("@/lib/email");
      
      const { html, text } = generateReceiptEmail(
        "Test App",
        999,
        "User",
        "https://isolated.tech/dashboard"
      );

      expect(html).toContain("Thank you for your purchase");
      expect(text).toContain("Thank you for your purchase");
    });
  });

  describe("generateUpdateEmail", () => {
    it("should include app name and version", async () => {
      const { generateUpdateEmail } = await import("@/lib/email");
      
      const { html, text } = generateUpdateEmail(
        "SuperApp",
        "2.0.0",
        "Bug fixes",
        "User",
        "https://isolated.tech/dashboard",
        "https://isolated.tech/apps/superapp/changelog"
      );

      expect(html).toContain("SuperApp");
      expect(html).toContain("2.0.0");
      expect(text).toContain("SuperApp");
      expect(text).toContain("2.0.0");
    });

    it("should include release notes when provided", async () => {
      const { generateUpdateEmail } = await import("@/lib/email");
      
      const releaseNotes = "Fixed critical security issue\nImproved performance";
      const { html, text } = generateUpdateEmail(
        "Test App",
        "1.1.0",
        releaseNotes,
        "User",
        "https://isolated.tech/dashboard",
        "https://isolated.tech/changelog"
      );

      expect(html).toContain("Fixed critical security issue");
      expect(text).toContain("Fixed critical security issue");
    });

    it("should truncate long release notes at 300 chars", async () => {
      const { generateUpdateEmail } = await import("@/lib/email");
      
      const longNotes = "A".repeat(400);
      const { html, text } = generateUpdateEmail(
        "Test App",
        "1.1.0",
        longNotes,
        "User",
        "https://isolated.tech/dashboard",
        "https://isolated.tech/changelog"
      );

      // Should contain truncated notes with ellipsis
      expect(html).toContain("A".repeat(300) + "...");
      expect(text).toContain("A".repeat(300) + "...");
    });

    it("should not show release notes section when null", async () => {
      const { generateUpdateEmail } = await import("@/lib/email");
      
      const { html, text } = generateUpdateEmail(
        "Test App",
        "1.1.0",
        null,
        "User",
        "https://isolated.tech/dashboard",
        "https://isolated.tech/changelog"
      );

      // The HTML should not contain the release notes block
      expect(html).not.toContain("border-left: 2px solid #333");
    });

    it("should include both download and changelog links", async () => {
      const { generateUpdateEmail } = await import("@/lib/email");
      
      const dashboardUrl = "https://isolated.tech/dashboard";
      const changelogUrl = "https://isolated.tech/apps/myapp/changelog";
      
      const { html, text } = generateUpdateEmail(
        "Test App",
        "1.1.0",
        "Notes",
        "User",
        dashboardUrl,
        changelogUrl
      );

      expect(html).toContain(dashboardUrl);
      expect(html).toContain(changelogUrl);
      expect(text).toContain(dashboardUrl);
      expect(text).toContain(changelogUrl);
    });

    it("should mention this is an update notification", async () => {
      const { generateUpdateEmail } = await import("@/lib/email");
      
      const { html, text } = generateUpdateEmail(
        "MyApp",
        "2.0.0",
        null,
        "User",
        "https://isolated.tech/dashboard",
        "https://isolated.tech/changelog"
      );

      expect(html).toContain("is now available");
      expect(text).toContain("is now available");
    });
  });

  describe("generateFeedbackStatusEmail", () => {
    it("should include request title", async () => {
      const { generateFeedbackStatusEmail } = await import("@/lib/email");
      
      const { html, text } = generateFeedbackStatusEmail(
        "Add dark mode support",
        "open",
        "planned",
        null,
        "User",
        "https://isolated.tech/feedback/123"
      );

      expect(html).toContain("Add dark mode support");
      expect(text).toContain("Add dark mode support");
    });

    it("should show status in uppercase", async () => {
      const { generateFeedbackStatusEmail } = await import("@/lib/email");
      
      const { html, text } = generateFeedbackStatusEmail(
        "Feature Request",
        "open",
        "in_progress",
        null,
        "User",
        "https://isolated.tech/feedback/123"
      );

      expect(html).toContain("IN PROGRESS");
      expect(text).toContain("IN PROGRESS");
    });

    it("should use correct color for each status", async () => {
      const { generateFeedbackStatusEmail } = await import("@/lib/email");
      
      const statuses = [
        { status: "open", color: "#3b82f6" },
        { status: "planned", color: "#f59e0b" },
        { status: "in_progress", color: "#8b5cf6" },
        { status: "completed", color: "#22c55e" },
        { status: "closed", color: "#6b7280" },
      ];

      for (const { status, color } of statuses) {
        const { html } = generateFeedbackStatusEmail(
          "Request",
          "open",
          status,
          null,
          "User",
          "https://isolated.tech/feedback/123"
        );
        expect(html).toContain(color);
      }
    });

    it("should include admin response when provided", async () => {
      const { generateFeedbackStatusEmail } = await import("@/lib/email");
      
      const adminResponse = "Thanks for the suggestion! We're working on this.";
      const { html, text } = generateFeedbackStatusEmail(
        "Feature Request",
        "open",
        "planned",
        adminResponse,
        "User",
        "https://isolated.tech/feedback/123"
      );

      expect(html).toContain(adminResponse);
      expect(html).toContain("OFFICIAL RESPONSE");
      expect(text).toContain(adminResponse);
    });

    it("should not show response block when adminResponse is null", async () => {
      const { generateFeedbackStatusEmail } = await import("@/lib/email");
      
      const { html } = generateFeedbackStatusEmail(
        "Feature Request",
        "open",
        "completed",
        null,
        "User",
        "https://isolated.tech/feedback/123"
      );

      expect(html).not.toContain("OFFICIAL RESPONSE");
    });

    it("should include feedback URL", async () => {
      const { generateFeedbackStatusEmail } = await import("@/lib/email");
      
      const feedbackUrl = "https://isolated.tech/feedback/abc123";
      const { html, text } = generateFeedbackStatusEmail(
        "Feature Request",
        "open",
        "completed",
        null,
        "User",
        feedbackUrl
      );

      expect(html).toContain(feedbackUrl);
      expect(text).toContain(feedbackUrl);
    });

    it("should convert newlines to br tags in admin response HTML", async () => {
      const { generateFeedbackStatusEmail } = await import("@/lib/email");
      
      const adminResponse = "Line 1\nLine 2\nLine 3";
      const { html } = generateFeedbackStatusEmail(
        "Request",
        "open",
        "planned",
        adminResponse,
        "User",
        "https://isolated.tech/feedback/123"
      );

      expect(html).toContain("Line 1<br>Line 2<br>Line 3");
    });
  });

  describe("generateCommentNotificationEmail", () => {
    it("should include request title", async () => {
      const { generateCommentNotificationEmail } = await import("@/lib/email");
      
      const { html, text } = generateCommentNotificationEmail(
        "Dark mode feature request",
        "John Doe",
        "Great idea!",
        false,
        "User",
        "https://isolated.tech/feedback/123"
      );

      expect(html).toContain("Dark mode feature request");
      expect(text).toContain("Dark mode feature request");
    });

    it("should show commenter name", async () => {
      const { generateCommentNotificationEmail } = await import("@/lib/email");
      
      const { html, text } = generateCommentNotificationEmail(
        "Feature Request",
        "Jane Smith",
        "I agree with this.",
        false,
        "User",
        "https://isolated.tech/feedback/123"
      );

      expect(html).toContain("Jane Smith");
      expect(text).toContain("Jane Smith");
    });

    it("should include comment body", async () => {
      const { generateCommentNotificationEmail } = await import("@/lib/email");
      
      const commentBody = "This would really improve the workflow!";
      const { html, text } = generateCommentNotificationEmail(
        "Feature Request",
        "Commenter",
        commentBody,
        false,
        "User",
        "https://isolated.tech/feedback/123"
      );

      expect(html).toContain(commentBody);
      expect(text).toContain(commentBody);
    });

    it("should distinguish admin replies with different label", async () => {
      const { generateCommentNotificationEmail } = await import("@/lib/email");
      
      const { html: adminHtml, text: adminText } = generateCommentNotificationEmail(
        "Feature Request",
        "Support Team",
        "We're looking into this.",
        true,
        "User",
        "https://isolated.tech/feedback/123"
      );

      const { html: userHtml } = generateCommentNotificationEmail(
        "Feature Request",
        "Other User",
        "I agree!",
        false,
        "User",
        "https://isolated.tech/feedback/123"
      );

      expect(adminHtml).toContain("TEAM RESPONSE");
      expect(adminHtml).toContain("The team responded to");
      expect(adminText).toContain("The team responded to");
      
      expect(userHtml).toContain("NEW COMMENT");
      expect(userHtml).not.toContain("TEAM RESPONSE");
    });

    it("should use different color for admin replies", async () => {
      const { generateCommentNotificationEmail } = await import("@/lib/email");
      
      const { html: adminHtml } = generateCommentNotificationEmail(
        "Feature Request",
        "Admin",
        "Response",
        true,
        "User",
        "https://isolated.tech/feedback/123"
      );

      const { html: userHtml } = generateCommentNotificationEmail(
        "Feature Request",
        "User",
        "Comment",
        false,
        "User",
        "https://isolated.tech/feedback/123"
      );

      // Admin replies use green (#22c55e), regular comments use blue (#60a5fa)
      expect(adminHtml).toContain("#22c55e");
      expect(userHtml).toContain("#60a5fa");
    });

    it("should convert newlines to br tags in comment body HTML", async () => {
      const { generateCommentNotificationEmail } = await import("@/lib/email");
      
      const commentBody = "First line\nSecond line\nThird line";
      const { html } = generateCommentNotificationEmail(
        "Request",
        "Commenter",
        commentBody,
        false,
        "User",
        "https://isolated.tech/feedback/123"
      );

      expect(html).toContain("First line<br>Second line<br>Third line");
    });

    it("should include feedback URL", async () => {
      const { generateCommentNotificationEmail } = await import("@/lib/email");
      
      const feedbackUrl = "https://isolated.tech/feedback/xyz789";
      const { html, text } = generateCommentNotificationEmail(
        "Request",
        "Commenter",
        "Comment",
        false,
        "User",
        feedbackUrl
      );

      expect(html).toContain(feedbackUrl);
      expect(text).toContain(feedbackUrl);
    });
  });
});

describe("sendEmail", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("should return error when AWS credentials are missing", async () => {
    const mockEnv = createEmailEnv({ hasAwsCredentials: false });
    const { sendEmail } = await import("@/lib/email");

    const result = await sendEmail(
      {
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      },
      mockEnv as any
    );

    expect(result.error).toBe("AWS credentials not configured");
    expect(result.messageId).toBeUndefined();
  });

  it("should return messageId on successful send", async () => {
    const mockFetch = createMockSESFetch({ 
      shouldSucceed: true, 
      messageId: "test-message-id-abc" 
    });
    global.fetch = mockFetch;

    const mockEnv = createEmailEnv({ hasAwsCredentials: true });
    const { sendEmail } = await import("@/lib/email");

    const result = await sendEmail(
      {
        to: "user@example.com",
        subject: "Welcome!",
        html: "<p>Hello</p>",
        text: "Hello",
      },
      mockEnv as any
    );

    expect(result.error).toBeUndefined();
    expect(result.messageId).toBe("test-message-id-abc");
  });

  it("should parse SES error message from XML response", async () => {
    const mockFetch = createMockSESFetch({ 
      shouldSucceed: false, 
      errorMessage: "Email address is not verified" 
    });
    global.fetch = mockFetch;

    const mockEnv = createEmailEnv({ hasAwsCredentials: true });
    const { sendEmail } = await import("@/lib/email");

    const result = await sendEmail(
      {
        to: "unverified@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      },
      mockEnv as any
    );

    expect(result.error).toBe("Email address is not verified");
    expect(result.messageId).toBeUndefined();
  });

  it("should construct proper SES request with all email parameters", async () => {
    let capturedBody = "";
    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      capturedBody = init?.body as string || "";
      return new Response(
        `<SendEmailResponse><SendEmailResult><MessageId>msg-123</MessageId></SendEmailResult></SendEmailResponse>`,
        { status: 200 }
      );
    });
    global.fetch = mockFetch;

    const mockEnv = createEmailEnv({ hasAwsCredentials: true });
    const { sendEmail } = await import("@/lib/email");

    await sendEmail(
      {
        to: "recipient@test.com",
        subject: "Test Subject",
        html: "<p>HTML body</p>",
        text: "Text body",
      },
      mockEnv as any
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // Check the request body contains all required SES parameters
    const params = new URLSearchParams(capturedBody);
    expect(params.get("Action")).toBe("SendEmail");
    expect(params.get("Destination.ToAddresses.member.1")).toBe("recipient@test.com");
    expect(params.get("Message.Subject.Data")).toBe("Test Subject");
    expect(params.get("Message.Body.Html.Data")).toBe("<p>HTML body</p>");
    expect(params.get("Message.Body.Text.Data")).toBe("Text body");
  });

  it("should include Authorization header with AWS Signature V4", async () => {
    let capturedHeaders: Headers | undefined;
    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers as HeadersInit);
      return new Response(
        `<SendEmailResponse><SendEmailResult><MessageId>msg-123</MessageId></SendEmailResult></SendEmailResponse>`,
        { status: 200 }
      );
    });
    global.fetch = mockFetch;

    const mockEnv = createEmailEnv({ hasAwsCredentials: true });
    const { sendEmail } = await import("@/lib/email");

    await sendEmail(
      {
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      },
      mockEnv as any
    );

    expect(capturedHeaders).toBeDefined();
    const authHeader = capturedHeaders!.get("Authorization");
    expect(authHeader).toContain("AWS4-HMAC-SHA256");
    expect(authHeader).toContain("Credential=");
    expect(authHeader).toContain("SignedHeaders=");
    expect(authHeader).toContain("Signature=");
  });

  it("should include X-Amz-Date header", async () => {
    let capturedHeaders: Headers | undefined;
    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers as HeadersInit);
      return new Response(
        `<SendEmailResponse><SendEmailResult><MessageId>msg-123</MessageId></SendEmailResult></SendEmailResponse>`,
        { status: 200 }
      );
    });
    global.fetch = mockFetch;

    const mockEnv = createEmailEnv({ hasAwsCredentials: true });
    const { sendEmail } = await import("@/lib/email");

    await sendEmail(
      {
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      },
      mockEnv as any
    );

    const amzDate = capturedHeaders!.get("X-Amz-Date");
    expect(amzDate).toBeDefined();
    expect(amzDate).toMatch(/^\d{8}T\d{6}Z$/);
  });

  it("should call SES endpoint in us-east-1", async () => {
    let calledUrl = "";
    const mockFetch = vi.fn(async (url: string) => {
      calledUrl = url;
      return new Response(
        `<SendEmailResponse><SendEmailResult><MessageId>msg-123</MessageId></SendEmailResult></SendEmailResponse>`,
        { status: 200 }
      );
    });
    global.fetch = mockFetch;

    const mockEnv = createEmailEnv({ hasAwsCredentials: true });
    const { sendEmail } = await import("@/lib/email");

    await sendEmail(
      {
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      },
      mockEnv as any
    );

    expect(calledUrl).toBe("https://email.us-east-1.amazonaws.com");
  });

  it("should handle network errors gracefully", async () => {
    const mockFetch = vi.fn(async () => {
      throw new Error("Network connection failed");
    });
    global.fetch = mockFetch;

    const mockEnv = createEmailEnv({ hasAwsCredentials: true });
    const { sendEmail } = await import("@/lib/email");

    const result = await sendEmail(
      {
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        text: "Test",
      },
      mockEnv as any
    );

    expect(result.error).toBe("Network connection failed");
    expect(result.messageId).toBeUndefined();
  });
});

describe("logEmail", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should insert email log record to database", async () => {
    const mockRun = vi.fn().mockResolvedValue({ success: true });
    const mockBind = vi.fn().mockReturnValue({ run: mockRun });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    
    const mockEnv = {
      DB: { prepare: mockPrepare },
    };

    const { logEmail } = await import("@/lib/email");

    await logEmail(
      "user_123",
      "receipt",
      "Your purchase receipt",
      "ses_message_456",
      mockEnv as any
    );

    expect(mockPrepare).toHaveBeenCalledTimes(1);
    expect(mockPrepare.mock.calls[0][0]).toContain("INSERT INTO email_log");
    
    // Check bound parameters
    const boundArgs = mockBind.mock.calls[0];
    expect(boundArgs).toContain("user_123");
    expect(boundArgs).toContain("receipt");
    expect(boundArgs).toContain("Your purchase receipt");
    expect(boundArgs).toContain("ses_message_456");
  });

  it("should handle null messageId", async () => {
    const mockRun = vi.fn().mockResolvedValue({ success: true });
    const mockBind = vi.fn().mockReturnValue({ run: mockRun });
    const mockPrepare = vi.fn().mockReturnValue({ bind: mockBind });
    
    const mockEnv = {
      DB: { prepare: mockPrepare },
    };

    const { logEmail } = await import("@/lib/email");

    await logEmail(
      "user_123",
      "receipt",
      "Subject",
      null,
      mockEnv as any
    );

    const boundArgs = mockBind.mock.calls[0];
    expect(boundArgs).toContain(null);
  });
});
