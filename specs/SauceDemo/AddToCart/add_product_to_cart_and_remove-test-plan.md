# Test Plan — Remove Product from Cart (SauceDemo)

- **Application:** SauceDemo (Swag Labs)
- **Functionality path:** `AddToCart`
- **User story:** `user-stories/SauceDemo/AddToCart/add_product_to_cart_and_remove.md`
- **Story type:** UI story (Playwright `page` fixture)
- **Browser policy:** Google Chrome only (`--project=chromium`, `channel: 'chrome'`)
- **Test data strategy:** `inline` (all data embedded in the generated spec)
- **Plan basis:** Live Chrome exploration of https://www.saucedemo.com/ performed before writing this plan

---

## 1. Live Observations (captured from the running application)

### 1.1 Login page — `https://www.saucedemo.com/`

| Observation | Actual observed value |
|---|---|
| Page title | `Swag Labs` |
| Logo text | `Swag Labs` |
| Username field | `input[data-test="username"]`, placeholder `Username` |
| Password field | `input[data-test="password"]`, placeholder `Password` |
| Login button | `input[data-test="login-button"]`, value/label `Login` |

### 1.2 Products page — `https://www.saucedemo.com/inventory.html`

| Observation | Actual observed value |
|---|---|
| URL after login | `https://www.saucedemo.com/inventory.html` |
| Page heading | `Products` (`[data-test="title"]`) |
| App logo | `Swag Labs` (`.app_logo`) |
| Product card container | `[data-test="inventory-item"]` (exactly 1 card matches `Sauce Labs Backpack`) |
| Product name element | `[data-test="inventory-item-name"]` → `Sauce Labs Backpack` |
| Product price element | `[data-test="inventory-item-price"]` → `$29.99` |
| Cart badge before add | **absent** — `[data-test="shopping-cart-badge"]` count = `0` |
| Add button (before add) | `button[data-test="add-to-cart-sauce-labs-backpack"]`, text `Add to cart` |
| Cart link | `[data-test="shopping-cart-link"]` (class `shopping_cart_link`, no `href`) |

### 1.3 Behaviour observed after clicking `Add to cart`

| Observation | Actual observed value |
|---|---|
| Product card button toggles | `button[data-test="remove-sauce-labs-backpack"]`, text `Remove` |
| Cart badge | appears with text `1` (`[data-test="shopping-cart-badge"]`) |

### 1.4 Cart page — `https://www.saucedemo.com/cart.html`

| Observation | Actual observed value |
|---|---|
| URL after clicking cart link | `https://www.saucedemo.com/cart.html` |
| Page heading | `Your Cart` (`[data-test="title"]`) |
| Column labels | `QTY`, `Description` |
| Cart line items | `1` (`[data-test="inventory-item"]`) |
| Item name | `Sauce Labs Backpack` (`[data-test="inventory-item-name"]`) |
| Item quantity | `1` (`[data-test="item-quantity"]`) |
| Buttons present | `remove-sauce-labs-backpack` (`Remove`), `continue-shopping` (`Continue Shopping`), `checkout` (`Checkout`) |

### 1.5 Behaviour observed after clicking `Remove` on the cart page

| Observation | Actual observed value |
|---|---|
| Cart line items | `0` — the row disappears |
| Cart badge | **removed from the DOM** — `[data-test="shopping-cart-badge"]` count = `0` (no `0` badge is rendered) |
| URL | stays on `https://www.saucedemo.com/cart.html` |
| Heading | still `Your Cart` |
| `Remove` button | no longer present; only `Continue Shopping` and `Checkout` remain |
| No confirmation dialog / toast | none observed — removal is immediate and silent |
| Back on Products page (`Continue Shopping`) | button reverts to `add-to-cart-sauce-labs-backpack` / `Add to cart`, cart badge still absent |

> ⚠️ Key behaviour that shapes the assertions: the cart badge is **removed from the DOM**, it does not display `0`. Assertions must check for *absence* (`toHaveCount(0)` / `not.toBeVisible()`), not for text `0`.

---

## 2. Test Data (inline — embedded in the spec)

| Constant | Value |
|---|---|
| `BASE_URL` | `https://www.saucedemo.com/` |
| `USERNAME` | `standard_user` |
| `PASSWORD` | `secret_sauce` |
| `PRODUCT_NAME` | `Sauce Labs Backpack` |
| `PRODUCT_PRICE` | `$29.99` |
| `PRODUCT_ID_SLUG` | `sauce-labs-backpack` |
| `INVENTORY_URL_PATTERN` | `/inventory\.html/` |
| `CART_URL_PATTERN` | `/cart\.html/` |
| `EXPECTED_PRODUCTS_HEADING` | `Products` |
| `EXPECTED_CART_HEADING` | `Your Cart` |
| `EXPECTED_BADGE_AFTER_ADD` | `1` |
| `EXPECTED_CART_QUANTITY` | `1` |

---

## 3. Test Scenario

### TC001 — Add Sauce Labs Backpack to the cart and remove it from the cart

**Test case ID:** `SAUCEDEMO_ADDTOCART_TC001`
**Functionality:** AddToCart
**Type:** Positive / happy path
**Precondition:** Standard user credentials are valid; the cart is empty at session start (fresh browser context per test).

| # | Test step | Expected result (as observed live) |
|---|---|---|
| 1 | Navigate to the Swag Labs login page | Login page loads at `https://www.saucedemo.com/`, page title is `Swag Labs`, `Username` and `Password` fields and the `Login` button are visible |
| 2 | Enter username `standard_user` and password `secret_sauce`, then click `Login` | Login is accepted and the browser lands on `https://www.saucedemo.com/inventory.html` |
| 3 | Verify the Products page is displayed with an empty cart | Heading `Products` is visible; the shopping cart badge is **not present** |
| 4 | Locate the `Sauce Labs Backpack` product card | Exactly one inventory item matches; its name reads `Sauce Labs Backpack` and its price reads `$29.99` |
| 5 | Click `Add to cart` on the `Sauce Labs Backpack` card | The card button toggles to `Remove` (`data-test="remove-sauce-labs-backpack"`) |
| 6 | Verify the shopping cart badge reflects one item | The cart badge is visible and shows `1` |
| 7 | Open the shopping cart | Browser navigates to `https://www.saucedemo.com/cart.html` and the heading reads `Your Cart` |
| 8 | Verify the cart contains the added product | Exactly one cart line item is listed, its name is `Sauce Labs Backpack` and the QTY column shows `1` |
| 9 | Click `Remove` against the `Sauce Labs Backpack` line item | The line item is removed — no inventory items remain on the cart page and the `Remove` button is gone |
| 10 | Verify the shopping cart badge is cleared | The cart badge is removed from the page entirely (count = 0, not a `0` label), while the page stays on `Your Cart` |
| 11 | Return to the Products page via `Continue Shopping` | Browser returns to `https://www.saucedemo.com/inventory.html`; the Backpack card button reads `Add to cart` again and the cart badge remains absent |

**Acceptance criteria coverage:**

- *The selected product is removed from the shopping cart* → steps 9, 11
- *The shopping cart badge is updated accordingly* → steps 6, 10, 11

---

## 4. Locator Strategy (from observed identifiers only)

| Element | Locator to use |
|---|---|
| Username field | `page.getByTestId('username')` |
| Password field | `page.getByTestId('password')` |
| Login button | `page.getByTestId('login-button')` |
| Page heading | `page.getByTestId('title')` |
| Backpack product card | `page.getByTestId('inventory-item').filter({ hasText: 'Sauce Labs Backpack' })` |
| Add to cart button | `page.getByTestId('add-to-cart-sauce-labs-backpack')` |
| Remove button | `page.getByTestId('remove-sauce-labs-backpack')` |
| Cart link | `page.getByTestId('shopping-cart-link')` |
| Cart badge | `page.getByTestId('shopping-cart-badge')` |
| Cart item quantity | `page.getByTestId('item-quantity')` |
| Continue Shopping | `page.getByTestId('continue-shopping')` |

No XPath, no `.nth()` positional selectors, no auto-generated class chains are required — every element exposes a stable `data-test` attribute.

---

## 5. Execution Notes

- Chrome only: `npx playwright test tests/SauceDemo/AddToCart/add_product_to_cart_and_remove.spec.ts --project=chromium`
- One positive test case only, per pipeline STEP 2.4.
- No static waits — rely on Playwright auto-waiting, `waitForURL`, and web-first assertions.
- Browser is closed after execution (`afterEach` closes the page context).
