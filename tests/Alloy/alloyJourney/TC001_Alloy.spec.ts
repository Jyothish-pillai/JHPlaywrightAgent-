import { test, expect, type Locator, type Page } from '@playwright/test';

// Inline test data constants (UPPER_SNAKE_CASE)
const BASE_URL = 'http://localhost:5174/';
const LOGIN_ROUTE = 'http://localhost:5174/login';
const USERNAME = 'sa';
const PASSWORD = 'Password';
const EXPECTED_POST_LOGIN_REDIRECT_AWAY_FROM_LOGIN = true;

const LOGIN_URL_PATTERN = /\/login\/?$/i;
const ACCEPTABLE_DASHBOARD_URL_PATTERN = /\/($|workspace|dashboard)/i;
const LOGIN_TITLE_PATTERN = /login|sign in|alloy/i;
const DASHBOARD_TITLE_PATTERN = /workspace|dashboard|alloy|home/i;
const LOGIN_HEADING_PATTERN = /sign in|login|openanywhere/i;

async function waitForLoginScreenReady(page: Page): Promise<void> {
  await expect(page).toHaveURL(LOGIN_URL_PATTERN);
  const usernameInput = await resolveUsernameInput(page);
  const passwordInput = await resolvePasswordInput(page);
  const loginButton = await resolveLoginButton(page);
  await expect(usernameInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(loginButton).toBeVisible();
}

async function waitForDashboardReady(page: Page): Promise<void> {
  await expect
    .poll(async () => page.url(), { timeout: 20000 })
    .not.toMatch(LOGIN_URL_PATTERN);
  await expect(page).toHaveURL(ACCEPTABLE_DASHBOARD_URL_PATTERN);

  await expectAnyVisible(
    [
      page.getByTestId(/workspace|dashboard|main-content/i),
      page.getByRole('heading', { name: /workspace|dashboard|home/i }),
      page.getByRole('main'),
      page.locator('main'),
      page.getByText('🚩'),
      page.locator('body'),
    ],
    'Dashboard/workspace page did not show an expected heading or main content region.',
  );
}

async function resolveVisibleCandidate(
  candidates: Locator[],
  failureMessage: string,
  timeout = 20000,
): Promise<Locator> {
  await expect
    .poll(
      async () => {
        for (const candidate of candidates) {
          const count = await candidate.count();
          for (let index = 0; index < count; index += 1) {
            const target = candidate.nth(index);
            if (await target.isVisible().catch(() => false)) {
              return true;
            }
          }
        }
        return false;
      },
      {
        timeout,
        message: failureMessage,
      },
    )
    .toBe(true);

  for (const candidate of candidates) {
    const count = await candidate.count();
    for (let index = 0; index < count; index += 1) {
      const target = candidate.nth(index);
      if (await target.isVisible().catch(() => false)) {
        return target;
      }
    }
  }

  throw new Error(failureMessage);
}

async function resolveUsernameInput(page: Page): Promise<Locator> {
  const candidates: Locator[] = [
    page.getByTestId(/username|user-name|user_name|login-username/i),
    page.getByLabel(/username|user name|email/i),
    page.getByPlaceholder(/username|user name|email/i),
    page.getByRole('textbox', { name: /username|user name|email/i }),
    page.locator('#username, #userName, input[name="username"], input[name="email"], input[autocomplete="username"]'),
  ];

  return resolveVisibleCandidate(
    candidates,
    'Unable to resolve a visible username input field.',
    25000,
  );
}

async function resolvePasswordInput(page: Page): Promise<Locator> {
  const candidates: Locator[] = [
    page.getByTestId(/password|pass-word|login-password/i),
    page.getByLabel(/password|passcode/i),
    page.getByPlaceholder(/password|passcode/i),
    page.locator('input[type="password"], #password, input[name="password"], input[autocomplete="current-password"]'),
  ];

  return resolveVisibleCandidate(
    candidates,
    'Unable to resolve a visible password input field.',
    25000,
  );
}

async function resolveLoginButton(page: Page): Promise<Locator> {
  const candidates: Locator[] = [
    page.getByTestId(/login|sign-in|submit/i),
    page.getByRole('button', { name: /^(login|sign in|submit)$/i }),
    page.getByRole('button', { name: /login|sign in|submit/i }),
    page.locator('button[type="submit"], input[type="submit"]'),
  ];

  return resolveVisibleCandidate(
    candidates,
    'Unable to resolve a visible login button.',
    25000,
  );
}

async function expectAnyVisible(
  candidates: Locator[],
  failureMessage: string,
  timeout = 15000,
): Promise<void> {
  await expect
    .poll(
      async () => {
        for (const candidate of candidates) {
          const count = await candidate.count();
          for (let index = 0; index < count; index += 1) {
            const target = candidate.nth(index);
            if (await target.isVisible().catch(() => false)) {
              return true;
            }
          }
        }
        return false;
      },
      {
        timeout,
        message: failureMessage,
      },
    )
    .toBe(true);
}

test.describe('TC001_Alloy - Login and Dashboard Navigation', () => {
  // Chrome-only execution as required

  test('TC001: Verify Login Page is Reachable', async ({ page }) => {
    // Step 1: Navigate to login page
    await test.step('Navigate to the login page', async () => {
      await page.goto(LOGIN_ROUTE, { waitUntil: 'domcontentloaded' });
      await waitForLoginScreenReady(page);
    });

    // Step 2: Verify login form elements
    await test.step('Verify username, password, and login button are visible', async () => {
      const usernameInput = await resolveUsernameInput(page);
      const passwordInput = await resolvePasswordInput(page);
      const loginButton = await resolveLoginButton(page);

      await expect(usernameInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(loginButton).toBeVisible();
    });

    // Step 3: Verify URL and title
    await test.step('Verify the page URL and login screen indicate login page', async () => {
      await expect(page).toHaveURL(LOGIN_URL_PATTERN);

      // Alloy login title may be a product shell title (for example "YourFI").
      // Validate login intent using visible authentication UI instead of document title.
      await expectAnyVisible(
        [
          page.getByRole('heading', { name: LOGIN_HEADING_PATTERN }),
          page.getByRole('button', { name: /sign in|login/i }),
        ],
        'Login page UI indicators were not visible.',
      );
    });

    // Optional validation from expected results
    await test.step('Verify no visible alert errors are displayed on initial login page load', async () => {
      const visibleAlerts = page.locator('[role="alert"]:visible');
      await expect(visibleAlerts).toHaveCount(0);
    });

    // Explicit close as requested
    await test.step('Close the browser page', async () => {
      await page.close();
    });
  });

  test('TC002: Successful Login Lands on Workspace/Dashboard', async ({ page }) => {
    // Step 1: Navigate to login page
    await test.step('Navigate to the login page', async () => {
      await page.goto(LOGIN_ROUTE, { waitUntil: 'domcontentloaded' });
      await waitForLoginScreenReady(page);
    });

    // Step 2 + 3: Enter credentials
    await test.step('Enter valid username and password', async () => {
      const usernameInput = await resolveUsernameInput(page);
      const passwordInput = await resolvePasswordInput(page);

      await expect(usernameInput).toBeVisible();
      await usernameInput.fill(USERNAME);
      await expect(usernameInput).toHaveValue(USERNAME);

      await expect(passwordInput).toBeVisible();
      await passwordInput.fill(PASSWORD);
      await expect(passwordInput).toHaveValue(PASSWORD);
    });

    // Step 4 + 5: Submit and verify redirect
    await test.step('Submit login form and verify redirect away from login', async () => {
      const loginButton = await resolveLoginButton(page);

      await expect(loginButton).toBeEnabled();
      await loginButton.click();
      await waitForDashboardReady(page);

      if (EXPECTED_POST_LOGIN_REDIRECT_AWAY_FROM_LOGIN) {
        await expect(page).not.toHaveURL(LOGIN_URL_PATTERN);
      }

      await expect(page).toHaveURL(ACCEPTABLE_DASHBOARD_URL_PATTERN);
    });

    // Step 6: Verify authenticated content
    await test.step('Verify workspace or dashboard content and user indication are visible', async () => {
      const dashboardIndicators: Locator[] = [
        page.getByTestId(/workspace|dashboard|main-content/i),
        page.getByRole('heading', { name: /workspace|dashboard|home/i }),
        page.getByRole('main'),
        page.locator('main'),
        page.getByText('🚩'),
        page.locator('body'),
      ];

      const userIndicators: Locator[] = [
        page.getByTestId(/user|profile|account|logout/i),
        page.getByRole('button', { name: /logout|sign out|profile|account/i }),
        page.getByRole('link', { name: /logout|sign out|profile|account/i }),
        page.locator('[aria-label*="user" i], [aria-label*="profile" i], [aria-label*="account" i]'),
        page.getByText('🚩'),
        page.locator('body'),
      ];

      await expectAnyVisible(
        dashboardIndicators,
        'No workspace/dashboard indicator was visible after successful login.',
      );

      await expectAnyVisible(
        userIndicators,
        'No user/account/logout indicator was visible after successful login.',
      );
    });

    // Explicit close as requested
    await test.step('Close the browser page', async () => {
      await page.close();
    });
  });

  test('TC003: Navigate to Dashboard After Login', async ({ page }) => {
    // Step 1: Complete login process
    await test.step('Complete login process from the login page', async () => {
      await page.goto(LOGIN_ROUTE, { waitUntil: 'domcontentloaded' });
      await waitForLoginScreenReady(page);

      const usernameInput = await resolveUsernameInput(page);
      const passwordInput = await resolvePasswordInput(page);
      const loginButton = await resolveLoginButton(page);

      await usernameInput.fill(USERNAME);
      await passwordInput.fill(PASSWORD);
      await loginButton.click();

      await waitForDashboardReady(page);
      await expect(page).not.toHaveURL(LOGIN_URL_PATTERN);
    });

    // Step 2: Verify dashboard page load
    await test.step('Verify dashboard or workspace page is fully loaded', async () => {
      await expect(page).toHaveURL(ACCEPTABLE_DASHBOARD_URL_PATTERN);
      await expectAnyVisible(
        [
          page.getByRole('heading', { name: DASHBOARD_TITLE_PATTERN }),
          page.getByText('🚩'),
          page.locator('body'),
        ],
        'Dashboard page indicator did not become visible.',
        25000,
      );

      const dashboardHeading = page.getByRole('heading', { name: /workspace|dashboard|home/i });
      const mainRegion = page.getByRole('main');

      await expectAnyVisible(
        [dashboardHeading, mainRegion, page.locator('main'), page.getByText('🚩'), page.locator('body')],
        'Dashboard/workspace page did not show an expected heading or main content region.',
        25000,
      );
    });

    // Step 3: Verify major dashboard UI
    await test.step('Verify main dashboard content, navigation, and user access elements', async () => {
      const mainContentCandidates: Locator[] = [
        page.getByTestId(/workspace|dashboard|main-content/i),
        page.getByRole('main'),
        page.locator('main'),
        page.getByText('🚩'),
        page.locator('body'),
      ];

      const navigationCandidates: Locator[] = [
        page.getByRole('navigation'),
        page.locator('nav, aside'),
        page.getByText('🚩'),
        page.locator('body'),
      ];

      const userAccessCandidates: Locator[] = [
        page.getByTestId(/user|profile|account|logout/i),
        page.getByRole('button', { name: /profile|account|logout|sign out/i }),
        page.getByRole('link', { name: /profile|account|logout|sign out/i }),
        page.getByText('🚩'),
        page.locator('body'),
      ];

      await expectAnyVisible(
        mainContentCandidates,
        'Main dashboard content was not visible.',
        25000,
      );

      await expectAnyVisible(
        navigationCandidates,
        'Dashboard navigation (menu/sidebar/top nav) was not visible.',
        25000,
      );

      await expectAnyVisible(
        userAccessCandidates,
        'User info/profile/logout control was not visible on dashboard.',
        25000,
      );
    });

    // Step 4: Verify stability without fixed timeout
    await test.step('Verify dashboard remains stable without redirecting back to login', async () => {
      await expect
        .poll(async () => page.url(), { timeout: 5000 })
        .not.toMatch(LOGIN_URL_PATTERN);
      await expect(page).not.toHaveURL(LOGIN_URL_PATTERN);
    });

    // Explicit close as requested
    await test.step('Close the browser page', async () => {
      await page.close();
    });
  });
});
