/**
 * Visual Regression Test Helpers
 * 
 * Utilities for consistent screenshot capture
 */

import { Page, expect } from "@playwright/test";

/**
 * Wait for page to be visually stable before taking screenshot
 * - Waits for network idle
 * - Waits for images to load
 * - Waits for fonts to load
 */
export async function waitForVisualStability(page: Page): Promise<void> {
  // Wait for network to settle
  await page.waitForLoadState("networkidle");
  
  // Wait for all images to load
  await page.evaluate(async () => {
    const images = document.querySelectorAll("img");
    await Promise.all(
      Array.from(images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.addEventListener("load", resolve);
              img.addEventListener("error", resolve);
            })
        )
    );
  });
  
  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);
  
  // Small delay to ensure any CSS transitions complete
  await page.waitForTimeout(100);
}

/**
 * Take a full-page screenshot with stability checks
 */
export async function takeStableScreenshot(
  page: Page,
  name: string,
  options: { fullPage?: boolean; clip?: { x: number; y: number; width: number; height: number } } = {}
): Promise<void> {
  await waitForVisualStability(page);
  
  await expect(page).toHaveScreenshot(name, {
    fullPage: options.fullPage ?? false,
    clip: options.clip,
    // Mask dynamic content that changes between runs
    mask: [
      // Mask timestamps if present
      page.locator("[data-testid='timestamp']"),
      page.locator("time"),
    ],
  });
}

/**
 * Navigate to page and wait for visual stability
 */
export async function navigateAndStabilize(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForVisualStability(page);
}

/**
 * Hide dynamic elements that change between test runs
 * Call this before taking screenshots
 */
export async function hideDynamicElements(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      /* Hide timestamps and other dynamic content */
      [data-testid="timestamp"],
      .relative-time,
      .dynamic-counter {
        visibility: hidden !important;
      }
      
      /* Disable animations and transitions */
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}
