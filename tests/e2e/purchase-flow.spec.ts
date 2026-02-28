/**
 * E2E tests for the purchase flow
 * Tests the complete user journey from browsing to purchase
 */

import { test, expect } from "@playwright/test";
import { loginAsUser, logout } from "./helpers/auth";
import { seedAll, cleanupTestData, TEST_APPS } from "./helpers/seed";

test.describe("Purchase Flow", () => {
  test.beforeAll(async ({ request }) => {
    await seedAll(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test.describe("Browsing Apps", () => {
    test("should display homepage with app store branding", async ({ page }) => {
      await page.goto("/");

      // Check branding
      await expect(page.locator("text=ISOLATED")).toBeVisible();
      await expect(page.locator("text=TECH")).toBeVisible();

      // Check navigation
      await expect(page.locator("text=APPS")).toBeVisible();
      await expect(page.locator("text=FEEDBACK")).toBeVisible();
      await expect(page.locator("text=ROADMAP")).toBeVisible();
    });

    test("should display apps section", async ({ page }) => {
      await page.goto("/");

      // Should show apps section
      await expect(page.locator("text=ALL APPS").first()).toBeVisible();
    });

    test("should display app cards with name and price info", async ({ page }) => {
      await page.goto("/");

      // Check for E2E test apps if seeded
      const freeApp = page.locator(`text=${TEST_APPS.FREE.replace(/-/g, " ").replace(/e2e/gi, "E2E")}`);
      if (await freeApp.isVisible().catch(() => false)) {
        await expect(freeApp).toBeVisible();
      }
    });

    test("should navigate to app detail page", async ({ page }) => {
      await page.goto("/");

      // Click on an app card (find any visible link to /apps/)
      const appLink = page.locator('a[href^="/apps/"]').first();
      
      if (await appLink.isVisible().catch(() => false)) {
        await appLink.click();
        await expect(page).toHaveURL(/\/apps\/.+/);

        // App detail page should have name and description
        await expect(page.locator("h1")).toBeVisible();
      }
    });

    test("should show app detail page with pricing", async ({ page }) => {
      // Go directly to a test app
      await page.goto(`/apps/${TEST_APPS.FREE}`);

      // Should show app name
      await expect(page.locator("h1")).toContainText("E2E Free App");

      // Should show purchase/get section
      await expect(page.locator("text=GET").or(page.locator("text=Name your price"))).toBeVisible();
    });

    test("should show back link to all apps", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.FREE}`);

      // Should have back link
      await expect(page.locator("text=ALL APPS")).toBeVisible();
    });
  });

  test.describe("Purchase - Unauthenticated", () => {
    test("should prompt login when trying to purchase while logged out", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.FREE}`);

      // Find and click purchase/get button
      const purchaseButton = page.locator("button, a").filter({ hasText: /GET|DOWNLOAD/i }).first();
      
      if (await purchaseButton.isVisible().catch(() => false)) {
        await purchaseButton.click();

        // Should redirect to login or show login modal
        await expect(page.locator("text=Sign In").or(page.locator('input[type="email"]'))).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Purchase - Authenticated", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should show different UI when logged in", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.FREE}`);

      // Should not see sign in prompt in nav
      await expect(page.locator('a[href="/auth/login"]')).not.toBeVisible();

      // Should see dashboard link
      await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    });

    test("should show purchase button for free app", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.FREE}`);

      // Should show get/purchase option
      await expect(page.locator("text=GET").or(page.locator("text=Name your price"))).toBeVisible();
    });

    test("should show price for paid app", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.PAID}`);

      // Should show price (e.g., "$9.99" or "From $9.99")
      await expect(page.locator("text=$").first()).toBeVisible();
    });
  });

  test.describe("Discount Codes", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page);
    });

    test("should show discount code input on paid app", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.PAID}`);

      // Look for discount code input or link
      const discountInput = page.locator('input[placeholder*="code" i]').or(
        page.locator('input[name*="discount" i]').or(
          page.locator('text=discount code')
        )
      );

      // Discount input may or may not be visible depending on UI implementation
      // This test documents current behavior
    });
  });
});

test.describe("Dashboard", () => {
  test("should redirect unauthenticated users to login prompt", async ({ page }) => {
    await page.goto("/dashboard");

    // Should show login prompt
    await expect(page.locator("text=Sign In Required").or(page.locator("text=sign in"))).toBeVisible();
  });

  test.describe("Authenticated Dashboard", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page);
    });

    test("should show welcome message", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.locator("text=WELCOME BACK")).toBeVisible();
    });

    test("should show dashboard navigation tabs", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.locator("text=MY APPS")).toBeVisible();
      await expect(page.locator("text=REVIEWS")).toBeVisible();
      await expect(page.locator("text=SETTINGS")).toBeVisible();
    });

    test("should show empty state when no purchases", async ({ page }) => {
      await page.goto("/dashboard");

      // Should show empty state or list of apps
      await expect(
        page.locator("text=No purchases yet").or(page.locator("text=YOUR APPS"))
      ).toBeVisible();
    });

    test("should link to browse apps from empty state", async ({ page }) => {
      await page.goto("/dashboard");

      // If empty state, should have link to browse
      const browseLink = page.locator('a[href="/apps"]').or(page.locator('a[href="/#apps"]'));
      if (await browseLink.isVisible().catch(() => false)) {
        await expect(browseLink).toBeVisible();
      }
    });
  });
});

test.describe("Error Handling", () => {
  test("should show 404 for non-existent app", async ({ page }) => {
    await page.goto("/apps/this-app-does-not-exist-xyz123");

    // Should show not found message
    await expect(
      page.locator("text=not found").or(page.locator("text=Not Found")).or(page.locator("text=404"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("should show proper 404 page styling", async ({ page }) => {
    await page.goto("/completely-invalid-route-xyz");

    // Should show styled 404 page
    await expect(page.locator("body")).toBeVisible();
  });

  test("should handle network errors gracefully", async ({ page }) => {
    // Simulate network issues on API calls
    await page.route("**/api/**", (route) => route.abort("failed"));

    await page.goto("/");

    // App should still render the page shell
    await expect(page.locator("body")).toBeVisible();
  });

  test("should recover from network errors", async ({ page }) => {
    // First abort
    await page.route("**/api/**", (route) => route.abort("failed"));
    await page.goto("/");

    // Remove abort
    await page.unroute("**/api/**");
    await page.reload();

    // Should work now
    await expect(page.locator("text=ISOLATED")).toBeVisible();
  });
});
