import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_CATALOG, PLATFORM_ORDER, releasedPlatforms } from "@/lib/app-catalog";

describe("APP_CATALOG", () => {
  it("has unique slugs", () => {
    const slugs = APP_CATALOG.map((app) => app.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every app at least one released platform", () => {
    for (const app of APP_CATALOG) {
      expect(releasedPlatforms(app).length, app.name).toBeGreaterThan(0);
    }
  });

  it("uses absolute https links only, so nothing resolves to the current host", () => {
    for (const app of APP_CATALOG) {
      const hrefs = [app.website, ...app.links.map((l) => l.href), ...(app.source ?? []).map((s) => s.href)].filter(
        Boolean,
      ) as string[];
      for (const href of hrefs) {
        expect(href.startsWith("https://"), `${app.name}: ${href}`).toBe(true);
      }
    }
  });

  it("links source code to GitHub only", () => {
    for (const app of APP_CATALOG) {
      for (const repo of app.source ?? []) {
        expect(repo.href.startsWith("https://github.com/"), `${app.name}: ${repo.href}`).toBe(true);
      }
    }
  });

  it("points every icon at a file in /public", () => {
    for (const app of APP_CATALOG) {
      expect(app.icon.startsWith("/assets/app-icons/"), app.name).toBe(true);
      expect(existsSync(join(process.cwd(), "public", app.icon)), app.icon).toBe(true);
    }
  });

  it("only uses known platforms", () => {
    for (const app of APP_CATALOG) {
      for (const link of app.links) {
        expect(PLATFORM_ORDER).toContain(link.platform);
      }
    }
  });

  it("excludes coming-soon platforms from released platforms", () => {
    const thumble = APP_CATALOG.find((app) => app.slug === "thumble");
    expect(thumble).toBeDefined();
    expect(releasedPlatforms(thumble!)).not.toContain("ios");
    expect(releasedPlatforms(thumble!)).toContain("android");
  });
});
