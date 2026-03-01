/**
 * Visual Regression Tests - Dashboard Pages
 * 
 * Tests authenticated user dashboard pages
 */

import { test, expect } from "@playwright/test";
import { loginAsUser } from "../helpers/auth";
import { seedAll, cleanupTestData, seedPurchase, TEST_APPS } from "../helpers/seed";
import { waitForVisualStability, hideDynamicElements } from "./helpers";

test.describe("Dashboard Pages Visual Regression", () => {
  test.beforeAll(async ({ request }) => {
    await seedAll(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test.beforeEach(async ({ page }) => {
    await hideDynamicElements(page);
  });

  test.describe("Dashboard - Empty State", () => {
    test("dashboard with no purchases", async ({ page }) => {
      // Login as a fresh user with no purchases
      await loginAsUser(page, "visual-test-empty@test.com");
      
      await page.goto("/dashboard");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("dashboard-empty.png");
    });
  });

  test.describe("Dashboard - With Data", () => {
    test("dashboard with purchases", async ({ page }) => {
      // Login and seed a purchase
      const user = await loginAsUser(page, "visual-test-user@test.com");
      
      // Seed a purchase for this user
      try {
        await seedPurchase(page.request, user.id, TEST_APPS.FREE);
      } catch {
        // Purchase may already exist, continue
      }
      
      await page.goto("/dashboard");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("dashboard-with-purchases.png");
    });

    test("dashboard full page", async ({ page }) => {
      await loginAsUser(page, "visual-test-user@test.com");
      
      await page.goto("/dashboard");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("dashboard-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Settings Page", () => {
    test("settings page", async ({ page }) => {
      await loginAsUser(page, "visual-test-user@test.com");
      
      await page.goto("/dashboard/settings");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("settings.png");
    });

    test("settings page full", async ({ page }) => {
      await loginAsUser(page, "visual-test-user@test.com");
      
      await page.goto("/dashboard/settings");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("settings-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Reviews Page", () => {
    test("reviews page empty", async ({ page }) => {
      await loginAsUser(page, "visual-test-empty@test.com");
      
      await page.goto("/dashboard/reviews");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("reviews-empty.png");
    });

    test("reviews page", async ({ page }) => {
      await loginAsUser(page, "visual-test-user@test.com");
      
      await page.goto("/dashboard/reviews");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("reviews.png");
    });
  });
});
