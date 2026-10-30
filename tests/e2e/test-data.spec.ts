import { test, expect } from "@playwright/test";
import { loginAsUser } from "./helpers/auth";
import { seedAll, seedPurchase, cleanupTestData } from "./helpers/seed";

test("fixtures can reseed purchases and clean up repeatedly", async ({ page }) => {
  await seedAll(page.request);
  await seedAll(page.request);
  const user = await loginAsUser(page, "fixture-regression@example.test");
  await seedPurchase(page.request, user.id, "e2e_app_free");
  await seedPurchase(page.request, user.id, "e2e_app_free");
  await seedAll(page.request);
  await page.goto("/dashboard");
  await expect(page.locator(".purchased-card")).toHaveCount(1);
  await expect(page.locator(".purchased-card").getByRole("heading", {name: "E2E Free App"})).toBeVisible();
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await page.request.delete("/api/test/seed");
    expect(response.status(), await response.text()).toBe(200);
  }
  await page.context().clearCookies();
  await seedAll(page.request);
  await loginAsUser(page, "fixture-regression@example.test");
  await page.goto("/dashboard");
  await expect(page.locator(".purchased-card")).toHaveCount(0);
  await expect(page.getByText("No purchases yet", {exact: true})).toBeVisible();
  await cleanupTestData(page.request);
});
