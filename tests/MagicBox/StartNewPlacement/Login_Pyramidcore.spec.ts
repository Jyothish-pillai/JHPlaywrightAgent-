// spec: specs/MagicBox/StartNewPlacement/Login_Pyramidcore-test-plan.md
// seed: tests/seed.spec.ts

import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────
// INLINE TEST DATA (All data embedded in this file)
// ─────────────────────────────────────────────────────────────────────────

// Application Configuration
const BASE_URL = 'https://pyramidcore.pyramidci.com/security/PCILoginNew.aspx';
const PAGE_TITLE = 'PyramidCore-Login';

// Test Credentials (Invalid — used for negative testing)
const INVALID_USERNAME = 'InvalidUser123';
const INVALID_PASSWORD = 'WrongPass123';

// Forgot Password Test Data
const TEST_EMAIL_NONEXISTENT = 'Test@test.com';

// Expected Messages
const EXPECTED_LOGIN_ERROR = '* User not found';
const EXPECTED_EMAIL_ERROR =
  'Entered email id does not exist, please use your registered email id in PyramidCore.';

// ─────────────────────────────────────────────────────────────────────────

test.describe('Login Page Validation', () => {
  test('MB_LOGIN_TC001 - Verify Login Page, Invalid Login Error, and Forgot Password Unregistered Email Error', async ({
    page,
  }) => {
    // Reusable locators
    const usernameField = page.getByRole('textbox', { name: 'User Id / Official Email Id' });
    const passwordField = page.getByRole('textbox', { name: 'Password' });
    const submitButton = page.locator('#pydLogin_btnLogin');
    const forgotPasswordLink = page.getByRole('link', { name: 'Forgot Password' });
    const modalIframe = page.locator('#Div21 iframe');
    const modalFrame = page.locator('#Div21 iframe').contentFrame();

    // ── Step 1: Navigate to the login page ──────────────────────────────
    await test.step('Navigate to PyramidCore login page', async () => {
      await page.goto(BASE_URL);
    });

    // ── Step 1 (verifications): Page loads with correct title and URL ────
    await test.step('Verify login page is displayed with correct title and URL', async () => {
      await expect(page).toHaveTitle(PAGE_TITLE);
      await expect(page).toHaveURL(BASE_URL);
    });

    // ── Step 2: Verify all expected UI elements are present ──────────────
    await test.step('Verify login page UI elements are visible', async () => {
      await expect(usernameField).toBeVisible();
      await expect(passwordField).toBeVisible();
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toBeEnabled();
      await expect(forgotPasswordLink).toBeVisible();
    });

    // ── Step 3: Enter invalid username ───────────────────────────────────
    await test.step('Enter invalid username in the User Id / Official Email Id field', async () => {
      await usernameField.fill(INVALID_USERNAME);
    });

    // ── Step 4: Enter invalid password ───────────────────────────────────
    await test.step('Enter invalid password in the Password field', async () => {
      await passwordField.fill(INVALID_PASSWORD);
    });

    // ── Step 5: Click Submit ─────────────────────────────────────────────
    await test.step('Click Submit button to attempt login with invalid credentials', async () => {
      await submitButton.click();
    });

    await test.step('Verify invalid login error message is displayed and user stays on login page', async () => {
      await expect(page.getByText(EXPECTED_LOGIN_ERROR)).toBeVisible();
      await expect(page).toHaveURL(BASE_URL);
    });

    // ── Step 6: Open Forgot Password modal ───────────────────────────────
    await test.step('Click Forgot Password link to open the modal', async () => {
      await forgotPasswordLink.click();
    });

    await test.step('Verify Forgot Password modal appears with heading, email field, Go and Reset buttons', async () => {
      // Modal container (iframe) is visible → modal is open
      await expect(modalIframe).toBeVisible();
      // Email field inside the modal iframe
      await expect(
        modalFrame.getByRole('textbox', { name: 'Please enter your official' }),
      ).toBeVisible();
      await expect(modalFrame.getByRole('button', { name: 'Go' })).toBeVisible();
      await expect(modalFrame.getByRole('button', { name: 'Reset' })).toBeVisible();
    });

    // ── Step 7: Enter non-existent email in the modal ────────────────────
    await test.step('Enter non-existent email in the Forgot Password modal email field', async () => {
      await modalFrame
        .getByRole('textbox', { name: 'Please enter your official' })
        .fill(TEST_EMAIL_NONEXISTENT);
    });

    // ── Step 8: Click Go and verify unregistered email error ─────────────
    await test.step('Click the Go button in the Forgot Password modal', async () => {
      await modalFrame.getByRole('button', { name: 'Go' }).click();
    });

    await test.step('Verify error message is shown in modal for non-existent email and modal remains open', async () => {
      await expect(modalFrame.getByText(EXPECTED_EMAIL_ERROR)).toBeVisible();
      // Modal remains open — iframe is still visible
      await expect(modalIframe).toBeVisible();
    });
  });
});
