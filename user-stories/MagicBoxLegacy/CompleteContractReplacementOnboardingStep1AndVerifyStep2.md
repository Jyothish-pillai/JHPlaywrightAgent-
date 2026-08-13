# MB-CR001 – Complete Contract Replacement Onboarding Step 1 and Verify Step 2

## Objective

Automate the Contract Replacement onboarding flow by logging into MagicBox, initiating a new contract replacement record, completing all required fields in Step 1 – Initiate Preplacement, saving the step, and verifying that Step 2 – Consultant Information is displayed as the active step.

> **Note:** The performance of the application is very slow. Add generous wait times and avoid hard timeouts. Retry interactions if elements are not immediately responsive.

## Application URL

- https://10.35.213.19/report/#

## User Story

As an Onboarding user,
I want to initiate a contract replacement onboarding record and complete Step 1 with the required consultant details,
so that I can successfully proceed to Step 2 – Consultant Information.

## Test Data

| Field                  | Value                                              |
|------------------------|----------------------------------------------------|
| Username               | rohit.laishram@celsiortech.com                     |
| Password               | Pyramid@1                                          |
| Candidate Row          | CAFN-roC CAFN-eG (Shure Incorporated, Api Developer) |
| Consultant First Name  | CAFN-roC (pre-filled from candidate record)        |
| Consultant Middle Name | Leave blank                                        |
| Consultant Last Name   | CAFN-eG (pre-filled from candidate record)         |
| Suffix                 | Jr                                                 |
| SSN Last 4 Digits      | 4567                                               |
| Division               | Celsior                                            |
| Contract Type          | C2C                                                |
| Client Name            | CUS-avA (pre-filled / Shure Incorporated)          |
| End Client Name        | Not visible – field is hidden for this flow        |

### Available Division Options
`Celsior`, `GenSpark`, `Staffing`

### Available Contract Type Options
`C2C`, `W2 H`, `FT S`, `1099`, `Unpaid Trainee`, `1099 (GS Direct Hires)`

### Available Suffix Options
`Jr`, `Sr`, `II`, `III`

## Planner Workflow

### 1. Login to MagicBox

1. Navigate to the application URL: `https://10.35.213.19/report/#`.
2. Enter username `rohit.laishram@celsiortech.com` and password `Pyramid@1`.
3. Click the Login button.
4. Wait for the MagicBox dashboard to fully load.
5. Verify that the MagicBox dashboard is displayed successfully.

### 2. Navigate to Initiate Contract Pre-Placements

1. Click **Onboarding +** in the top navigation bar to expand the menu.
2. From the dropdown, click **Initiate Contract Pre-Placements**.
3. Wait for the page to load fully (URL: `https://10.35.213.19/pci/search/joblisting?perform=1`).
4. Verify that the **Create Pre-Placement** page is displayed with a table of candidates.


### 3. Create Onboarding Record

1. On the Create Pre-Placement page, locate the row for candidate **CAFN-roC CAFN-eG** (Shure Incorporated, Api Developer).
2. Click the **Create Onboarding Record** button in the Action column for that row.
3. Wait for the **Consultant Demographic** confirmation page to load.
4. The page displays: _"Proceeding to this page will create a new onboarding record for CAFN-roC CAFN-eG (Shure Incorporated Client), Please Confirm."_
5. Click the **Save & Create** button.
6. Wait for the onboarding wizard to load (URL pattern: `.../pci/entity/onb_demographic/{id}?tab=step-1`).
7. Verify that **Step 1 – Initiate Preplacement** is displayed and active (dark blue) in the step indicator.

> **Step Indicator:** The wizard has 8 steps:
> Step 1 – Initiate Preplacement → Step 2 – Consultant Information → Step 3 – Skills → Step 4 – Project Details → Step 5 – Placement Roles → Step 6 – Pay & Bill Details → Step 7 – HR Checklist → Final Step – Review & Submit

### 4. Fill Step 1 – Initiate Preplacement

> **Note:** The **Consultant First Name**, **Consultant Last Name**, and **Client Name** fields are auto-filled from the candidate record. Verify their values before proceeding.

1. Wait for the Step 1 form to be fully visible with all fields rendered.
2. Verify that **Consultant First Name** is pre-filled with `CAFN-roC`. Do not change this value.
3. Verify that **Consultant Last Name** is pre-filled with `CAFN-eG`. Do not change this value.
4. Leave **Consultant Middle Name** blank.
5. Select **Suffix** as `Jr` from the dropdown.
6. Enter `4567` in the **SSN (Last 4 Digits Only)** field.
7. Select **Division** as `Celsior` from the dropdown.
8. Select **Contract Type** as `C2C` from the dropdown.
9. Verify that **Client Name** is pre-selected as `CUS-avA` (Shure Incorporated). If not, select it.
10. The **End Client Name** field is hidden for this flow — skip it without error.
11. Confirm no inline validation errors are visible after filling all fields.

### 5. Save Step 1 and Confirm Popup

1. Click the **Save and Continue** button (top-right area of the form, next to "Back to Previous" and "Back to Dashboard").
2. Wait for the confirmation popup to appear.
3. Click **OK** on the confirmation popup.
4. Wait for the page to complete navigation to Step 2.

### 6. Verify Step 2 is Active

1. Verify that **Step 2 – Consultant Information** is displayed on the page.
2. Verify that Step 2 is highlighted as the currently active step in the step indicator.

## Validation and Error Handling Rules

1. Do not proceed from Step 1 until all mandatory fields (marked with `*`) contain valid data: SSN, Division, Contract Type.
2. **Consultant First Name**, **Consultant Last Name**, and **Client Name** are pre-filled — verify them but do not clear or re-enter unless incorrect.
3. If a validation message appears after clicking Save and Continue, capture the field name and resolve the input before retrying.
4. The **End Client Name** field is hidden (`d-none`) and should not be interacted with. Skip it without error.
5. If auto-filled fields contain unexpected values, overwrite them with the specified test data values.
6. If the confirmation popup does not appear after clicking Save and Continue, retry once before failing.
7. Due to slow application performance, use explicit waits for page transitions and element visibility rather than fixed timeouts. Add at least 5–10 second dynamic waits between major navigation steps.
8. The "Onboarding +" menu link is `<a href="#">Onboarding</a>` — use `a[href="#"]:has-text("Onboarding")` as the selector.

## Acceptance Criteria

| ID  | Criterion |
|-----|-----------|
| AC1 | User can log in to MagicBox with valid credentials and the dashboard is displayed. |
| AC2 | Selecting **Onboarding > Initiate Contract Pre-Placements** navigates to the Create Pre-Placement page (`/pci/search/joblisting?perform=1`). |
| AC3 | Clicking **Create Onboarding Record** for **CAFN-roC CAFN-eG** (Shure Incorporated) followed by **Save & Create** on the Consultant Demographic page displays Step 1 – Initiate Preplacement. |
| AC4 | All required fields in Step 1 are completed without validation errors: SSN = 4567, Division = Celsior, Contract Type = C2C. Pre-filled fields (First Name, Last Name, Client Name) are verified. |
| AC5 | Clicking **Save and Continue** and confirming the popup saves Step 1 successfully. |
| AC6 | After saving, **Step 2 – Consultant Information** is displayed and highlighted as the active step in the wizard. |
| AC2 | Selecting **Onboarding > Initiate Contract Replacement** navigates to the Create Replacement page. |
| AC3 | Clicking **Create Onboarding Record** followed by **Save and Create** on the Consultant Demographic page displays Step 1 – Initiate Preplacement. |
| AC4 | All required fields in Step 1 are completed without validation errors. |
| AC5 | Clicking **Save and Continue** and confirming the popup saves Step 1 successfully. |
| AC6 | After saving, Step 2 – Consultant Information is displayed and highlighted as the active step. |

## Expected Outcome

- The user logs into MagicBox successfully.
- The Contract Replacement onboarding record is created and Step 1 – Initiate Preplacement is displayed.
- All required fields in Step 1 are completed .
- The form is saved and the confirmation popup is dismissed without errors.
- Step 2 – Consultant Information is displayed and active, with no validation errors remaining.
