import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  
  // Snapshot settings for visual regression
  // Include project name to separate desktop/mobile screenshots
  snapshotPathTemplate: "{testDir}/{testFileDir}/__snapshots__/{projectName}/{testFilePath}/{arg}{ext}",
  
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  // Configure screenshot comparison
  expect: {
    toHaveScreenshot: {
      // Allow small differences due to anti-aliasing
      maxDiffPixelRatio: 0.01,
      // Animation can cause flakiness
      animations: "disabled",
    },
  },

  projects: [
    // Desktop Chrome (default for functional tests - excludes visual tests)
    {
      name: "chromium",
      testIgnore: /visual\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    
    // Desktop Chrome for visual tests (consistent viewport)
    {
      name: "visual-desktop",
      testMatch: /visual\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        // Disable animations for consistent screenshots
        launchOptions: {
          args: ["--font-render-hinting=none", "--disable-skia-runtime-opts"],
        },
      },
    },
    
    // Mobile viewport for visual tests
    {
      name: "visual-mobile",
      testMatch: /visual\/.*\.spec\.ts/,
      use: {
        ...devices["iPhone SE"],
        // Disable animations for consistent screenshots
        launchOptions: {
          args: ["--font-render-hinting=none", "--disable-skia-runtime-opts"],
        },
      },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
