/**
 * E2E tests for mobile sidebar navigation menu
 * Tests that the hamburger menu opens/closes correctly,
 * renders navigation links, and is properly layered above page content.
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsUser, loginAsAdmin, logout } from "./helpers/auth";

const MOBILE_VIEWPORT = { width: 375, height: 667 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/** Helper: open the mobile sidebar menu */
async function openMobileMenu(page: Page) {
  const toggle = page.locator(".mobile-site-toggle");
  await toggle.click();
  // Wait for the menu to finish sliding in
  await expect(page.locator(".mobile-site-menu--open")).toBeVisible();
}

test.describe("Mobile Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto("/");
  });

  test.describe("Hamburger Toggle", () => {
    test("should show hamburger button on mobile", async ({ page }) => {
      const toggle = page.locator(".mobile-site-toggle");
      await expect(toggle).toBeVisible();
    });

    test("should hide hamburger button on desktop", async ({ page }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
      const toggle = page.locator(".mobile-site-toggle");
      await expect(toggle).not.toBeVisible();
    });

    test("should hide desktop nav links on mobile", async ({ page }) => {
      const desktopLinks = page.locator(".nav__links");
      await expect(desktopLinks).not.toBeVisible();
    });

    test("should have correct aria attributes", async ({ page }) => {
      const toggle = page.locator(".mobile-site-toggle");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(toggle).toHaveAttribute("aria-label", "Open menu");
    });

    test("should update aria attributes when opened", async ({ page }) => {
      const toggle = page.locator(".mobile-site-toggle");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(toggle).toHaveAttribute("aria-label", "Close menu");
    });
  });

  test.describe("Menu Opening", () => {
    test("should open menu when hamburger is clicked", async ({ page }) => {
      await openMobileMenu(page);
      const menu = page.locator(".mobile-site-menu--open");
      await expect(menu).toBeVisible();
    });

    test("should show overlay when menu is open", async ({ page }) => {
      await openMobileMenu(page);
      const overlay = page.locator(".mobile-site-overlay--visible");
      await expect(overlay).toBeAttached();
    });

    test("should display menu header with title", async ({ page }) => {
      await openMobileMenu(page);
      const title = page.locator(".mobile-site-menu__title");
      await expect(title).toContainText("ISOLATED");
      await expect(title).toContainText("TECH");
    });

    test("should display close button in menu header", async ({ page }) => {
      await openMobileMenu(page);
      const closeBtn = page.locator(".mobile-site-menu__close");
      await expect(closeBtn).toBeVisible();
    });
  });

  test.describe("Navigation Links", () => {
    test("should display all navigation links", async ({ page }) => {
      await openMobileMenu(page);
      const nav = page.locator(".mobile-site-menu__nav");

      await expect(nav.getByText("Home")).toBeVisible();
      await expect(nav.getByText("Apps")).toBeVisible();
      await expect(nav.getByText("Feedback")).toBeVisible();
      await expect(nav.getByText("Roadmap")).toBeVisible();
    });

    test("should show NAVIGATION section label", async ({ page }) => {
      await openMobileMenu(page);
      await expect(page.locator(".mobile-site-menu__label").first()).toContainText("NAVIGATION");
    });

    test("should show ACCOUNT section label", async ({ page }) => {
      await openMobileMenu(page);
      await expect(page.locator(".mobile-site-menu__label").last()).toContainText("ACCOUNT");
    });

    test("should show Sign In link when not logged in", async ({ page }) => {
      await openMobileMenu(page);
      const signIn = page.locator(".mobile-site-menu__nav").getByText("Sign In");
      await expect(signIn).toBeVisible();
    });

    test("should have correct hrefs on nav links", async ({ page }) => {
      await openMobileMenu(page);
      const nav = page.locator(".mobile-site-menu__nav");

      await expect(nav.locator('a[href="/"]')).toBeAttached();
      await expect(nav.locator('a[href="/#apps"]')).toBeAttached();
      await expect(nav.locator('a[href="/feedback"]')).toBeAttached();
      await expect(nav.locator('a[href="/roadmap"]')).toBeAttached();
    });

    test("should highlight active link for current page", async ({ page }) => {
      await openMobileMenu(page);
      const activeLink = page.locator(".mobile-site-menu__link--active");
      await expect(activeLink).toBeAttached();
      // On homepage, the Home link should be active
      await expect(activeLink).toContainText("Home");
    });

    test("should display icons for each nav link", async ({ page }) => {
      await openMobileMenu(page);
      const icons = page.locator(".mobile-site-menu__icon");
      const count = await icons.count();
      // At minimum: Home, Apps, Feedback, Roadmap, Sign In = 5
      expect(count).toBeGreaterThanOrEqual(5);
    });
  });

  test.describe("Menu Closing", () => {
    test("should close when close button is clicked", async ({ page }) => {
      await openMobileMenu(page);
      const closeBtn = page.locator(".mobile-site-menu__close");
      await closeBtn.click();

      const menu = page.locator(".mobile-site-menu--open");
      await expect(menu).not.toBeAttached();
    });

    test("should close when overlay is clicked", async ({ page }) => {
      await openMobileMenu(page);
      const overlay = page.locator(".mobile-site-overlay");
      // Click the overlay (left side of screen, away from menu)
      await overlay.click({ position: { x: 10, y: 300 } });

      const menu = page.locator(".mobile-site-menu--open");
      await expect(menu).not.toBeAttached();
    });

    test("should close when a nav link is clicked", async ({ page }) => {
      await openMobileMenu(page);
      const feedbackLink = page.locator(".mobile-site-menu__nav").getByText("Feedback");
      await feedbackLink.click();

      // Menu should close after navigation
      await expect(page.locator(".mobile-site-menu--open")).not.toBeAttached({ timeout: 5000 });
    });

    test("should restore body scroll after closing", async ({ page }) => {
      await openMobileMenu(page);

      // Body should have overflow hidden while open
      const overflowWhileOpen = await page.evaluate(() => document.body.style.overflow);
      expect(overflowWhileOpen).toBe("hidden");

      // Close the menu
      await page.locator(".mobile-site-menu__close").click();

      // Body overflow should be restored
      const overflowAfterClose = await page.evaluate(() => document.body.style.overflow);
      expect(overflowAfterClose).toBe("");
    });
  });

  test.describe("Scroll Lock", () => {
    test("should lock body scroll when menu is open", async ({ page }) => {
      await openMobileMenu(page);
      const overflow = await page.evaluate(() => document.body.style.overflow);
      expect(overflow).toBe("hidden");
    });

    test("should unlock body scroll when menu is closed", async ({ page }) => {
      await openMobileMenu(page);
      await page.locator(".mobile-site-menu__close").click();
      const overflow = await page.evaluate(() => document.body.style.overflow);
      expect(overflow).toBe("");
    });
  });

  test.describe("Stacking / Z-Index (Portal Rendering)", () => {
    test("should render overlay and menu outside the nav element", async ({ page }) => {
      await openMobileMenu(page);

      // The overlay and menu should be direct children of <body>, not inside <nav>
      const overlayParent = await page.locator(".mobile-site-overlay").evaluate(
        (el) => el.parentElement?.tagName
      );
      expect(overlayParent).toBe("BODY");

      const menuParent = await page.locator(".mobile-site-menu").evaluate(
        (el) => el.parentElement?.tagName
      );
      expect(menuParent).toBe("BODY");
    });

    test("should render menu above the nav bar", async ({ page }) => {
      await openMobileMenu(page);

      const navZIndex = await page.locator("nav.nav").evaluate((el) => {
        return parseInt(getComputedStyle(el).zIndex) || 0;
      });
      const menuZIndex = await page.locator(".mobile-site-menu").evaluate((el) => {
        return parseInt(getComputedStyle(el).zIndex) || 0;
      });

      expect(menuZIndex).toBeGreaterThan(navZIndex);
    });

    test("should render overlay above the nav bar", async ({ page }) => {
      await openMobileMenu(page);

      const navZIndex = await page.locator("nav.nav").evaluate((el) => {
        return parseInt(getComputedStyle(el).zIndex) || 0;
      });
      const overlayZIndex = await page.locator(".mobile-site-overlay").evaluate((el) => {
        return parseInt(getComputedStyle(el).zIndex) || 0;
      });

      expect(overlayZIndex).toBeGreaterThan(navZIndex);
    });

    test("menu should cover full viewport height", async ({ page }) => {
      await openMobileMenu(page);

      const menuBox = await page.locator(".mobile-site-menu").boundingBox();
      expect(menuBox).not.toBeNull();
      expect(menuBox!.y).toBe(0);
      expect(menuBox!.height).toBeGreaterThanOrEqual(MOBILE_VIEWPORT.height - 1);
    });

    test("menu content should be clickable (not blocked by nav)", async ({ page }) => {
      await openMobileMenu(page);

      // The Feedback link should be clickable - if z-index is wrong, the nav
      // would intercept clicks
      const feedbackLink = page.locator(".mobile-site-menu__nav").getByText("Feedback");
      await expect(feedbackLink).toBeVisible();

      // Verify the link is actually interactive by checking it receives the click
      const [response] = await Promise.all([
        page.waitForNavigation({ url: "**/feedback" }),
        feedbackLink.click(),
      ]);
      expect(page.url()).toContain("/feedback");
    });
  });

  test.describe("Multiple Opens/Closes", () => {
    test("should work correctly when toggled multiple times", async ({ page }) => {
      const toggle = page.locator(".mobile-site-toggle");

      // Open
      await toggle.click();
      await expect(page.locator(".mobile-site-menu--open")).toBeVisible();

      // Close via close button
      await page.locator(".mobile-site-menu__close").click();
      await expect(page.locator(".mobile-site-menu--open")).not.toBeAttached();

      // Open again
      await toggle.click();
      await expect(page.locator(".mobile-site-menu--open")).toBeVisible();

      // Close via overlay
      await page.locator(".mobile-site-overlay").click({ position: { x: 10, y: 300 } });
      await expect(page.locator(".mobile-site-menu--open")).not.toBeAttached();

      // Body scroll should be restored
      const overflow = await page.evaluate(() => document.body.style.overflow);
      expect(overflow).toBe("");
    });
  });

  test.describe("Cross-Page Consistency", () => {
    const pages = ["/", "/feedback", "/roadmap"];

    for (const pagePath of pages) {
      test(`should show mobile nav on ${pagePath}`, async ({ page }) => {
        await page.goto(pagePath);
        const toggle = page.locator(".mobile-site-toggle");
        await expect(toggle).toBeVisible();
      });
    }
  });

  test.describe("Authenticated User Links", () => {
    test("should show Dashboard link when logged in", async ({ page }) => {
      await loginAsUser(page);
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.goto("/");
      await openMobileMenu(page);

      const nav = page.locator(".mobile-site-menu__nav");
      await expect(nav.getByText("Dashboard")).toBeVisible();
      await expect(nav.locator('a[href="/dashboard"]')).toBeAttached();

      await logout(page);
    });

    test("should show Sign Out button when logged in", async ({ page }) => {
      await loginAsUser(page);
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.goto("/");
      await openMobileMenu(page);

      const nav = page.locator(".mobile-site-menu__nav");
      await expect(nav.getByText("Sign Out")).toBeVisible();

      await logout(page);
    });

    test("should not show Sign In link when logged in", async ({ page }) => {
      await loginAsUser(page);
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.goto("/");
      await openMobileMenu(page);

      const nav = page.locator(".mobile-site-menu__nav");
      await expect(nav.getByText("Sign In")).not.toBeVisible();

      await logout(page);
    });

    test("should show Admin link for admin users", async ({ page }) => {
      await loginAsAdmin(page);
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.goto("/");
      await openMobileMenu(page);

      const nav = page.locator(".mobile-site-menu__nav");
      await expect(nav.getByText("Admin")).toBeVisible();
      await expect(nav.locator('a[href="/admin"]')).toBeAttached();

      await logout(page);
    });

    test("should not show Admin link for regular users", async ({ page }) => {
      await loginAsUser(page);
      await page.setViewportSize(MOBILE_VIEWPORT);
      await page.goto("/");
      await openMobileMenu(page);

      const nav = page.locator(".mobile-site-menu__nav");
      await expect(nav.getByText("Admin")).not.toBeVisible();

      await logout(page);
    });
  });
});
