# Test Plan: TC001_Amazon - Search for Product and Verify Product Information Page

**Application:** Amazon India  
**User Story:** TC001_Amazon  
**Source Story:** user-stories/Amazon/Search/TC001_Amazon.md  
**Execution Mode:** Chrome only  
**Test Data Strategy:** inline  

## Live Observation Summary

- Landing page URL observed: `https://www.amazon.in/`
- Landing page title observed: `Online Shopping site in India: Shop Online for Mobiles, Books, Watches, Shoes and More - Amazon.in`
- Search input observed: `input[name="field-keywords"]` and `#twotabsearchtextbox`
- Search input placeholder observed: `Search Amazon.in`
- Search results URL pattern observed: `https://www.amazon.in/s?...`
- Search result container observed: `[data-component-type="s-search-result"]`
- Matching product image alt observed in results: `Dr.Ortho Flexi Ease Men Shoes`
- Product page URL pattern observed: `https://www.amazon.in/.../dp/...`
- Product page title observed: `Buy Dr.Ortho Flexi Ease Walking Sports Shoes for Men | Soft Cushioned | Flexible, Breathable and Comfortable |Stylish Soft Shoes| Regular Wear Without Lace Shoes | Running Walking Shoes | Size - 06 Blue at Amazon.in`
- Product page controls observed: `#add-to-cart-button`, `#buy-now-button`
- Product image observed: `#landingImage` or `#imgTagWrapperId img`
- Rating locator observed: `#acrPopover .a-icon-alt` or `.reviewCountTextLinkedHistogram .a-icon-alt`
- Price locator observed during exploration: `#corePriceDisplay_desktop_feature_div .a-offscreen`, `#priceblock_ourprice`, or `#priceblock_dealprice`

## Test Data

| Field | Value |
|---|---|
| Start URL | `https://www.amazon.in/` |
| Search Term | `Dr.Ortho Flexi Ease Men Shoes` |
| Expected Search Box Placeholder | `Search Amazon.in` |
| Expected Product Image Alt | `Dr.Ortho Flexi Ease Men Shoes` |
| Expected Product Title Fragment | `Dr.Ortho Flexi Ease` |

## Preconditions

- Amazon India is reachable from the test environment.
- Chrome project is available in Playwright.
- No login is required for this scenario.

## TC001 - Search for the product and open the Product Information Page

### Objective

Verify that an anonymous user can search for `Dr.Ortho Flexi Ease Men Shoes`, open the product by clicking its image from the search results, and view key product details on the Product Information Page.

### Steps

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `https://www.amazon.in/` | Amazon India home page loads successfully |
| 2 | Verify the search box with placeholder `Search Amazon.in` is visible | Search box is ready for input |
| 3 | Enter `Dr.Ortho Flexi Ease Men Shoes` into the search box | Search box contains the full product name |
| 4 | Submit the search using the search action | Results page opens with URL matching `/s?` |
| 5 | Verify search results are displayed using `[data-component-type="s-search-result"]` | Search results list is visible and contains items |
| 6 | Locate the product image with alt text `Dr.Ortho Flexi Ease Men Shoes` | Target product image is visible in the results |
| 7 | Click the product image | Product Information Page opens |
| 8 | Verify the page URL matches the observed `/dp/` product URL pattern | User is on a product details page |
| 9 | Verify the page title contains `Dr.Ortho Flexi Ease` | The selected product page matches the searched product |
| 10 | Verify the product image is visible using `#landingImage` or `#imgTagWrapperId img` | Main product image is displayed |
| 11 | Verify the product price is visible using the observed price locators | Price information is displayed |
| 12 | Verify the product rating is visible using `#acrPopover .a-icon-alt` or `.reviewCountTextLinkedHistogram .a-icon-alt` | Rating is displayed |
| 13 | Verify the Add to Cart control is visible using `#add-to-cart-button` or `input[name="submit.add-to-cart"]` | Add to Cart action is available |
| 14 | Verify the Buy Now control is visible using `#buy-now-button` or `input[name="submit.buy-now"]` | Buy Now action is available |

### Pass Criteria

- The user can search for the product from the Amazon India home page.
- The results page returns one or more search result cards.
- Clicking the product image opens a product details page.
- The product details page shows the expected title fragment, image, price, rating, Add to Cart, and Buy Now controls.

### Fail Criteria

- The home page does not load.
- The search box is not interactive.
- Search results do not appear.
- The product image cannot be clicked.
- The product page does not open or required product details are missing.