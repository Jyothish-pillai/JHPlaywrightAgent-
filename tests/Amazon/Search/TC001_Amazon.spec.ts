import { test, expect } from '@playwright/test';

const BASE_URL = 'https://www.amazon.in/';
const SEARCH_TERM = 'Dr.Ortho Flexi Ease Men Shoes';
const SEARCH_BOX_PLACEHOLDER = 'Search Amazon.in';
const PRODUCT_IMAGE_ALT = 'Dr.Ortho Flexi Ease Men Shoes';
const PRODUCT_TITLE_FRAGMENT = 'Dr.Ortho Flexi Ease';
const SEARCH_RESULTS_URL_PATTERN = /amazon\.in\/s\?/i;
const PRODUCT_DETAILS_URL_PATTERN = /amazon\.in\/.*\/dp\//i;

test.describe('Amazon Search', () => {
  test('TC001 - Search for a product and verify the Product Information Page', async ({ page }) => {
    let activePage = page;

    await test.step('Navigate to the Amazon India home page', async () => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveTitle(/Amazon\.in/i);
      await expect(page.locator('input[name="field-keywords"], #twotabsearchtextbox').first()).toBeVisible();
    });

    await test.step('Verify the Search Amazon.in input is ready for use', async () => {
      const searchBox = page.locator('input[name="field-keywords"], #twotabsearchtextbox').first();
      await expect(searchBox).toHaveAttribute('placeholder', SEARCH_BOX_PLACEHOLDER);
    });

    await test.step('Enter the full product name in the search box', async () => {
      const searchBox = page.locator('input[name="field-keywords"], #twotabsearchtextbox').first();
      await searchBox.fill(SEARCH_TERM);
      await expect(searchBox).toHaveValue(SEARCH_TERM);
    });

    await test.step('Submit the search and verify the results page opens', async () => {
      const searchBox = page.locator('input[name="field-keywords"], #twotabsearchtextbox').first();
      await searchBox.press('Enter');
      await expect(page).toHaveURL(SEARCH_RESULTS_URL_PATTERN);
      await expect(page.locator('[data-component-type="s-search-result"]').first()).toBeVisible();
    });

    await test.step('Verify the search results contain the target product image', async () => {
      const targetProductLink = page.locator(`a:has(img[alt="${PRODUCT_IMAGE_ALT}"])`).first();
      await targetProductLink.scrollIntoViewIfNeeded();
      await expect(targetProductLink).toBeVisible();
    });

    await test.step('Click the target product image to open the product page', async () => {
      const targetProductLink = page.locator(`a:has(img[alt="${PRODUCT_IMAGE_ALT}"])`).first();
      const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);

      await targetProductLink.click();

      const popup = await popupPromise;
      activePage = popup ?? page;

      await activePage.waitForLoadState('domcontentloaded');
      await expect(activePage).toHaveURL(PRODUCT_DETAILS_URL_PATTERN);
    });

    await test.step('Verify the product information page title matches the searched product', async () => {
      await expect(activePage).toHaveTitle(new RegExp(PRODUCT_TITLE_FRAGMENT, 'i'));

      const productTitle = activePage.locator('#productTitle').first();
      if (await productTitle.isVisible().catch(() => false)) {
        await expect(productTitle).toContainText(PRODUCT_TITLE_FRAGMENT, { ignoreCase: true });
      } else {
        await expect(activePage.locator('body')).toContainText(PRODUCT_TITLE_FRAGMENT, { ignoreCase: true });
      }
    });

    await test.step('Verify the main product image is visible on the product page', async () => {
      await expect(activePage.locator('#landingImage, #imgTagWrapperId img').first()).toBeVisible();
    });

    await test.step('Verify the product price is visible on the product page', async () => {
      const visiblePrice = activePage.locator(
        'span.a-price span.a-offscreen:visible, ' +
        '#price_inside_buybox:visible, ' +
        '#tp_price_block_total_price_ww .a-offscreen:visible',
      ).first();

      await expect(visiblePrice).toBeVisible();
      await expect(visiblePrice).toContainText(/₹\s?\d/i);
    });

    await test.step('Verify the product rating is visible on the product page', async () => {
      await expect(activePage.locator('#acrPopover .a-icon-alt, .reviewCountTextLinkedHistogram .a-icon-alt').first()).toBeVisible();
    });

    await test.step('Verify the Add to Cart action is available', async () => {
      await expect(activePage.locator('#add-to-cart-button, input[name="submit.add-to-cart"]').first()).toBeVisible();
    });

    await test.step('Verify the Buy Now action is available', async () => {
      await expect(activePage.locator('#buy-now-button, input[name="submit.buy-now"]').first()).toBeVisible();
    });
  });
});