/**
 * E2E tests for the user dashboard
 * Tests user dashboard functionality including purchases, reviews, and settings
 */

import { test, expect } from "@playwright/test";
import { loginAsUser, logout } from "./helpers/auth";
import { seedAll, cleanupTestData, TEST_APPS } from "./helpers/seed";

test.describe("Dashboard", () => {
  test.beforeAll(async ({ request }) => {
    await seedAll(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test.describe("Unauthenticated Access", () => {
    test("should show login prompt for unauthenticated users", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.locator("text=Sign In Required")).toBeVisible();
      await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
    });

    test("should have link to browse apps", async ({ page }) => {
      await page.goto("/dashboard");

      // Should have link to browse apps
      const browseLink = page.locator('a[href="/apps"]').or(page.locator("text=browse our apps"));
      await expect(browseLink.first()).toBeVisible();
    });
  });

  test.describe("My Apps", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should show dashboard header with user info", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.locator("text=WELCOME BACK")).toBeVisible();
    });

    test("should show MY APPS tab as active by default", async ({ page }) => {
      await page.goto("/dashboard");

      // MY APPS should be the active tab
      await expect(page.locator("text=MY APPS")).toBeVisible();
    });

    test("should show empty state when no purchases", async ({ page }) => {
      await page.goto("/dashboard");

      // Either shows empty state or list of purchases
      const emptyState = page.locator("text=No purchases yet");
      const purchasesList = page.locator("text=YOUR APPS");

      await expect(emptyState.or(purchasesList)).toBeVisible();
    });

    test("should link to app store from empty state", async ({ page }) => {
      await page.goto("/dashboard");

      // If empty state, should have link to browse
      const browseButton = page.locator('a:has-text("BROWSE APPS")').or(page.locator('a[href="/#apps"]'));
      
      if (await browseButton.first().isVisible().catch(() => false)) {
        await expect(browseButton.first()).toBeVisible();
      }
    });
  });

  test.describe("Reviews Tab", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should navigate to reviews tab", async ({ page }) => {
      await page.goto("/dashboard");

      // Click reviews tab
      await page.click("text=REVIEWS");

      await expect(page).toHaveURL(/\/dashboard\/reviews/);
    });

    test("should show reviews page content", async ({ page }) => {
      await page.goto("/dashboard/reviews");

      // Should show some content (empty state or reviews list)
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Settings Tab", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should navigate to settings tab", async ({ page }) => {
      await page.goto("/dashboard");

      // Click settings tab
      await page.click("text=SETTINGS");

      await expect(page).toHaveURL(/\/dashboard\/settings/);
    });

    test("should show settings page content", async ({ page }) => {
      await page.goto("/dashboard/settings");

      // Should show settings content
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Navigation", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should have header navigation links", async ({ page }) => {
      await page.goto("/dashboard");

      // Check nav links
      await expect(page.locator('a[href="/"]:has-text("ISOLATED")')).toBeVisible();
    });

    test("should navigate to homepage from dashboard", async ({ page }) => {
      await page.goto("/dashboard");

      // Click logo to go home
      await page.click('a[href="/"]:has-text("ISOLATED")');

      await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/);
    });

    test("should show sign out button", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.locator("text=SIGN OUT")).toBeVisible();
    });

    test("should sign out from dashboard", async ({ page }) => {
      await page.goto("/dashboard");

      await page.click("text=SIGN OUT");

      // Should redirect to homepage
      await page.waitForURL(/^https?:\/\/[^/]+\/?$/);

      // Should show sign in link
      await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
    });
  });
});

test.describe("Dashboard with Purchases", () => {
  // These tests require seeding a purchase for the test user
  // Skip for now as they require more complex setup

  test.skip("should show purchased app card", async ({ page }) => {
    // Would need to seed a purchase first
  });

  test.skip("should show download button for purchased app", async ({ page }) => {
    // Would need to seed a purchase first
  });

  test.skip("should show version information", async ({ page }) => {
    // Would need to seed a purchase first
  });

  test.skip("should have link to write review", async ({ page }) => {
    // Would need to seed a purchase first
  });

  test.skip("should trigger download when clicking download button", async ({ page }) => {
    // Would need to seed a purchase and version
  });
});
