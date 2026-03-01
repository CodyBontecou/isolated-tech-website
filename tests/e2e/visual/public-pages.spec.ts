/**
 * Visual Regression Tests - Public Pages
 * 
 * Tests homepage, app listing, and app detail pages
 */

import { test, expect } from "@playwright/test";
import { seedAll, cleanupTestData, TEST_APPS } from "../helpers/seed";
import { waitForVisualStability, hideDynamicElements } from "./helpers";

test.describe("Public Pages Visual Regression", () => {
  test.beforeAll(async ({ request }) => {
    await seedAll(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test.beforeEach(async ({ page }) => {
    // Hide dynamic elements that change between runs
    await hideDynamicElements(page);
  });

  test.describe("Homepage", () => {
    test("homepage above the fold", async ({ page }) => {
      await page.goto("/");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("homepage-above-fold.png");
    });

    test("homepage full page", async ({ page }) => {
      await page.goto("/");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("homepage-full.png", { 
        fullPage: true 
      });
    });

    test("homepage with filters visible", async ({ page }) => {
      await page.goto("/");
      await waitForVisualStability(page);
      
      // Scroll to filters section if needed
      const filtersSection = page.locator("[class*='filters'], [class*='filter-bar']").first();
      if (await filtersSection.isVisible().catch(() => false)) {
        await filtersSection.scrollIntoViewIfNeeded();
        await expect(page).toHaveScreenshot("homepage-filters.png");
      }
    });
  });

  test.describe("App Listing", () => {
    test("apps page", async ({ page }) => {
      await page.goto("/apps");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("apps-listing.png");
    });

    test("apps page full", async ({ page }) => {
      await page.goto("/apps");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("apps-listing-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("App Detail", () => {
    test("app detail page - free app", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.FREE}`);
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("app-detail-free.png");
    });

    test("app detail page - paid app", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.PAID}`);
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("app-detail-paid.png");
    });

    test("app detail page full scroll", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.FREE}`);
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("app-detail-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("App Sub-pages", () => {
    test("app changelog page", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.FREE}/changelog`);
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("app-changelog.png");
    });

    test("app docs page", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.FREE}/docs`);
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("app-docs.png");
    });

    test("app faq page", async ({ page }) => {
      await page.goto(`/apps/${TEST_APPS.FREE}/faq`);
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("app-faq.png");
    });
  });
});
