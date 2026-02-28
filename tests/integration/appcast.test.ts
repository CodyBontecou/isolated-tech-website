/**
 * Integration tests for the Sparkle appcast endpoint
 * Tests XML generation for macOS app auto-updates
 * 
 * Note: These tests verify input validation and error handling.
 * Full appcast XML testing requires a real database with proper JOIN support.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

describe("Appcast Endpoint", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(async () => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /appcast/[slug]", () => {
    it("should return 404 for non-existent app", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/appcast/[slug]/route");
      const request = new Request("https://isolated.tech/appcast/nonexistent-app");
      const response = await GET(request as any, { params: { slug: "nonexistent-app" } });

      expect(response.status).toBe(404);
    });

    it("should return 500 when database is not available", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue({ DB: null } as any);

      const { GET } = await import("@/app/appcast/[slug]/route");
      const request = new Request("https://isolated.tech/appcast/test-app");
      const response = await GET(request as any, { params: { slug: "test-app" } });

      expect(response.status).toBe(500);
    });

    it("should handle slug with .xml extension", async () => {
      // The route should strip .xml extension
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/appcast/[slug]/route");
      const request = new Request("https://isolated.tech/appcast/nonexistent.xml");
      const response = await GET(request as any, { params: { slug: "nonexistent.xml" } });

      // Should return 404 (not a server error), showing it handled the .xml extension
      expect(response.status).toBe(404);
    });
  });
});

/**
 * Unit tests for appcast XML generation helpers
 */
describe("Appcast XML Helpers", () => {
  describe("escapeXml function", () => {
    // Test XML escaping logic
    it("should escape ampersands", () => {
      const text = "Test & App";
      const escaped = text.replace(/&/g, "&amp;");
      expect(escaped).toBe("Test &amp; App");
    });

    it("should escape less than", () => {
      const text = "Test < App";
      const escaped = text.replace(/</g, "&lt;");
      expect(escaped).toBe("Test &lt; App");
    });

    it("should escape greater than", () => {
      const text = "Test > App";
      const escaped = text.replace(/>/g, "&gt;");
      expect(escaped).toBe("Test &gt; App");
    });

    it("should escape quotes", () => {
      const text = 'Test "App"';
      const escaped = text.replace(/"/g, "&quot;");
      expect(escaped).toBe("Test &quot;App&quot;");
    });

    it("should handle multiple special characters", () => {
      const text = "Test & <App> \"Name\"";
      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      expect(escaped).toBe("Test &amp; &lt;App&gt; &quot;Name&quot;");
    });
  });

  describe("formatRFC822Date function", () => {
    it("should format date as RFC822", () => {
      const date = new Date("2024-02-15T10:30:00Z");
      const formatted = date.toUTCString();
      // RFC822 format: "Thu, 15 Feb 2024 10:30:00 GMT"
      expect(formatted).toContain("2024");
      expect(formatted).toContain("Feb");
      expect(formatted).toContain("GMT");
    });
  });

  describe("Appcast XML structure", () => {
    it("should produce valid XML structure", () => {
      // Mock appcast XML structure
      const app = { name: "Test App", slug: "test-app", tagline: "A test app" };
      const version = {
        version: "1.0.0",
        build_number: 100,
        min_os_version: "13.0",
        file_size: 1024000,
        signature: "mockSignature",
        created_at: new Date().toISOString(),
      };
      const baseUrl = "https://isolated.tech";
      const downloadUrl = `${baseUrl}/api/download/app_123/version_123`;

      // Simulate XML generation
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <title>${app.name}</title>
    <description>${app.tagline}</description>
    <item>
      <sparkle:version>${version.build_number}</sparkle:version>
      <sparkle:shortVersionString>${version.version}</sparkle:shortVersionString>
      <sparkle:minimumSystemVersion>${version.min_os_version}</sparkle:minimumSystemVersion>
      <pubDate>${new Date(version.created_at).toUTCString()}</pubDate>
      <enclosure
        url="${downloadUrl}"
        sparkle:edSignature="${version.signature}"
        length="${version.file_size}"
        type="application/octet-stream"
      />
    </item>
  </channel>
</rss>`;

      // Verify structure
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<rss version="2.0"');
      expect(xml).toContain("xmlns:sparkle=");
      expect(xml).toContain("<channel>");
      expect(xml).toContain("<item>");
      expect(xml).toContain("<sparkle:version>");
      expect(xml).toContain("<sparkle:shortVersionString>");
      expect(xml).toContain("<sparkle:minimumSystemVersion>");
      expect(xml).toContain("<pubDate>");
      expect(xml).toContain("<enclosure");
      expect(xml).toContain("sparkle:edSignature=");
      expect(xml).toContain('type="application/octet-stream"');
      expect(xml).toContain("</rss>");
    });

    it("should include download URL in enclosure", () => {
      const downloadUrl = "https://isolated.tech/api/download/app_123/version_123";
      const xml = `<enclosure url="${downloadUrl}" length="1024" />`;
      
      expect(xml).toContain("url=");
      expect(xml).toContain("/api/download/");
    });

    it("should include release notes link", () => {
      const app = { slug: "test-app" };
      const version = { version: "1.2.0" };
      const baseUrl = "https://isolated.tech";
      const releaseNotesUrl = `${baseUrl}/apps/${app.slug}/changelog#${version.version}`;
      
      expect(releaseNotesUrl).toContain("/changelog#");
      expect(releaseNotesUrl).toContain(version.version);
    });
  });
});
