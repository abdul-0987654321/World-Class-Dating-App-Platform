import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * See https://playwright.dev/docs/test-configuration
 *
 * Test Structure:
 * - tests/e2e/smoke/     - Critical smoke tests for PR gates (< 3 min)
 * - tests/e2e/pages/     - Page object models
 * - tests/e2e/accessibility/ - WCAG 2.1 AA accessibility tests
 * - tests/e2e/visual/    - Visual regression tests
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Ignore API tests (run with Jest) and page objects */
  testIgnore: ['**/api/**', '**/pages/**'],

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    // Allure reporter for comprehensive test reporting
    ['allure-playwright', {
      outputFolder: process.env.ALLURE_RESULTS_DIR || 'allure-results',
      detail: true,
      suiteTitle: true,
      categories: [
        {
          name: 'Flaky tests',
          matchedStatuses: ['broken'],
          messageRegex: '.*',
        },
        {
          name: 'Smoke tests',
          matchedStatuses: ['passed', 'failed'],
          traceRegex: '.*smoke.*',
        },
      ],
      environmentInfo: {
        'Node.js version': process.version,
        'Platform': process.platform,
        'Base URL': process.env.BASE_URL || 'http://localhost:3000',
      },
    }],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Maximum time each action can take */
    actionTimeout: 10000,

    /* Maximum navigation timeout */
    navigationTimeout: 30000,
  },

  /* Global timeout for each test */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000
  },

  /* Configure projects for major browsers */
  projects: [
    /* =========================================
     * PR Gate Tests - Fast, critical path only
     * Run: npx playwright test --project=smoke
     * Target: < 3 minutes
     * ========================================= */
    {
      name: 'smoke',
      testDir: './tests/e2e/smoke',
      use: {
        ...devices['Desktop Chrome'],
        // Faster timeouts for smoke tests
        actionTimeout: 5000,
        navigationTimeout: 15000,
      },
      timeout: 30000, // 30s per test max
      retries: 1, // Quick retry for flaky network
    },

    /* =========================================
     * Accessibility Tests - WCAG 2.1 AA
     * Run: npx playwright test --project=accessibility
     * ========================================= */
    {
      name: 'accessibility',
      testDir: './tests/e2e/accessibility',
      use: { ...devices['Desktop Chrome'] },
    },

    /* =========================================
     * Visual Regression Tests
     * Run: npx playwright test --project=visual
     * Update snapshots: npx playwright test --project=visual --update-snapshots
     * ========================================= */
    {
      name: 'visual',
      testDir: './tests/e2e/visual',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual tests
        viewport: { width: 1280, height: 720 },
      },
      // Visual tests shouldn't retry - diff is deterministic
      retries: 0,
    },

    /* =========================================
     * Main Browser Projects
     * ========================================= */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    /* =========================================
     * Full Regression Suite
     * Run: npx playwright test --project=regression
     * Excludes smoke, a11y, and visual tests
     * ========================================= */
    {
      name: 'regression',
      testIgnore: ['**/smoke/**', '**/accessibility/**', '**/visual/**', '**/pages/**'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'cd apps/web-app && npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Folder for test artifacts such as screenshots, videos, traces */
  outputDir: 'test-results/',
});
