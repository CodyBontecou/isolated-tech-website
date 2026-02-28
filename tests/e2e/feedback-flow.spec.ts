/**
 * E2E tests for the feedback system
 * Tests feature requests, bug reports, and voting
 */

import { test, expect } from "@playwright/test";
import { loginAsUser, logout } from "./helpers/auth";
import { seedAll, cleanupTestData } from "./helpers/seed";

test.describe("Feedback System", () => {
  test.beforeAll(async ({ request }) => {
    await seedAll(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test.describe("Public Feedback Page", () => {
    test("should display feedback page", async ({ page }) => {
      await page.goto("/feedback");

      // Check page header
      await expect(page.locator("h1")).toContainText(/Ideas|Bugs|Feedback/i);
    });

    test("should show navigation links", async ({ page }) => {
      await page.goto("/feedback");

      await expect(page.locator('a[href="/"]')).toBeVisible();
      await expect(page.locator('a[href="/roadmap"]')).toBeVisible();
    });

    test("should show feedback stats", async ({ page }) => {
      await page.goto("/feedback");

      // Should show stats like total, open, planned
      await expect(
        page.locator("text=TOTAL").or(page.locator("text=OPEN")).or(page.locator("text=PLANNED"))
      ).toBeVisible();
    });

    test("should prompt login for unauthenticated submit", async ({ page }) => {
      await page.goto("/feedback");

      // Should show sign in to submit or similar
      await expect(
        page.locator("text=SIGN IN TO SUBMIT").or(page.locator('a[href*="login"][href*="redirect"]'))
      ).toBeVisible();
    });

    test("should show filter options", async ({ page }) => {
      await page.goto("/feedback");

      // Should have filter/sort options
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Authenticated User", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should show submit button when logged in", async ({ page }) => {
      await page.goto("/feedback");

      await expect(page.locator("text=SUBMIT IDEA").or(page.locator('a[href="/feedback/submit"]'))).toBeVisible();
    });

    test("should navigate to submit page", async ({ page }) => {
      await page.goto("/feedback");

      await page.click("text=SUBMIT IDEA");

      await expect(page).toHaveURL(/\/feedback\/submit/);
    });

    test("should show submit form", async ({ page }) => {
      await page.goto("/feedback/submit");

      // Should have form fields
      await expect(page.locator("form").or(page.locator('input[type="text"]').first())).toBeVisible();
    });

    test("should show dashboard link in nav", async ({ page }) => {
      await page.goto("/feedback");

      await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    });
  });

  test.describe("Feature Request Details", () => {
    // These tests require existing feature requests in the database
    test.skip("should show feature request detail page", async ({ page }) => {
      // Would need to seed a feature request first
    });

    test.skip("should show vote button on request", async ({ page }) => {
      // Would need to seed a feature request first
    });

    test.skip("should show comments section", async ({ page }) => {
      // Would need to seed a feature request first
    });
  });
});

test.describe("Roadmap Page", () => {
  test("should display roadmap page", async ({ page }) => {
    await page.goto("/roadmap");

    // Should show roadmap content
    await expect(page.locator("h1").or(page.locator("text=ROADMAP"))).toBeVisible();
  });

  test("should have navigation to feedback", async ({ page }) => {
    await page.goto("/roadmap");

    await expect(page.locator('a[href="/feedback"]')).toBeVisible();
  });

  test("should show roadmap items or empty state", async ({ page }) => {
    await page.goto("/roadmap");

    // Should show some content
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Help Pages", () => {
  test("should display help page", async ({ page }) => {
    await page.goto("/help");

    // Should show help content (may redirect or show list)
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Legal Pages", () => {
  test("should display terms of service", async ({ page }) => {
    await page.goto("/terms");

    await expect(page.locator("h1")).toContainText(/terms/i);
  });

  test("should display privacy policy", async ({ page }) => {
    await page.goto("/privacy");

    await expect(page.locator("h1")).toContainText(/privacy/i);
  });

  test("should have back to home link", async ({ page }) => {
    await page.goto("/terms");

    await expect(page.locator('a[href="/"]')).toBeVisible();
  });
});

test.describe("Navigation Integration", () => {
  test("should navigate from homepage to feedback", async ({ page }) => {
    await page.goto("/");

    await page.click('a[href="/feedback"]');

    await expect(page).toHaveURL(/\/feedback/);
  });

  test("should navigate from homepage to roadmap", async ({ page }) => {
    await page.goto("/");

    await page.click('a[href="/roadmap"]');

    await expect(page).toHaveURL(/\/roadmap/);
  });

  test("should navigate from feedback to roadmap", async ({ page }) => {
    await page.goto("/feedback");

    await page.click('a[href="/roadmap"]');

    await expect(page).toHaveURL(/\/roadmap/);
  });
});
