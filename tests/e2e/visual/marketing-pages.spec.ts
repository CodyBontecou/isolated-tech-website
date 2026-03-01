/**
 * Visual Regression Tests - Marketing & Info Pages
 * 
 * Tests changelog, roadmap, feedback, help, privacy, terms
 */

import { test, expect } from "@playwright/test";
import { seedAll, cleanupTestData } from "../helpers/seed";
import { waitForVisualStability, hideDynamicElements } from "./helpers";

test.describe("Marketing Pages Visual Regression", () => {
  test.beforeAll(async ({ request }) => {
    await seedAll(request);
  });

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test.beforeEach(async ({ page }) => {
    await hideDynamicElements(page);
  });

  test.describe("Ship Log (Changelog)", () => {
    test("changelog page", async ({ page }) => {
      await page.goto("/changelog");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("changelog.png");
    });

    test("changelog page full", async ({ page }) => {
      await page.goto("/changelog");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("changelog-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Feedback", () => {
    test("feedback page", async ({ page }) => {
      await page.goto("/feedback");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("feedback.png");
    });

    test("feedback page full", async ({ page }) => {
      await page.goto("/feedback");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("feedback-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Roadmap", () => {
    test("roadmap page", async ({ page }) => {
      await page.goto("/roadmap");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("roadmap.png");
    });

    test("roadmap page full", async ({ page }) => {
      await page.goto("/roadmap");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("roadmap-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Help Center", () => {
    test("help index page", async ({ page }) => {
      await page.goto("/help");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("help-index.png");
    });

    test("help page full", async ({ page }) => {
      await page.goto("/help");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("help-full.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Legal Pages", () => {
    test("privacy policy page", async ({ page }) => {
      await page.goto("/privacy");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("privacy.png");
    });

    test("privacy policy full", async ({ page }) => {
      await page.goto("/privacy");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("privacy-full.png", {
        fullPage: true,
      });
    });

    test("terms of service page", async ({ page }) => {
      await page.goto("/terms");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("terms.png");
    });

    test("terms of service full", async ({ page }) => {
      await page.goto("/terms");
      await waitForVisualStability(page);
      
      await expect(page).toHaveScreenshot("terms-full.png", {
        fullPage: true,
      });
    });
  });
});
