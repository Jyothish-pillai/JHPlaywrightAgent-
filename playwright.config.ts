import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

// ---------------------------------------------------------------------------
// TEST_DATA_SOURCE — controls where test data comes from for all tests.
//   'excel'  → load from test-data/test-data.xlsx  (default)
//   'inline' → use the INLINE_DATA object inside each spec file
//
// Override at runtime without editing this file:
//   TEST_DATA_SOURCE=inline npx playwright test ...
// ---------------------------------------------------------------------------
process.env.TEST_DATA_SOURCE = process.env.TEST_DATA_SOURCE ?? 'excel';

// ---------------------------------------------------------------------------
// TEST_DATA_STRATEGY — controls how test data is GENERATED in test scripts.
//   'inline'   → embed all test data directly in the generated test file (default)
//   'external' → generate external Excel test data files
//
// This setting affects TEST GENERATION, not test execution.
// When 'inline', generated tests contain all data as constants/objects.
// When 'external', tests import data from Excel using getMergedTestData().
//
// Override at runtime without editing this file:
//   TEST_DATA_STRATEGY=external npx playwright test ...
// ---------------------------------------------------------------------------
process.env.TEST_DATA_STRATEGY = process.env.TEST_DATA_STRATEGY ?? 'inline';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests on CI only; no retries locally */
  retries: process.env.CI ? 2 : 0,
  /* Single worker to avoid overloading the demo server */
  workers: 1,
  /* Global per-test timeout (generous for retry scenarios) */
  timeout: 90000,
  /* Default assertion retry timeout */
  expect: { timeout: 10000 },
    /* Reporter setup includes default HTML + custom final consolidated HTML report */
    reporter: [
      ['html', { open: 'never' }],
      ['./reporters/final-html-reporter.cjs'],
    ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    // baseURL: 'http://localhost:3000',

    /* Headed mode is required for auto-healing validation and observation */
    headless: false,

    /* Ignore HTTPS errors for internal apps with self-signed certificates */
    ignoreHTTPSErrors: true,

    /* Timeout for individual actions (click, fill, etc.) — generous for demo-server navigations */
    actionTimeout: 45000,

    /* Timeout for page navigations */
    navigationTimeout: 30000,

    /* Persist trace and failure screenshots for detailed final reporting */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',

    /* Disable fixed viewport so the browser uses the full maximized window size */
    viewport: null,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
        viewport: null,
        launchOptions: {
          args: ['--start-maximized'],
        },
      },
    },

    /*
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
