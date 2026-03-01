/**
 * Visual Regression Tests - Dashboard Pages
 * 
 * Tests authenticated user dashboard pages.
 * Requires test auth endpoint to work.
 */

import { test, expect } from "@playwright/test";
import { loginAsUser } from "../helpers/auth";
import { waitForVisualStability, hideDynamicElements } from "./helpers";

test.describe("Dashboard Pages Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    await hideDynamicElements(page);
  });

  test.describe("Dashboard", () => {
    test("dashboard page", async ({ page }) => {
      // Try to login, skip if auth endpoint unavailable
      try {
        await loginAsUser(page, "visual-test-user@test.com");
      } catch {
        test.skip(true, "Test auth endpoint not available");
        return;
      }
      
      await page.goto("/dashboard");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("dashboard.png");
    });

    test("dashboard full page", async ({ page }) => {
      try {
        await loginAsUser(page, "visual-test-user@test.com");
      } catch {
        test.skip(true, "Test auth endpoint not available");
        return;
      }
      
      await page.goto("/dashboard");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("dashboard-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Settings Page", () => {
    test("settings page", async ({ page }) => {
      try {
        await loginAsUser(page, "visual-test-user@test.com");
      } catch {
        test.skip(true, "Test auth endpoint not available");
        return;
      }
      
      await page.goto("/dashboard/settings");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("settings.png");
    });

    test("settings page full", async ({ page }) => {
      try {
        await loginAsUser(page, "visual-test-user@test.com");
      } catch {
        test.skip(true, "Test auth endpoint not available");
        return;
      }
      
      await page.goto("/dashboard/settings");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("settings-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Reviews Page", () => {
    test("reviews page", async ({ page }) => {
      try {
        await loginAsUser(page, "visual-test-user@test.com");
      } catch {
        test.skip(true, "Test auth endpoint not available");
        return;
      }
      
      await page.goto("/dashboard/reviews");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("reviews.png");
    });
  });
});
