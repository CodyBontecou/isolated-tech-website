/**
 * Visual Regression Tests - Admin Pages
 * 
 * Tests admin dashboard and management pages
 */

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import { seedAll, cleanupTestData } from "../helpers/seed";
import { waitForVisualStability, hideDynamicElements } from "./helpers";

test.describe("Admin Pages Visual Regression", () => {
  test.beforeAll(async ({ request }) => {
    await seedAll(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test.beforeEach(async ({ page }) => {
    await hideDynamicElements(page);
    // Login as admin for all tests
    await loginAsAdmin(page, "visual-admin@test.com");
  });

  test.describe("Admin Dashboard", () => {
    test("admin dashboard", async ({ page }) => {
      await page.goto("/admin");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-dashboard.png");
    });

    test("admin dashboard full", async ({ page }) => {
      await page.goto("/admin");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-dashboard-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Apps Management", () => {
    test("apps list page", async ({ page }) => {
      await page.goto("/admin/apps");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-apps-list.png");
    });

    test("apps list full", async ({ page }) => {
      await page.goto("/admin/apps");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-apps-list-full.png", {
        fullPage: true,
      });
    });

    test("new app form", async ({ page }) => {
      await page.goto("/admin/apps/new");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-apps-new.png");
    });
  });

  test.describe("Users Management", () => {
    test("users list page", async ({ page }) => {
      await page.goto("/admin/users");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-users-list.png");
    });

    test("users list full", async ({ page }) => {
      await page.goto("/admin/users");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-users-list-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Purchases Management", () => {
    test("purchases list page", async ({ page }) => {
      await page.goto("/admin/purchases");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-purchases-list.png");
    });

    test("purchases list full", async ({ page }) => {
      await page.goto("/admin/purchases");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-purchases-list-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Codes Management", () => {
    test("codes list page", async ({ page }) => {
      await page.goto("/admin/codes");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-codes-list.png");
    });

    test("new code form", async ({ page }) => {
      await page.goto("/admin/codes/new");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-codes-new.png");
    });
  });

  test.describe("Subscribers Management", () => {
    test("subscribers list page", async ({ page }) => {
      await page.goto("/admin/subscribers");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-subscribers-list.png");
    });
  });

  test.describe("Feature Requests", () => {
    test("feature requests page", async ({ page }) => {
      await page.goto("/admin/feature-requests");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-feature-requests.png");
    });
  });

  test.describe("Feedback Management", () => {
    test("feedback list page", async ({ page }) => {
      await page.goto("/admin/feedback");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("admin-feedback-list.png");
    });
  });
});
