/**
 * Integration tests for changelog RSS feed route
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

describe("Updates RSS Feed", () => {
  let mockEnv: ReturnType<typeof createMockEnv>;

  beforeEach(() => {
    vi.resetModules();
    
    // Create test state with app_updates table
    const testState = {
      tables: new Map([
        ["apps", [fixtures.testApp]],
        ["app_updates", [
          {
            id: "update_test_1",
            app_id: fixtures.testApp.id,
            app_name: fixtures.testApp.name,
            app_slug: fixtures.testApp.slug,
            platform: "macos",
            version: "1.2.0",
            release_notes: "Bug fixes and improvements",
            released_at: new Date("2024-02-15").toISOString(),
          },
          {
            id: "update_test_2",
            app_id: fixtures.testApp.id,
            app_name: fixtures.testApp.name,
            app_slug: fixtures.testApp.slug,
            platform: "ios",
            version: "1.1.0",
            release_notes: "Initial iOS release",
            released_at: new Date("2024-02-01").toISOString(),
          },
        ]],
      ]),
    };
    mockEnv = createMockEnv({ d1State: testState });
  });

  describe("GET /feed/updates.xml", () => {
    it("should return valid RSS XML", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/feed/updates.xml/route");
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "application/rss+xml; charset=utf-8"
      );

      const xml = await response.text();
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<rss version="2.0"');
      expect(xml).toContain("<channel>");
      expect(xml).toContain("<title>ISOLATED.TECH Updates</title>");
    });

    it("should include app updates as items", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/feed/updates.xml/route");
      const response = await GET();
      const xml = await response.text();

      expect(xml).toContain("<item>");
      expect(xml).toContain("v1.2.0");
      expect(xml).toContain("macOS");
      expect(xml).toContain("<guid");
      expect(xml).toContain("<pubDate>");
    });

    it("should set proper cache headers", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(mockEnv as any);

      const { GET } = await import("@/app/feed/updates.xml/route");
      const response = await GET();

      expect(response.headers.get("Cache-Control")).toContain("public");
      expect(response.headers.get("Cache-Control")).toContain("max-age=1800");
    });

    it("should return 500 when database is unavailable", async () => {
      const { getEnv } = await import("@/lib/cloudflare-context");
      vi.mocked(getEnv).mockReturnValue(null);

      const { GET } = await import("@/app/feed/updates.xml/route");
      const response = await GET();

      expect(response.status).toBe(500);
    });
  });
});
