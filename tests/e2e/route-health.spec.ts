/**
 * Route Health Tests (E2E)
 *
 * Comprehensive smoke tests to ensure ALL routes render without 500 errors.
 * These tests hit actual endpoints and verify they return non-error status codes.
 *
 * Critical: These tests catch deployment-blocking issues like:
 * - Missing environment variables
 * - Database connection failures
 * - Import errors in Server Components
 * - Missing dependencies
 */

import { test, expect, request as playwrightRequest } from "@playwright/test";

// ============================================================================
// Static Pages - Should always work, no auth/db required
// ============================================================================

const STATIC_ROUTES = [
  { path: "/", name: "Homepage" },
  { path: "/terms", name: "Terms of Service" },
  { path: "/privacy", name: "Privacy Policy" },
];

// ============================================================================
// Public Dynamic Pages - Require database but no auth
// ============================================================================

const PUBLIC_DYNAMIC_ROUTES = [
  { path: "/feedback", name: "Feedback List" },
  { path: "/roadmap", name: "Public Roadmap" },
  { path: "/help", name: "Help Center" },
  { path: "/apps", name: "Apps Listing" },
];

// ============================================================================
// Auth Pages - Login/verification flows
// ============================================================================

const AUTH_ROUTES = [
  { path: "/auth/login", name: "Login Page" },
  { path: "/auth/verify", name: "Email Verification" },
];

// ============================================================================
// Protected Pages - Require auth (will redirect to login, but shouldn't 500)
// ============================================================================

const PROTECTED_ROUTES = [
  { path: "/dashboard", name: "User Dashboard" },
  { path: "/dashboard/reviews", name: "My Reviews" },
  { path: "/dashboard/settings", name: "Account Settings" },
  { path: "/feedback/submit", name: "Submit Feedback" },
];

// ============================================================================
// Admin Pages - Require admin auth (will redirect, but shouldn't 500)
// ============================================================================

const ADMIN_ROUTES = [
  { path: "/admin", name: "Admin Dashboard" },
  { path: "/admin/apps", name: "Admin Apps" },
  { path: "/admin/apps/new", name: "Create App" },
  { path: "/admin/codes", name: "Discount Codes" },
  { path: "/admin/codes/new", name: "Create Code" },
  { path: "/admin/users", name: "User Management" },
  { path: "/admin/purchases", name: "Purchase History" },
  { path: "/admin/downloads", name: "Download Stats" },
  { path: "/admin/subscribers", name: "Email Subscribers" },
  { path: "/admin/broadcasts", name: "Email Broadcasts" },
  { path: "/admin/broadcasts/new", name: "New Broadcast" },
  { path: "/admin/feedback", name: "Admin Feedback" },
  { path: "/admin/feature-requests", name: "Feature Requests" },
  { path: "/admin/api-keys", name: "API Keys" },
  { path: "/admin/help-articles", name: "Help Articles" },
  { path: "/admin/help-articles/new", name: "New Help Article" },
];

// ============================================================================
// API Routes - Should return JSON, not 500
// ============================================================================

const API_ROUTES = [
  { path: "/api/feedback", name: "Feedback API", method: "GET" },
  { path: "/api/apps", name: "Apps API", method: "GET" },
];

// ============================================================================
// Helper: Check route doesn't return 500
// ============================================================================

async function checkRouteHealth(
  baseURL: string,
  path: string,
  name: string,
  options?: { followRedirects?: boolean }
) {
  const context = await playwrightRequest.newContext({
    baseURL,
  });

  const response = await context.get(path, {
    maxRedirects: options?.followRedirects ? 5 : 0,
    failOnStatusCode: false,
  });

  const status = response.status();

  // 500+ is always bad
  if (status >= 500) {
    const body = await response.text().catch(() => "(no body)");
    throw new Error(
      `Route ${path} (${name}) returned ${status} error.\n` +
        `Response body: ${body.substring(0, 500)}`
    );
  }

  await context.dispose();
  return { status, path, name };
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Route Health - Static Pages", () => {
  for (const route of STATIC_ROUTES) {
    test(`${route.name} (${route.path}) should not 500`, async ({ baseURL }) => {
      const result = await checkRouteHealth(baseURL!, route.path, route.name);
      expect(result.status).toBeLessThan(500);
      // Static pages should return 200
      expect(result.status).toBe(200);
    });
  }
});

test.describe("Route Health - Public Dynamic Pages", () => {
  for (const route of PUBLIC_DYNAMIC_ROUTES) {
    test(`${route.name} (${route.path}) should not 500`, async ({ baseURL }) => {
      const result = await checkRouteHealth(baseURL!, route.path, route.name);
      expect(result.status).toBeLessThan(500);
    });
  }
});

test.describe("Route Health - Auth Pages", () => {
  for (const route of AUTH_ROUTES) {
    test(`${route.name} (${route.path}) should not 500`, async ({ baseURL }) => {
      const result = await checkRouteHealth(baseURL!, route.path, route.name);
      expect(result.status).toBeLessThan(500);
    });
  }
});

test.describe("Route Health - Protected Pages (unauthenticated)", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route.name} (${route.path}) should redirect or render, not 500`, async ({
      baseURL,
    }) => {
      const result = await checkRouteHealth(baseURL!, route.path, route.name);
      expect(result.status).toBeLessThan(500);
      // May return 200 (with login prompt) or 3xx redirect
      expect([200, 301, 302, 303, 307, 308]).toContain(result.status);
    });
  }
});

test.describe("Route Health - Admin Pages (unauthenticated)", () => {
  for (const route of ADMIN_ROUTES) {
    test(`${route.name} (${route.path}) should redirect or render, not 500`, async ({
      baseURL,
    }) => {
      const result = await checkRouteHealth(baseURL!, route.path, route.name);
      expect(result.status).toBeLessThan(500);
      // May return 200 (with login prompt), 401, or 3xx redirect
      expect([200, 301, 302, 303, 307, 308, 401, 403]).toContain(result.status);
    });
  }
});

test.describe("Route Health - API Endpoints", () => {
  for (const route of API_ROUTES) {
    test(`${route.name} (${route.path}) should not 500`, async ({ baseURL }) => {
      const context = await playwrightRequest.newContext({ baseURL: baseURL! });

      const response = await context.fetch(route.path, {
        method: route.method || "GET",
        failOnStatusCode: false,
      });

      const status = response.status();

      if (status >= 500) {
        const body = await response.text().catch(() => "(no body)");
        throw new Error(
          `API ${route.path} returned ${status}.\nBody: ${body.substring(0, 500)}`
        );
      }

      expect(status).toBeLessThan(500);
      await context.dispose();
    });
  }
});

// ============================================================================
// Comprehensive Full Site Crawl
// ============================================================================

test.describe("Route Health - Full Site Crawl", () => {
  test("all discovered routes should not 500", async ({ page, baseURL }) => {
    const visited = new Set<string>();
    const errors: string[] = [];

    // Start from homepage
    await page.goto("/");

    // Collect all internal links
    const links = await page.evaluate(() => {
      const anchors = document.querySelectorAll("a[href]");
      return Array.from(anchors)
        .map((a) => a.getAttribute("href"))
        .filter(
          (href): href is string =>
            href !== null &&
            (href.startsWith("/") || href.startsWith(window.location.origin)) &&
            !href.startsWith("//") &&
            !href.includes("mailto:") &&
            !href.includes("tel:")
        )
        .map((href) => {
          if (href.startsWith(window.location.origin)) {
            return new URL(href).pathname;
          }
          return href.split("#")[0].split("?")[0]; // Remove hash and query
        });
    });

    // Test each unique link
    for (const link of [...new Set(links)]) {
      if (visited.has(link)) continue;
      visited.add(link);

      // Skip external or known problematic patterns
      if (link.includes("signout") || link.includes("logout")) continue;
      if (link.startsWith("/api/")) continue; // API routes tested separately
      if (link.includes("[")) continue; // Dynamic routes need params

      try {
        const response = await page.goto(link, {
          timeout: 10000,
          waitUntil: "domcontentloaded",
        });

        if (response && response.status() >= 500) {
          errors.push(`${link}: HTTP ${response.status()}`);
        }
      } catch (e) {
        // Navigation errors that aren't 500s are OK (e.g., timeouts on redirect loops)
        const err = e as Error;
        if (!err.message.includes("net::ERR")) {
          errors.push(`${link}: ${err.message}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Found ${errors.length} routes with errors:\n${errors.join("\n")}`
      );
    }
  });
});

// ============================================================================
// Special: Test dynamic routes with example data
// ============================================================================

test.describe("Route Health - Dynamic Routes with Example Data", () => {
  test("app detail page with test-app slug should not 500", async ({ baseURL }) => {
    const result = await checkRouteHealth(
      baseURL!,
      "/apps/test-app",
      "App Detail (test-app)"
    );
    // May 404 if app doesn't exist, but should never 500
    expect(result.status).toBeLessThan(500);
  });

  test("app changelog page should not 500", async ({ baseURL }) => {
    const result = await checkRouteHealth(
      baseURL!,
      "/apps/test-app/changelog",
      "App Changelog"
    );
    expect(result.status).toBeLessThan(500);
  });

  test("app docs page should not 500", async ({ baseURL }) => {
    const result = await checkRouteHealth(
      baseURL!,
      "/apps/test-app/docs",
      "App Docs"
    );
    expect(result.status).toBeLessThan(500);
  });

  test("app faq page should not 500", async ({ baseURL }) => {
    const result = await checkRouteHealth(
      baseURL!,
      "/apps/test-app/faq",
      "App FAQ"
    );
    expect(result.status).toBeLessThan(500);
  });

  test("app guides page should not 500", async ({ baseURL }) => {
    const result = await checkRouteHealth(
      baseURL!,
      "/apps/test-app/guides",
      "App Guides"
    );
    expect(result.status).toBeLessThan(500);
  });

  test("help article detail should not 500", async ({ baseURL }) => {
    const result = await checkRouteHealth(
      baseURL!,
      "/help/getting-started",
      "Help Article Detail"
    );
    expect(result.status).toBeLessThan(500);
  });
});
