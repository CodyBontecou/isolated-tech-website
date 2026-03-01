/**
 * Visual Regression Tests - Public Pages
 * 
 * Tests homepage, app listing, and app detail pages.
 * Uses existing data in the database - no seeding required.
 */

import { test, expect } from "@playwright/test";
import { waitForVisualStability, hideDynamicElements } from "./helpers";

test.describe("Public Pages Visual Regression", () => {
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
    test("app detail page", async ({ page }) => {
      // Navigate to apps page first, then click on first app
      await page.goto("/apps");
      await waitForVisualStability(page);
      
      // Find first app link and navigate
      const appLink = page.locator('a[href^="/apps/"]').first();
      if (await appLink.isVisible()) {
        await appLink.click();
        await waitForVisualStability(page);
        await expect(page).toHaveScreenshot("app-detail.png");
      }
    });

    test("app detail page full scroll", async ({ page }) => {
      await page.goto("/apps");
      await waitForVisualStability(page);
      
      const appLink = page.locator('a[href^="/apps/"]').first();
      if (await appLink.isVisible()) {
        await appLink.click();
        await waitForVisualStability(page);
        await expect(page).toHaveScreenshot("app-detail-full.png", {
          fullPage: true,
        });
      }
    });
  });
});
