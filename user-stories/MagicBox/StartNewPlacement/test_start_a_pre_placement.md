# MB006 - Fill All Mandatory Fields

## Objective

Automate the Pre-Placement onboarding wizard using mandatory fields only, based on the flow implemented in the test spec TC001_CompleteAllSteps7MandatoryField.spec.ts.

This story covers onboarding Steps 1 through 7 only.

## Application URL

https://10.35.213.32:8080/ui/onboarding/start

## Scope

1. Execute onboarding navigation from Start Pre-Placement -> From JobDiva -> contractor Start action.
2. Complete only required fields and step-specific required controls.
3. Handle typeaheads, dropdowns, date fields, skills, and manager fields.
4. Progress from Step 1 to Step 7.
5. Exclude Step 8 from this user story.

## Test Data Used

1. Client Name: Accenture LLP
2. End Client Name: Accenture
3. Manager Search Term: Aakash Kumar
4. Manager Suggestion Filter: Aakash
5. Generic Text Value: QA Automation
6. Generic Number Value: 10
7. Date Value: 2027-01-01
8. Address Line 1: 120 Lexington Ave
9. Address Line 2: Suite 500
10. City: New York
11. State/Province: NY
12. ZIP/Postal Code: 10017
13. Phone Number: 9175550184
14. Email: john.smith.accenture.qa@example.com
15. Job Description: Automation job description for mandatory onboarding flow.
16. Step 5 Typeahead Search Term: a
17. Skills List Candidates: Java, SQL, Testing, Automation, Playwright, API
18. Minimum Skills Required: 3
19. Test Timeout: 300000 ms
20. Completion Verification Timeout Note: Constant exists in spec but final completion path is not executed in this flow.

## Shared Mandatory-Field Rules from Spec

1. Fill only visible and enabled mandatory text-like inputs when empty; do not overwrite fields that already contain data.
2. Skip hidden, disabled, readonly-like, prefilled, checkbox, radio, date, file, skills-related, and search-placeholder text inputs during generic text fill.
3. For generic number inputs, use 10.
4. For generic text inputs, use QA Automation.
5. For select dropdowns, choose first non-default option (index 1) when empty/default.
6. For date inputs, use 2027-01-01 when empty.
7. Fill Job Description if present and empty.
8. Add at least 3 skills if Skills field is present.
9. Skills tokenizer strategy: try Enter first, then comma.
10. Fail if fewer than 3 skills are added.
11. Ensure validation text At least 3 skills required is not visible after skills fill.
12. For typeahead fill, click -> clear -> type search term with delay -> wait for suggestions -> click first matching li.
13. Typeahead fallback: ArrowDown + Enter when list click is unavailable.
14. Explicitly handle client manager fields: Reporting, Hiring, Billing.
15. If manager required-message is still visible, retry field fill via label/combobox/id-name fallback.
16. Generic step filler order: text inputs -> dropdowns -> date inputs.
17. Pre-submit filler includes Job Description, Skills, and Client Manager fields.
18. Dynamic typeahead helper exists but is intentionally not used for mandatory-only Step 7 path.

## Step 5 Explicit Required Field Patterns in Spec

1. Branch (Primary) *
2. Credit % (Primary) *
3. Vertical (Primary) *
4. Human Resource Associate (HRA) *
5. Consultant Care Associate (CCA) *
6. Operations Manager *
7. Recruiter - Role (Primary) *
8. Recruiter - Role (Secondary) *
9. STEP Recruiter - Role (Primary) *
10. STEP Recruiter - Role (Secondary) *
11. Delivery Manager - Role (Primary) *
12. Delivery Manager - Role (Secondary) *
13. Branch Delivery Manager - Role (Primary) *
14. Branch Delivery Manager - Role (Secondary) *
15. Resource Manager - Role (Primary) *
16. Resource Manager - Employee (Primary) *
17. Resource Manager - Role (Secondary) *
18. Resource Manager - Employee (Secondary) *
19. Account Delivery Manager - Role (Primary) *
20. Account Delivery Manager - Role (Secondary) *
21. Director Delivery - Role (Primary) *
22. Director Delivery - Role (Secondary) *
23. Regional Sales Director *
24. Primary Branch *
25. Primary Vertical *

## End-to-End Flow (As Implemented)

1. Open onboarding start URL.
2. Verify Start Pre-Placement link is visible.
3. Click Start Pre-Placement.
4. Verify Start a Pre-Placement heading and From JobDiva link.
5. Click From JobDiva.
6. Verify contractor table and Start button in rows.
7. Accept the confirmation dialog when starting contractor onboarding.
8. Click first contractor row Start.
9. Verify Step 1 of 8 is visible.

## Step 1 Workflow

1. Verify Country field with placeholder auto-populated is visible and disabled.
2. Fill Consultant First Name with John.
3. Fill Consultant Last Name with Smith.
4. Select Division first valid option.
5. Select Contract Type first valid option.
6. Fill Client Name typeahead using Py and select Pyramid suggestion.
7. Verify End Client Name becomes mandatory.
8. Fill End Client Name typeahead using Py and select Pyramid suggestion.
9. Category selection lines are present in code but commented out in current implementation.
10. Verify Back is disabled and Save & Next is enabled.
11. Run pre-submit mandatory helper.
12. Click Save & Next and verify Step 2 of 8.

## Step 2 Workflow

1. Run generic mandatory filler for current step.
2. Verify still on Step 2 while filling.
3. Run pre-submit helper.
4. Click Save & Next.
5. Verify Step 3 of 8.

## Step 3 Workflow

1. Run generic mandatory filler.
2. Ensure at least 3 skills are added.
3. Verify Step 3 remains visible during completion.
4. Run pre-submit helper.
5. Click Save & Next.
6. Verify Step 4 of 8.

## Step 4 Workflow

1. Run generic mandatory filler.
2. Fill Client Reporting Manager typeahead using Aakash Kumar and choose first matching Aakash suggestion.
3. Fill Client Hiring Manager typeahead using Aakash Kumar and choose first matching Aakash suggestion.
4. Fill Client Billing Manager typeahead using Aakash Kumar and choose first matching Aakash suggestion.
5. Verify Step 4 state.
6. Run pre-submit helper.
7. Click Save & Next.
8. Verify Step 5 of 8.

## Step 5 Workflow

1. Fill explicit required Placement Roles fields using label-driven logic.
2. For each field: try select handling first, otherwise typeahead suggestion, otherwise generic text fallback.
3. Click Save & Next with retry logic up to 5 attempts.
4. If still on Step 5 after an attempt, refill Step 5 explicit required fields.
5. Exit retry when Step 6 becomes visible.
6. Verify Step 6 of 8.

## Step 6 Workflow

1. Run generic mandatory filler.
2. Explicitly ensure Client Billing Manager is filled.
3. Verify Step 6 state.
4. Run pre-submit helper.
5. Click Save & Next.
6. Verify Step 7 of 8.

## Step 7 Workflow

1. Run mandatory-only generic filler for HR checklist step.
2. Keep dynamic optional typeahead filler disabled for this mandatory-only execution.
3. Verify Step 7 of 8 remains visible.
4. Step 7 submit to Step 8 is intentionally commented out in current script.

## Explicit Exclusion

1. Do not include Step 8 in this story.
2. Final submission/completion assertions are intentionally out of scope.

## Error Handling and Evidence

1. On test failure, capture full-page screenshot.
2. Screenshot path directory: test-results/screenshots.
3. Filename pattern: MB003-TC001-failure-<timestamp>.png.

## Acceptance Criteria

1. Navigation successfully reaches Step 7 using mandatory-field-driven input.
2. Required fields are filled through control-type aware logic only when blank; mandatory fields with existing values are not updated.
3. Skills requirement (minimum 3) is satisfied when Skills field is present.
4. Manager fields are handled with retry/fallback behavior when required.
5. Step 5 dynamic required role assignments are handled with explicit field patterns and retry.
6. No Step 8 content or completion behavior is included in this user story.
