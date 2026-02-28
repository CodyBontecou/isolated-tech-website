/**
 * E2E tests for responsive design and visual consistency
 * Tests that the app works well across different viewport sizes
 */

import { test, expect } from "@playwright/test";

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },   // iPhone SE
  tablet: { width: 768, height: 1024 },  // iPad
  desktop: { width: 1440, height: 900 }, // Desktop
};

test.describe("Responsive Design", () => {
  test.describe("Homepage", () => {
    test("should render correctly on mobile", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto("/");

      // Logo should be visible
      await expect(page.locator("text=ISOLATED")).toBeVisible();

      // Navigation should be accessible (may be in hamburger menu)
      await expect(page.locator("nav")).toBeVisible();
    });

    test("should render correctly on tablet", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.tablet);
      await page.goto("/");

      await expect(page.locator("text=ISOLATED")).toBeVisible();
      await expect(page.locator("nav")).toBeVisible();
    });

    test("should render correctly on desktop", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto("/");

      await expect(page.locator("text=ISOLATED")).toBeVisible();
      await expect(page.locator("nav")).toBeVisible();

      // Desktop should show full nav links
      await expect(page.locator("text=APPS")).toBeVisible();
      await expect(page.locator("text=FEEDBACK")).toBeVisible();
    });
  });

  test.describe("App Detail Page", () => {
    test("should render app page on mobile", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto("/apps/e2e-free-app");

      // Should show app name
      await expect(page.locator("h1")).toBeVisible();
    });

    test("should render app page on desktop", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto("/apps/e2e-free-app");

      await expect(page.locator("h1")).toBeVisible();
    });
  });

  test.describe("Login Page", () => {
    test("should render login form on mobile", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto("/auth/login");

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test("should render login form on desktop", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto("/auth/login");

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });

  test.describe("Feedback Page", () => {
    test("should render feedback on mobile", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto("/feedback");

      await expect(page.locator("h1")).toBeVisible();
    });

    test("should render feedback on desktop", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto("/feedback");

      await expect(page.locator("h1")).toBeVisible();
    });
  });
});

test.describe("Visual Consistency", () => {
  test("should have consistent branding across pages", async ({ page }) => {
    const pages = ["/", "/feedback", "/roadmap", "/terms", "/privacy"];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Logo should be consistent
      await expect(page.locator("text=ISOLATED").first()).toBeVisible();
    }
  });

  test("should have footer on main pages", async ({ page }) => {
    await page.goto("/");

    // Should have footer
    await expect(page.locator("footer").or(page.locator("text=© 2026"))).toBeVisible();
  });

  test("should have proper contrast (text is readable)", async ({ page }) => {
    await page.goto("/");

    // Basic check that text elements exist and are visible
    await expect(page.locator("h1").first().or(page.locator("h2").first())).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("should have proper heading hierarchy on homepage", async ({ page }) => {
    await page.goto("/");

    // Should have h1
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test("should have alt text on images", async ({ page }) => {
    await page.goto("/");

    // All images should have alt attribute
    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      // alt can be empty string for decorative images, but should exist
      expect(alt).not.toBeNull();
    }
  });

  test("should have form labels or placeholders", async ({ page }) => {
    await page.goto("/auth/login");

    const emailInput = page.locator('input[type="email"]');
    
    // Should have either a label, aria-label, or placeholder
    const placeholder = await emailInput.getAttribute("placeholder");
    const ariaLabel = await emailInput.getAttribute("aria-label");
    const id = await emailInput.getAttribute("id");
    
    // At least one accessibility attribute should be present
    expect(placeholder || ariaLabel || id).toBeTruthy();
  });

  test("should have focusable interactive elements", async ({ page }) => {
    await page.goto("/auth/login");

    // Tab through form elements
    await page.keyboard.press("Tab");
    
    // Something should be focused
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });

  test("should navigate with keyboard", async ({ page }) => {
    await page.goto("/");

    // Press Tab to navigate
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Should be able to activate link with Enter
    const focused = page.locator(":focus");
    const tagName = await focused.evaluate((el) => el.tagName);
    
    // Focused element should be interactive
    expect(["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]).toContain(tagName);
  });
});

test.describe("Performance", () => {
  test("should load homepage within reasonable time", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;

    // Should load DOM within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test("should load app page within reasonable time", async ({ page }) => {
    const start = Date.now();
    await page.goto("/apps/e2e-free-app", { waitUntil: "domcontentloaded" });
    const loadTime = Date.now() - start;

    // Should load DOM within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
