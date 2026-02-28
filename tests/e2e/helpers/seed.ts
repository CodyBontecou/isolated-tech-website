/**
 * E2E Test Data Seeding Helpers
 * 
 * Utilities for seeding and cleaning up test data
 */

import { Page, APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Test app slugs for reference
export const TEST_APPS = {
  FREE: "e2e-free-app",
  PAID: "e2e-paid-app",
};

export const TEST_DISCOUNT_CODES = {
  PERCENT: "E2E50OFF",
  FIXED: "E2E5DOLLARS",
};

/**
 * Seed test apps and versions
 */
export async function seedApps(request: APIRequestContext): Promise<void> {
  const response = await request.post(`${BASE_URL}/api/test/seed`, {
    data: { type: "apps" },
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed apps: ${await response.text()}`);
  }
}

/**
 * Seed discount codes
 */
export async function seedDiscountCodes(request: APIRequestContext): Promise<void> {
  const response = await request.post(`${BASE_URL}/api/test/seed`, {
    data: { type: "codes" },
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed discount codes: ${await response.text()}`);
  }
}

/**
 * Seed all test data (apps + codes)
 */
export async function seedAll(request: APIRequestContext): Promise<void> {
  const response = await request.post(`${BASE_URL}/api/test/seed`, {
    data: { type: "all" },
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed all data: ${await response.text()}`);
  }
}

/**
 * Seed a purchase for a user
 */
export async function seedPurchase(
  request: APIRequestContext,
  userId: string,
  appId: string
): Promise<void> {
  const response = await request.post(`${BASE_URL}/api/test/seed`, {
    data: { type: "purchase", userId, appId },
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed purchase: ${await response.text()}`);
  }
}

/**
 * Clean up all E2E test data
 */
export async function cleanupTestData(request: APIRequestContext): Promise<void> {
  const response = await request.delete(`${BASE_URL}/api/test/seed`);

  if (!response.ok()) {
    // Don't throw on cleanup errors, just log
    console.warn(`Cleanup warning: ${await response.text()}`);
  }
}

/**
 * Helper to ensure page has test data loaded
 * Useful in beforeEach hooks
 */
export async function ensureTestData(page: Page): Promise<void> {
  await seedAll(page.request);
}
