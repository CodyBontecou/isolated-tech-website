/**
 * E2E Test Authentication Helpers
 * 
 * Utilities for managing authentication state in E2E tests
 */

import { Page, APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

/**
 * Login as a test user via the test auth endpoint
 */
export async function loginAsUser(
  page: Page,
  email = "e2e-user@test.com"
): Promise<{ id: string; email: string; name: string }> {
  const response = await page.request.post(`${BASE_URL}/api/test/auth`, {
    data: { email, isAdmin: false },
  });

  if (!response.ok()) {
    throw new Error(`Failed to login as user: ${await response.text()}`);
  }

  const { user } = await response.json();

  // Navigate to trigger cookie to be set in browser context
  await page.goto("/");

  return user;
}

/**
 * Login as an admin user via the test auth endpoint
 */
export async function loginAsAdmin(
  page: Page,
  email = "e2e-admin@test.com"
): Promise<{ id: string; email: string; name: string; isAdmin: boolean }> {
  const response = await page.request.post(`${BASE_URL}/api/test/auth`, {
    data: { email, isAdmin: true },
  });

  if (!response.ok()) {
    throw new Error(`Failed to login as admin: ${await response.text()}`);
  }

  const { user } = await response.json();

  // Navigate to trigger cookie to be set in browser context
  await page.goto("/");

  return user;
}

/**
 * Logout by clearing the session cookie
 */
export async function logout(page: Page): Promise<void> {
  await page.request.delete(`${BASE_URL}/api/test/auth`);

  // Navigate to clear browser state
  await page.goto("/");
}

/**
 * Check if currently logged in by looking for dashboard link
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Navigate to homepage first
  if (page.url() !== BASE_URL && page.url() !== `${BASE_URL}/`) {
    await page.goto("/");
  }

  // Check for dashboard link in nav (indicates logged in)
  const dashboardLink = page.locator('a[href="/dashboard"]');
  return dashboardLink.isVisible().catch(() => false);
}

/**
 * Login using API request context (for tests that don't need a page)
 */
export async function loginWithApi(
  request: APIRequestContext,
  options: { email?: string; isAdmin?: boolean } = {}
): Promise<{ id: string; email: string; name: string; isAdmin: boolean }> {
  const response = await request.post(`${BASE_URL}/api/test/auth`, {
    data: {
      email: options.email || "e2e-api-user@test.com",
      isAdmin: options.isAdmin || false,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to login via API: ${await response.text()}`);
  }

  const { user } = await response.json();
  return user;
}
