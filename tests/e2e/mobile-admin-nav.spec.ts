/**
 * E2E tests for the admin mobile sidebar navigation menu
 * Tests that the admin hamburger menu opens/closes correctly,
 * renders all admin nav sections, and is properly layered (portal rendering).
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin, logout } from "./helpers/auth";

const MOBILE_VIEWPORT = { width: 375, height: 667 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

/** Helper: open the admin mobile sidebar menu */
async function openAdminMenu(page: Page) {
  const toggle = page.locator(".mobile-admin-toggle");
  await toggle.click();
  await expect(page.locator(".mobile-admin-menu--open")).toBeVisible();
}

const EXPECTED_SECTIONS = [
  {
    label: "OVERVIEW",
    links: [{ href: "/admin", text: "Dashboard" }],
  },
  {
    label: "CATALOG",
    links: [
      { href: "/admin/apps", text: "Apps" },
      { href: "/admin/codes", text: "Discount Codes" },
    ],
  },
  {
    label: "CUSTOMERS",
    links: [
      { href: "/admin/purchases", text: "Purchases" },
      { href: "/admin/downloads", text: "Downloads" },
      { href: "/admin/users", text: "Users" },
    ],
  },
  {
    label: "SUPPORT",
    links: [
      { href: "/admin/feedback", text: "Feedback" },
      { href: "/admin/feature-requests", text: "Feature Requests" },
      { href: "/admin/help-articles", text: "Help Articles" },
    ],
  },
  {
    label: "MARKETING",
    links: [
      { href: "/admin/subscribers", text: "Subscribers" },
      { href: "/admin/broadcasts", text: "Broadcasts" },
    ],
  },
  {
    label: "SETTINGS",
    links: [{ href: "/admin/api-keys", text: "API Keys" }],
  },
];

test.describe("Admin Mobile Sidebar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto("/admin");
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test.describe("Hamburger Toggle", () => {
    test("should show hamburger button on mobile", async ({ page }) => {
      const toggle = page.locator(".mobile-admin-toggle");
      await expect(toggle).toBeVisible();
    });

    test("should hide hamburger button on desktop", async ({ page }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
      const toggle = page.locator(".mobile-admin-toggle");
      await expect(toggle).not.toBeVisible();
    });

    test("should have correct aria attributes when closed", async ({ page }) => {
      const toggle = page.locator(".mobile-admin-toggle");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(toggle).toHaveAttribute("aria-label", "Open menu");
    });

    test("should update aria attributes when opened", async ({ page }) => {
      const toggle = page.locator(".mobile-admin-toggle");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(toggle).toHaveAttribute("aria-label", "Close menu");
    });
  });

  test.describe("Menu Opening", () => {
    test("should open menu when hamburger is clicked", async ({ page }) => {
      await openAdminMenu(page);
      await expect(page.locator(".mobile-admin-menu--open")).toBeVisible();
    });

    test("should show overlay when menu is open", async ({ page }) => {
      await openAdminMenu(page);
      const overlay = page.locator(".mobile-admin-overlay--visible");
      await expect(overlay).toBeAttached();
    });

    test("should display menu header with Admin Menu title", async ({ page }) => {
      await openAdminMenu(page);
      const title = page.locator(".mobile-admin-menu__title");
      await expect(title).toContainText("Admin Menu");
    });

    test("should display close button in menu header", async ({ page }) => {
      await openAdminMenu(page);
      const closeBtn = page.locator(".mobile-admin-menu__close");
      await expect(closeBtn).toBeVisible();
    });
  });

  test.describe("Navigation Sections & Links", () => {
    test("should display all section labels", async ({ page }) => {
      await openAdminMenu(page);
      const labels = page.locator(".mobile-admin-menu__label");

      for (const section of EXPECTED_SECTIONS) {
        await expect(labels.getByText(section.label)).toBeVisible();
      }
    });

    test("should display all navigation links", async ({ page }) => {
      await openAdminMenu(page);
      const nav = page.locator(".mobile-admin-menu__nav");

      for (const section of EXPECTED_SECTIONS) {
        for (const link of section.links) {
          await expect(nav.getByText(link.text)).toBeVisible();
        }
      }
    });

    test("should have correct hrefs on all links", async ({ page }) => {
      await openAdminMenu(page);
      const nav = page.locator(".mobile-admin-menu__nav");

      for (const section of EXPECTED_SECTIONS) {
        for (const link of section.links) {
          await expect(nav.locator(`a[href="${link.href}"]`)).toBeAttached();
        }
      }
    });

    test("should display icons for each nav link", async ({ page }) => {
      await openAdminMenu(page);
      const icons = page.locator(".mobile-admin-menu__icon");
      const totalLinks = EXPECTED_SECTIONS.reduce(
        (sum, s) => sum + s.links.length,
        0
      );
      await expect(icons).toHaveCount(totalLinks);
    });

    test("should highlight active link for current page", async ({ page }) => {
      await openAdminMenu(page);
      const activeLink = page.locator(".mobile-admin-menu__link--active");
      await expect(activeLink).toBeAttached();
      // On /admin, the Dashboard link should be active
      await expect(activeLink).toContainText("Dashboard");
    });

    test("should highlight correct link on subpage", async ({ page }) => {
      await page.goto("/admin/apps");
      await openAdminMenu(page);
      const activeLink = page.locator(".mobile-admin-menu__link--active");
      await expect(activeLink).toContainText("Apps");
    });
  });

  test.describe("Menu Closing", () => {
    test("should close when close button is clicked", async ({ page }) => {
      await openAdminMenu(page);
      await page.locator(".mobile-admin-menu__close").click();
      await expect(page.locator(".mobile-admin-menu--open")).not.toBeAttached();
    });

    test("should close when overlay is clicked", async ({ page }) => {
      await openAdminMenu(page);
      await page.locator(".mobile-admin-overlay").click({ position: { x: 10, y: 300 } });
      await expect(page.locator(".mobile-admin-menu--open")).not.toBeAttached();
    });

    test("should close when a nav link is clicked", async ({ page }) => {
      await openAdminMenu(page);
      await page.locator(".mobile-admin-menu__nav").getByText("Apps").click();
      await expect(page.locator(".mobile-admin-menu--open")).not.toBeAttached({ timeout: 5000 });
    });
  });

  test.describe("Scroll Lock", () => {
    test("should lock body scroll when menu is open", async ({ page }) => {
      await openAdminMenu(page);
      const overflow = await page.evaluate(() => document.body.style.overflow);
      expect(overflow).toBe("hidden");
    });

    test("should unlock body scroll when menu is closed", async ({ page }) => {
      await openAdminMenu(page);
      await page.locator(".mobile-admin-menu__close").click();
      const overflow = await page.evaluate(() => document.body.style.overflow);
      expect(overflow).toBe("");
    });
  });

  test.describe("Stacking / Z-Index (Portal Rendering)", () => {
    test("should render overlay and menu outside the nav element", async ({ page }) => {
      await openAdminMenu(page);

      const overlayParent = await page.locator(".mobile-admin-overlay").evaluate(
        (el) => el.parentElement?.tagName
      );
      expect(overlayParent).toBe("BODY");

      const menuParent = await page.locator(".mobile-admin-menu").evaluate(
        (el) => el.parentElement?.tagName
      );
      expect(menuParent).toBe("BODY");
    });

    test("should render menu above the nav bar", async ({ page }) => {
      await openAdminMenu(page);

      const navZIndex = await page.locator("nav.nav").evaluate((el) => {
        return parseInt(getComputedStyle(el).zIndex) || 0;
      });
      const menuZIndex = await page.locator(".mobile-admin-menu").evaluate((el) => {
        return parseInt(getComputedStyle(el).zIndex) || 0;
      });

      expect(menuZIndex).toBeGreaterThan(navZIndex);
    });

    test("menu should cover full viewport height", async ({ page }) => {
      await openAdminMenu(page);

      const menuBox = await page.locator(".mobile-admin-menu").boundingBox();
      expect(menuBox).not.toBeNull();
      expect(menuBox!.y).toBe(0);
      expect(menuBox!.height).toBeGreaterThanOrEqual(MOBILE_VIEWPORT.height - 1);
    });

    test("menu content should be clickable (not blocked by nav)", async ({ page }) => {
      await openAdminMenu(page);

      const appsLink = page.locator(".mobile-admin-menu__nav").getByText("Apps");
      await expect(appsLink).toBeVisible();

      await appsLink.click();
      await page.waitForURL("**/admin/apps", { timeout: 5000 });
      expect(page.url()).toContain("/admin/apps");
    });
  });

  test.describe("Multiple Opens/Closes", () => {
    test("should work correctly when toggled multiple times", async ({ page }) => {
      const toggle = page.locator(".mobile-admin-toggle");

      // Open
      await toggle.click();
      await expect(page.locator(".mobile-admin-menu--open")).toBeVisible();

      // Close via close button
      await page.locator(".mobile-admin-menu__close").click();
      await expect(page.locator(".mobile-admin-menu--open")).not.toBeAttached();

      // Open again
      await toggle.click();
      await expect(page.locator(".mobile-admin-menu--open")).toBeVisible();

      // Close via overlay
      await page.locator(".mobile-admin-overlay").click({ position: { x: 10, y: 300 } });
      await expect(page.locator(".mobile-admin-menu--open")).not.toBeAttached();

      // Body scroll should be restored
      const overflow = await page.evaluate(() => document.body.style.overflow);
      expect(overflow).toBe("");
    });
  });
});
