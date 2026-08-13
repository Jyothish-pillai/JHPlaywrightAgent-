# Test Plan: TC001_Alloy - Login and Dashboard Navigation

**Application:** Alloy  
**Application URL:** http://localhost:5174/  
**Test Scope:** Login page accessibility, successful authentication, and dashboard navigation  
**Execution Mode:** Chrome only  
**Test Data Strategy:** inline  
**Timestamp:** 20260804_143000  

## Test Environment

- **Application Base URL:** http://localhost:5174/
- **Login Route:** /login
- **Test Browser:** Chrome (Chromium)
- **Environment:** Local development

## Test Data

| Field | Value |
|---|---|
| Base URL | http://localhost:5174/ |
| Login Route URL | http://localhost:5174/login |
| Username | sa |
| Password | Password |
| Expected Post-Login Route | / or /workspace or /dashboard |
| Expected Login Button Text | Login / Sign In / Submit |

## Preconditions

- The Alloy application is running and reachable at http://localhost:5174/
- Chrome/Chromium browser is available
- The login route `/login` is accessible
- No prior authenticated sessions exist
- Test credentials (username='sa', password='Password') are valid in the test environment

---

## Test Scenarios

### TC001 - Verify Login Page is Reachable

**Test Case ID:** TC-OA-UI-001  
**Objective:** Verify that the login page at the /login route is reachable and displays the login form with all required elements.

#### Steps

1. **Navigate to the login page**
   - Start Chrome browser
   - Navigate to `http://localhost:5174/login`
   - Expected Result: The login page loads without errors, displaying the login form

2. **Verify login page elements are visible**
   - Verify that a username input field is visible on the page
   - Verify that a password input field is visible on the page
   - Verify that a login/submit button is visible on the page
   - Expected Result: All login form elements are rendered and visible

3. **Verify page URL and title**
   - Verify the current page URL matches `http://localhost:5174/login` or similar login route
   - Verify the page has an appropriate title (e.g., "Login", "Sign In", "Alloy")
   - Expected Result: Page URL and title confirm this is the login page

#### Expected Results

- Login page loads successfully without errors
- All login form elements (username input, password input, login button) are visible
- Page URL contains `/login` or equivalent login route
- No error messages or validation warnings are displayed

---

### TC002 - Successful Login Lands on Workspace/Dashboard

**Test Case ID:** TC-OA-UI-002  
**Objective:** Verify that entering valid credentials and submitting the login form successfully authenticates the user and redirects to the workspace or dashboard page.

#### Steps

1. **Navigate to the login page**
   - Start Chrome browser
   - Navigate to `http://localhost:5174/login`
   - Expected Result: Login page loads successfully

2. **Enter username credentials**
   - Locate the username input field
   - Enter the username: `sa`
   - Expected Result: Username is entered into the field

3. **Enter password credentials**
   - Locate the password input field
   - Enter the password: `Password`
   - Expected Result: Password is entered into the field (displayed as dots/masked)

4. **Click the login button**
   - Locate and click the login/submit button
   - Expected Result: Form is submitted, page begins loading

5. **Verify successful login and redirect**
   - Wait for page navigation to complete
   - Verify that the user is redirected away from the login page
   - Verify the new page URL is NOT the login page (e.g., not `/login`)
   - Expected Result: User is successfully authenticated and redirected to workspace/dashboard

6. **Verify presence of workspace/dashboard elements**
   - Verify that workspace or dashboard content is visible
   - Verify that a logout link, user menu, or username display is visible (indicating successful login)
   - Expected Result: Post-login page displays authenticated content and user indication

#### Expected Results

- Valid credentials are accepted without validation errors
- User is redirected from login page to workspace/dashboard (URL changes)
- Workspace/dashboard page loads and displays authenticated content
- User identification (username, user menu, or profile) is visible on the post-login page
- No error messages are displayed

---

### TC003 - Navigate to Dashboard After Login

**Test Case ID:** TC-OA-UI-003  
**Objective:** Verify that an authenticated user can access the dashboard/workspace and that all main dashboard elements load correctly.

#### Steps

1. **Complete login process**
   - Navigate to `http://localhost:5174/login`
   - Enter username: `sa`
   - Enter password: `Password`
   - Click login button
   - Wait for redirect to workspace/dashboard
   - Expected Result: User is logged in and on workspace/dashboard page

2. **Verify dashboard page loads completely**
   - Verify the page URL indicates the user is on the dashboard/workspace (not on login page)
   - Verify the page title and main headings are visible
   - Expected Result: Dashboard page is fully loaded

3. **Verify main dashboard elements**
   - Verify that the main content area of the dashboard is visible
   - Verify that navigation elements (menu, sidebar, top navigation) are visible
   - Verify that user information or logout option is accessible
   - Expected Result: All major dashboard UI elements are rendered and functional

4. **Verify page stability**
   - Wait a few seconds to ensure no unexpected redirects occur
   - Verify the user remains on the dashboard page
   - Expected Result: Dashboard page is stable and does not redirect or reload unexpectedly

#### Expected Results

- User remains logged in after accessing the dashboard
- Dashboard/workspace page displays all expected UI elements
- Navigation and menus are functional
- Page remains stable without unexpected redirects
- User can clearly see they are authenticated (via username display or user menu)

---

## Test Execution Notes

- All tests should run on Chrome (Chromium) browser only
- Tests should use explicit waits and locator-based synchronization where appropriate
- Each test should close the browser after execution
- Screenshots should be captured for any failures
- Test steps should be wrapped in `test.step()` blocks with descriptive step titles

## Test Data Requirements

The tests require the following test data to be embedded in the generated scripts:
- Base URL: `http://localhost:5174/`
- Login endpoint: `/login`
- Test username: `sa`
- Test password: `Password`
- Expected post-login behavior: Redirect to workspace/dashboard (URL changes from `/login` to root or dashboard URL)

## Locator Strategy

Tests should use the following locator strategy priority:
1. Data-testid attributes (if available)
2. Accessible roles (e.g., `getByRole('textbox')`)
3. Label text (for form fields)
4. Placeholder text (for input fields)
5. Standard HTML attributes (name, id, type)
6. XPath as a fallback (if other strategies fail)

---

## Notes

- The page may use dynamic or React-based rendering, so tests should use appropriate waits
- The application appears to be a single-page application (SPA), so navigation may be via URL route changes rather than full page reloads
- Test credentials are stored in environment variables in the source user story but should be embedded directly in inline test data mode
- All test steps must be clearly described for stakeholder visibility in final reports
