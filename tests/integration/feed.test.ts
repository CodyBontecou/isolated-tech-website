/**
 * Integration tests for RSS feed route
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

describe("RSS Feed", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
  });

  describe("GET /feed.xml", () => {
    it("should return valid RSS XML", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/feed.xml/route");
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "application/rss+xml; charset=utf-8"
      );

      const xml = await response.text();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<rss version="2.0"');
      expect(xml).toContain("<channel>");
      expect(xml).toContain("<title>ISOLATED.TECH Apps</title>");
    });

    it("should include published apps as items", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/feed.xml/route");
      const response = await GET();
      const xml = await response.text();

      // Should contain the test app from fixtures
      expect(xml).toContain("<item>");
      expect(xml).toContain("<title>Test App</title>");
      expect(xml).toContain("<link>https://isolated.tech/apps/test-app</link>");
      expect(xml).toContain("<guid");
      expect(xml).toContain("<pubDate>");
    });

    it("should escape special XML characters", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");

      // Create mock with app containing special characters
      const specialApp = {
        ...fixtures.testApp,
        name: "Test & App <Special>",
        tagline: 'A "quoted" tagline',
      };
      const testState = {
        tables: new Map([
          ["apps", [specialApp]],
        ]),
      };
      const mockEnvWithSpecial = createMockEnv({ d1State: testState });
      vi.mocked(getEnv).mockReturnValue(mockEnvWithSpecial as any);

      const { GET } = await import("@/app/feed.xml/route");
      const response = await GET();
      const xml = await response.text();

      expect(xml).toContain("Test &amp; App &lt;Special&gt;");
      expect(xml).toContain("A &quot;quoted&quot; tagline");
    });

    it("should set proper cache headers", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/feed.xml/route");
      const response = await GET();

      expect(response.headers.get("Cache-Control")).toContain("public");
      expect(response.headers.get("Cache-Control")).toContain("max-age=3600");
    });

    it("should return 500 when database is unavailable", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(null);

      const { GET } = await import("@/app/feed.xml/route");
      const response = await GET();

      expect(response.status).toBe(500);
    });
  });
});
