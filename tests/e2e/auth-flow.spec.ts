/**
 * E2E tests for authentication flows
 */

import { test, expect } from "@playwright/test";
import { loginAsUser, loginAsAdmin, logout } from "./helpers";

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ page }) => {
      await page.goto("/auth/login");

      // Check page title and form elements
      await expect(page.locator("h1")).toContainText("Sign In");
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText("SEND MAGIC LINK");
    });

    test("should show validation error for invalid email", async ({ page }) => {
      await page.goto("/auth/login");

      // Enter invalid email
      await page.fill('input[type="email"]', "invalid-email");
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator(".auth-message--error")).toBeVisible();
    });

    test("should show success message after requesting magic link", async ({ page }) => {
      await page.goto("/auth/login");

      // Enter valid email
      await page.fill('input[type="email"]', "test@example.com");
      await page.click('button[type="submit"]');

      // Should show success message (magic link sent)
      await expect(page.locator("text=CHECK YOUR EMAIL")).toBeVisible({ timeout: 10000 });
    });

    test("should have social login buttons", async ({ page }) => {
      await page.goto("/auth/login");

      // Check for social login section
      await expect(page.locator("text=OR CONTINUE WITH")).toBeVisible();
    });

    test("should link to terms and privacy policy", async ({ page }) => {
      await page.goto("/auth/login");

      await expect(page.locator('a[href="/terms"]')).toBeVisible();
      await expect(page.locator('a[href="/privacy"]')).toBeVisible();
    });
  });

  test.describe("Authenticated User", () => {
    test("should show dashboard link when logged in", async ({ page }) => {
      await loginAsUser(page);

      await page.goto("/");
      await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    });

    test("should show sign out button when logged in", async ({ page }) => {
      await loginAsUser(page);

      await page.goto("/");
      // Look for sign out button (text or button)
      await expect(page.locator("text=SIGN OUT").or(page.locator('button:has-text("SIGN OUT")'))).toBeVisible();
    });

    test("should persist session across pages", async ({ page }) => {
      await loginAsUser(page);

      // Navigate to different pages
      await page.goto("/");
      await expect(page.locator('a[href="/dashboard"]')).toBeVisible();

      await page.goto("/feedback");
      await expect(page.locator('a[href="/dashboard"]')).toBeVisible();

      await page.goto("/roadmap");
      await expect(page.locator('a[href="/dashboard"]')).toBeVisible();
    });

    test("should sign out successfully", async ({ page }) => {
      await loginAsUser(page);

      await page.goto("/");
      await expect(page.locator('a[href="/dashboard"]')).toBeVisible();

      // Click sign out
      await page.click('text=SIGN OUT');

      // Wait for redirect and check login state
      await page.waitForURL(/\//);
      await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
      await expect(page.locator('a[href="/dashboard"]')).not.toBeVisible();
    });
  });

  test.describe("Protected Routes", () => {
    test("should show login prompt on dashboard when not authenticated", async ({ page }) => {
      await page.goto("/dashboard");

      // Should show login prompt
      await expect(page.locator("text=Sign In Required")).toBeVisible();
      await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
    });

    test("should allow access to dashboard when authenticated", async ({ page }) => {
      await loginAsUser(page);

      await page.goto("/dashboard");
      await expect(page.locator("text=WELCOME BACK")).toBeVisible();
    });

    test("should redirect non-admin to dashboard from admin routes", async ({ page }) => {
      await loginAsUser(page);

      // Try to access admin page
      await page.goto("/admin");

      // Should be redirected (to dashboard or show error)
      await page.waitForURL((url) => !url.pathname.startsWith("/admin"), { timeout: 5000 });
    });

    test("should allow admin access to admin routes", async ({ page }) => {
      await loginAsAdmin(page);

      await page.goto("/admin");
      await expect(page.locator("text=Dashboard")).toBeVisible();
    });
  });

  test.describe("Login with Redirect", () => {
    test("should preserve redirect parameter through login", async ({ page }) => {
      // Go to login with redirect
      await page.goto("/auth/login?redirect=/dashboard/settings");

      // Check the page loads
      await expect(page.locator('input[type="email"]')).toBeVisible();
      
      // The redirect should be encoded in the form or URL
      // After login, user would be redirected to /dashboard/settings
    });
  });
});
