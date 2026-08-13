# PyramidCore Login Validation Test Plan

## Application Overview

Test plan for validating PyramidCore (MagicBox) login page functionality at https://pyramidcore.pyramidci.com/security/PCILoginNew.aspx. Covers login page verification, invalid credential error validation, and Forgot Password flow with unregistered email error validation. All element identifiers, labels, and error messages are sourced from live exploration of the application.

## Test Scenarios

### 1. Login Page Validation

**Seed:** `tests/seed.spec.ts`

#### 1.1. MB_LOGIN_TC001 - Verify Login Page, Invalid Login Error, and Forgot Password Unregistered Email Error

**File:** `tests/MagicBox/StartNewPlacement/Login_Pyramidcore.spec.ts`

**Steps:**
  1. Launch the PyramidCore application by navigating to https://pyramidcore.pyramidci.com/security/PCILoginNew.aspx in a supported browser.
    - expect: The browser successfully loads the login page.
    - expect: The page title is 'PyramidCore-Login'.
    - expect: The page URL is https://pyramidcore.pyramidci.com/security/PCILoginNew.aspx.
  2. Verify that the Login page is displayed with all expected UI elements.
    - expect: A text input field with label/placeholder 'User Id / Official Email Id' is visible.
    - expect: A password input field with label 'Password' is visible.
    - expect: A 'Submit' button is visible and enabled.
    - expect: A 'Forgot Password' link is visible on the page.
  3. Enter the invalid username 'InvalidUser123' in the 'User Id / Official Email Id' field.
    - expect: The text 'InvalidUser123' is entered in the username field.
  4. Enter the invalid password 'WrongPass123' in the 'Password' field.
    - expect: The password is entered (masked) in the Password field.
  5. Click the 'Submit' button.
    - expect: The page remains on https://pyramidcore.pyramidci.com/security/PCILoginNew.aspx.
    - expect: An error message '* User not found' is displayed on the login form.
    - expect: The user is NOT navigated to any authenticated page.
  6. Click the 'Forgot Password' link.
    - expect: A 'Forgot Password' modal/popup dialog appears.
    - expect: The modal contains a heading 'Forgot Password'.
    - expect: An email input field with label 'Email ID*' and placeholder 'Enter your official email registered in PyramidCore' is displayed.
    - expect: A 'Go' button and a 'Reset' button are visible inside the modal.
  7. In the Forgot Password modal, enter the email 'Test@test.com' in the 'Email ID*' field.
    - expect: The text 'Test@test.com' is entered in the email field.
  8. Click the 'Go' button in the Forgot Password modal.
    - expect: The form is submitted.
    - expect: An error message 'Entered email id does not exist, please use your registered email id in PyramidCore.' is displayed within the Forgot Password modal.
    - expect: The modal remains open (the user is not redirected).
