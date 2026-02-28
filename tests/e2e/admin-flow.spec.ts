/**
 * E2E tests for the admin dashboard
 * Tests admin functionality including app management, versions, and user management
 */

import { test, expect } from "@playwright/test";
import { loginAsUser, loginAsAdmin, logout } from "./helpers/auth";
import { seedAll, cleanupTestData, TEST_APPS } from "./helpers/seed";

test.describe("Admin Dashboard", () => {
  test.beforeAll(async ({ request }) => {
    await seedAll(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test.describe("Access Control", () => {
    test("should redirect unauthenticated users", async ({ page }) => {
      await page.goto("/admin");

      // Should redirect to login or show access denied
      await page.waitForURL((url) => !url.pathname.startsWith("/admin"), { timeout: 5000 });
    });

    test("should redirect non-admin users", async ({ page }) => {
      await loginAsUser(page);

      await page.goto("/admin");

      // Should redirect away from admin
      await page.waitForURL((url) => !url.pathname.startsWith("/admin"), { timeout: 5000 });

      await logout(page);
    });

    test("should allow admin access", async ({ page }) => {
      await loginAsAdmin(page);

      await page.goto("/admin");

      // Should stay on admin page
      await expect(page).toHaveURL(/\/admin/);
      await expect(page.locator("text=Dashboard")).toBeVisible();

      await logout(page);
    });
  });

  test.describe("Admin Dashboard Home", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should show dashboard title", async ({ page }) => {
      await page.goto("/admin");

      await expect(page.locator("h1:has-text('Dashboard')")).toBeVisible();
    });

    test("should show stats grid", async ({ page }) => {
      await page.goto("/admin");

      // Should show revenue and user stats
      await expect(page.locator("text=REVENUE")).toBeVisible();
      await expect(page.locator("text=TOTAL USERS").or(page.locator("text=USERS"))).toBeVisible();
    });

    test("should show recent purchases section", async ({ page }) => {
      await page.goto("/admin");

      await expect(page.locator("text=RECENT PURCHASES")).toBeVisible();
    });

    test("should show quick actions", async ({ page }) => {
      await page.goto("/admin");

      await expect(page.locator("text=QUICK ACTIONS").or(page.locator("text=NEW APP"))).toBeVisible();
    });

    test("should have navigation sidebar", async ({ page }) => {
      await page.goto("/admin");

      // Check for admin navigation links
      await expect(page.locator('a[href="/admin/apps"]')).toBeVisible();
    });
  });

  test.describe("Apps Management", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should navigate to apps list", async ({ page }) => {
      await page.goto("/admin/apps");

      await expect(page.locator("h1:has-text('Apps')")).toBeVisible();
    });

    test("should show apps table", async ({ page }) => {
      await page.goto("/admin/apps");

      // Should show table headers or empty state
      await expect(
        page.locator("text=APP").or(page.locator("text=No apps yet"))
      ).toBeVisible();
    });

    test("should have new app button", async ({ page }) => {
      await page.goto("/admin/apps");

      await expect(page.locator('a:has-text("NEW APP")')).toBeVisible();
    });

    test("should navigate to new app form", async ({ page }) => {
      await page.goto("/admin/apps");

      await page.click('a:has-text("NEW APP")');

      await expect(page).toHaveURL(/\/admin\/apps\/new/);
      await expect(page.locator("h1:has-text('New App')")).toBeVisible();
    });

    test("should show new app form fields", async ({ page }) => {
      await page.goto("/admin/apps/new");

      // Should have form fields
      await expect(page.locator('input[name="name"]').or(page.locator('input[placeholder*="name" i]'))).toBeVisible();
    });

    test("should show test apps in list", async ({ page }) => {
      await page.goto("/admin/apps");

      // Check for E2E test apps
      await expect(page.locator("text=E2E Free App").or(page.locator("text=E2E Paid App"))).toBeVisible();
    });

    test("should navigate to app edit page", async ({ page }) => {
      await page.goto("/admin/apps");

      // Click edit on first app
      const editButton = page.locator('a:has-text("EDIT")').first();
      await editButton.click();

      await expect(page).toHaveURL(/\/admin\/apps\/[^/]+$/);
    });
  });

  test.describe("Discount Codes", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should navigate to codes page", async ({ page }) => {
      await page.goto("/admin/codes");

      await expect(page.locator("h1")).toContainText(/code/i);
    });

    test("should have new code button", async ({ page }) => {
      await page.goto("/admin/codes");

      await expect(page.locator('a:has-text("NEW")').or(page.locator('a[href="/admin/codes/new"]'))).toBeVisible();
    });

    test("should navigate to new code form", async ({ page }) => {
      await page.goto("/admin/codes/new");

      await expect(page.locator("h1")).toContainText(/new/i);
    });
  });

  test.describe("Users Management", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should navigate to users page", async ({ page }) => {
      await page.goto("/admin/users");

      await expect(page.locator("h1")).toContainText(/user/i);
    });

    test("should show users table", async ({ page }) => {
      await page.goto("/admin/users");

      // Should show table or user list
      await expect(page.locator("table").or(page.locator("text=EMAIL"))).toBeVisible();
    });
  });

  test.describe("Purchases", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should navigate to purchases page", async ({ page }) => {
      await page.goto("/admin/purchases");

      await expect(page.locator("h1")).toContainText(/purchase/i);
    });
  });

  test.describe("Downloads", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should navigate to downloads page", async ({ page }) => {
      await page.goto("/admin/downloads");

      await expect(page.locator("h1")).toContainText(/download/i);
    });
  });

  test.describe("Feedback Management", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should navigate to feedback page", async ({ page }) => {
      await page.goto("/admin/feedback");

      await expect(page.locator("h1")).toContainText(/feedback/i);
    });

    test("should navigate to feature requests page", async ({ page }) => {
      await page.goto("/admin/feature-requests");

      await expect(page.locator("h1")).toContainText(/feature/i);
    });
  });

  test.describe("Admin Navigation", () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    test("should have admin link in nav when on admin pages", async ({ page }) => {
      await page.goto("/admin");

      // Should show admin navigation
      await expect(page.locator('a[href="/admin"]').first()).toBeVisible();
    });

    test("should return to main site from admin", async ({ page }) => {
      await page.goto("/admin");

      // Click logo to go home
      await page.click('a[href="/"]:has-text("ISOLATED")');

      await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/);
    });
  });
});
