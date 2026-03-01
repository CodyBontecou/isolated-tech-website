/**
 * Visual Regression Tests - Authentication Pages
 * 
 * Tests login, verify, and error states
 */

import { test, expect } from "@playwright/test";
import { waitForVisualStability, hideDynamicElements } from "./helpers";

test.describe("Auth Pages Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    await hideDynamicElements(page);
  });

  test.describe("Login Page", () => {
    test("login page default state", async ({ page }) => {
      await page.goto("/auth/login");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("login-default.png");
    });

    test("login page with email entered", async ({ page }) => {
      await page.goto("/auth/login");
      await waitForVisualStability(page);
      
      // Fill in an email address
      const emailInput = page.locator('input[type="email"]');
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill("test@example.com");
        await expect(page).toHaveScreenshot("login-with-email.png");
      }
    });

    test("login page full", async ({ page }) => {
      await page.goto("/auth/login");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("login-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Verify Page", () => {
    test("verify page", async ({ page }) => {
      await page.goto("/auth/verify");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("verify.png");
    });

    test("verify page with email param", async ({ page }) => {
      await page.goto("/auth/verify?email=test@example.com");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("verify-with-email.png");
    });
  });

  test.describe("Login Error States", () => {
    test("login with invalid email shows error", async ({ page }) => {
      await page.goto("/auth/login");
      await waitForVisualStability(page);
      
      // Try to submit with invalid email
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      if (await emailInput.isVisible().catch(() => false)) {
        await emailInput.fill("not-an-email");
        
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          
          // Wait for error state
          await page.waitForTimeout(500);
          await expect(page).toHaveScreenshot("login-error-invalid-email.png");
        }
      }
    });
  });
});
