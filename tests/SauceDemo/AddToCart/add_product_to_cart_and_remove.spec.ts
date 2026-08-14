// spec: specs/SauceDemo/AddToCart/add_product_to_cart_and_remove-test-plan.md
// story: user-stories/SauceDemo/AddToCart/add_product_to_cart_and_remove.md
// Chrome-only execution (project: chromium, channel: chrome)

import { test, expect, type Locator, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────
// INLINE TEST DATA (TEST_DATA_STRATEGY=inline — all data embedded here,
// no external files, no Excel imports; this spec is fully portable)
// ─────────────────────────────────────────────────────────────────────────

// Application configuration
const BASE_URL = 'https://www.saucedemo.com/';
const INVENTORY_URL_PATTERN = /inventory\.html/;
const CART_URL_PATTERN = /cart\.html/;

// User credentials
const USERNAME = 'standard_user';
const PASSWORD = 'secret_sauce';

// Product under test
const PRODUCT_NAME = 'Sauce Labs Backpack';
const PRODUCT_PRICE = '$29.99';
const ADD_TO_CART_TESTID = 'add-to-cart-sauce-labs-backpack';
const REMOVE_TESTID = 'remove-sauce-labs-backpack';

// Expected values (observed live during exploration)
const EXPECTED_PAGE_TITLE = 'Swag Labs';
const EXPECTED_PRODUCTS_HEADING = 'Products';
const EXPECTED_CART_HEADING = 'Your Cart';
const EXPECTED_BADGE_AFTER_ADD = '1';
const EXPECTED_CART_QUANTITY = '1';
const EXPECTED_ADD_BUTTON_TEXT = 'Add to cart';

/**
 * SauceDemo exposes stable test hooks through the `data-test` attribute, while
 * Playwright's built-in getByTestId() resolves `data-testid`. This helper keeps
 * the spec on the same stable attribute without changing global config.
 */
const byTest = (scope: Page | Locator, id: string): Locator => scope.locator(`[data-test="${id}"]`);

test.describe('SauceDemo — Add to Cart', () => {
  test('SAUCEDEMO_ADDTOCART_TC001 - Add Sauce Labs Backpack to the cart and remove it from the cart', async ({ page }) => {
    // Reusable locators — every element exposes a stable data-test attribute
    const cartBadge = byTest(page, 'shopping-cart-badge');
    const pageHeading = byTest(page, 'title');
    const backpackCard = byTest(page, 'inventory-item').filter({ hasText: PRODUCT_NAME });

    await test.step('Navigate to the Swag Labs login page', async () => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveTitle(EXPECTED_PAGE_TITLE);
      await expect(byTest(page, 'username')).toBeVisible();
      await expect(byTest(page, 'password')).toBeVisible();
      await expect(byTest(page, 'login-button')).toBeVisible();
    });

    await test.step('Log in as the standard user with valid credentials', async () => {
      await byTest(page, 'username').fill(USERNAME);
      await byTest(page, 'password').fill(PASSWORD);
      await byTest(page, 'login-button').click();
      await expect(page).toHaveURL(INVENTORY_URL_PATTERN);
    });

    await test.step('Verify the Products page is displayed with an empty shopping cart', async () => {
      await expect(pageHeading).toHaveText(EXPECTED_PRODUCTS_HEADING);
      // The badge element is absent from the DOM when the cart is empty (it never renders "0")
      await expect(cartBadge).toHaveCount(0);
    });

    await test.step(`Verify the ${PRODUCT_NAME} product is listed with its price`, async () => {
      await expect(backpackCard).toHaveCount(1);
      await expect(byTest(backpackCard, 'inventory-item-name')).toHaveText(PRODUCT_NAME);
      await expect(byTest(backpackCard, 'inventory-item-price')).toHaveText(PRODUCT_PRICE);
    });

    await test.step(`Add ${PRODUCT_NAME} to the shopping cart from the Products page`, async () => {
      await byTest(backpackCard, ADD_TO_CART_TESTID).click();
      // The product card button toggles from "Add to cart" to "Remove"
      await expect(byTest(backpackCard, REMOVE_TESTID)).toBeVisible();
    });

    await test.step('Verify the shopping cart badge shows one item', async () => {
      await expect(cartBadge).toBeVisible();
      await expect(cartBadge).toHaveText(EXPECTED_BADGE_AFTER_ADD);
    });

    await test.step('Open the shopping cart', async () => {
      await byTest(page, 'shopping-cart-link').click();
      await expect(page).toHaveURL(CART_URL_PATTERN);
      await expect(pageHeading).toHaveText(EXPECTED_CART_HEADING);
    });

    await test.step(`Verify the cart contains ${PRODUCT_NAME} with quantity 1`, async () => {
      const cartItem = byTest(page, 'inventory-item');
      await expect(cartItem).toHaveCount(1);
      await expect(byTest(cartItem, 'inventory-item-name')).toHaveText(PRODUCT_NAME);
      await expect(byTest(cartItem, 'item-quantity')).toHaveText(EXPECTED_CART_QUANTITY);
    });

    await test.step(`Remove ${PRODUCT_NAME} from the shopping cart`, async () => {
      await byTest(page, REMOVE_TESTID).click();
      await expect(byTest(page, 'inventory-item')).toHaveCount(0);
      await expect(byTest(page, REMOVE_TESTID)).toHaveCount(0);
    });

    await test.step('Verify the shopping cart badge is cleared after removal', async () => {
      // Removal deletes the badge from the DOM entirely — it does not display "0"
      await expect(cartBadge).toHaveCount(0);
      await expect(page).toHaveURL(CART_URL_PATTERN);
      await expect(pageHeading).toHaveText(EXPECTED_CART_HEADING);
    });

    await test.step('Return to the Products page and verify the product can be added again', async () => {
      await byTest(page, 'continue-shopping').click();
      await expect(page).toHaveURL(INVENTORY_URL_PATTERN);
      await expect(byTest(backpackCard, ADD_TO_CART_TESTID)).toHaveText(EXPECTED_ADD_BUTTON_TEXT);
      await expect(cartBadge).toHaveCount(0);
    });
  });

  // Close the browser page after each test execution
  test.afterEach(async ({ page }) => {
    await page.close();
  });
});
