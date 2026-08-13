# Test Plan: MB006 – Start a Pre-Placement (Steps 1–7, Mandatory Fields Only)

**Application:** MagicBox Pre-Placement Onboarding  
**URL:** https://10.35.213.32:8080/ui/onboarding/start  
**Functionality:** StartNewPlacement  
**User Story:** test_start_a_pre_placement  
**Scope:** Steps 1 through 7 only (Step 8 is explicitly excluded)

---

## TC001 – Complete Pre-Placement Onboarding Steps 1–7 with Mandatory Fields Only

### Objective
Navigate the Pre-Placement Onboarding wizard from the Start page through all 7 steps using
mandatory fields only. Entry is via the "From JobDiva" contractor table.

### Test Data
| Field | Value |
|---|---|
| Client Name Search | Py |
| Client Name Selection | Pyramid |
| End Client Name Search | Py |
| End Client Name Selection | Pyramid |
| Manager Search Term | Aakash Kumar |
| Manager Suggestion Filter | Aakash |
| Consultant First Name | John |
| Consultant Last Name | Smith |
| SSN Last 4 Digits | 1234 |
| Generic Text Value | QA Automation |
| Generic Number Value | 10 |
| Date Value | 2027-01-01 |
| Phone | 9175550184 |
| Email | john.smith.accenture.qa@example.com |
| Job Description | Automation job description for mandatory onboarding flow. |
| Skills (min 3) | Automation, API, Agile |
| Skills Typeahead Search | a |
| Min Skills Count | 3 |
| Test Timeout | 300000 ms |

---

### Pre-Conditions
- Application is accessible at the Start URL.
- At least one JobDiva contractor row with a "Start" button exists.

---

### Step-by-Step Test Procedure

#### Entry: Navigate to Start Pre-Placement

| # | Action | Expected Result |
|---|---|---|
| 1 | Navigate to `https://10.35.213.32:8080/ui/onboarding/start` | Page loads with heading "Start a Pre-Placement" |
| 2 | Verify "From JobDiva" link is visible | Link is displayed |
| 3 | Click "From JobDiva" | Contractor table becomes visible |
| 4 | Verify table with "Start" button rows is visible | Table with contractor rows displayed |
| 5 | Click the first row's "Start" button | Confirmation dialog appears |
| 6 | Accept the confirmation dialog | Dialog dismissed; page shows "Step 1 of 8" |

---

#### Step 1 – Initiate Preplacement (Step 1 of 8)

**Fields to fill (mandatory, observed in live UI):**

| Field | Type | Required | Method |
|---|---|---|---|
| Consultant First Name | text input (`#consultantFirstName`) | * | `fill(FIRST_NAME)` |
| Consultant Last Name | text input (`#consultantLastName`) | * | `fill(LAST_NAME)` |
| Govt. ID No. (Last 4 Char. Only) | text input (`#ssnLast4DigitsOnly`) | * | `fill('1234')` |
| Contract Type | native `<select>` (`#contractType`) | * | `selectOption({ index: 1 })` |
| Client Name | typeahead text input (`#clientName`) | * | Type "Py" → select "Pyramid" |
| End Client Name | typeahead text input (`#endClientName`) | * (conditional — appears after Client Name) | Type "Py" → select "Pyramid" |
| Division | native `<select>` | * | `selectOption({ index: 1 })` |

| # | Action | Expected Result |
|---|---|---|
| 7 | Fill `#consultantFirstName` with "John" | Input shows "John" |
| 8 | Fill `#consultantLastName` with "Smith" | Input shows "Smith" |
| 9 | Fill `#ssnLast4DigitsOnly` with "1234" | Input shows "1234" |
| 10 | Select index 1 in `#contractType` | Dropdown has a non-empty value |
| 11 | Type "Py" in Client Name typeahead, click "Pyramid" suggestion | `#clientName` has non-empty value |
| 12 | Verify "End Client Name *" label appears | Label is visible |
| 13 | Type "Py" in End Client Name typeahead, click "Pyramid" suggestion | `#endClientName` has non-empty value |
| 14 | Verify "Back" button is disabled and "Save & Next" is enabled | Button states match expected |
| 15 | Run generic mandatory filler (text, dropdowns, dates) | All empty mandatory fields filled |
| 16 | Click "Save & Next" | Page shows "Step 2 of 8" |

---

#### Step 2 – Consultant Information (Step 2 of 8)

**Fields include work location (state/city/zip) — the state dropdown may contain Indian or US states depending on contractor country.**

| # | Action | Expected Result |
|---|---|---|
| 17 | Run generic mandatory filler | Visible mandatory fields filled |
| 18 | Attempt state/city/zip combinations (MAHARASHTRA/400001, NEW YORK/10017, etc.) until Step 3 appears | Step 3 of 8 becomes visible |

---

#### Step 3 – Work Experience (Step 3 of 8)

**Key requirement: minimum 3 skills must be added. Resume upload is required.**

| Field | Type | Required |
|---|---|---|
| Skill input (placeholder "Skill") | text input with "Add skill" button | * (min 3) |
| Experience dropdown | native `<select>` with value "0-1" option | * per skill |
| Resume document | file upload after selecting doc type | Required |

| # | Action | Expected Result |
|---|---|---|
| 19 | Run generic mandatory filler | Visible fields filled |
| 20 | Add at least 3 skills (Automation, API, Agile) via skill input + "Add skill" button | Skills added; "At least 3 skills required" message not visible |
| 21 | Select "Resume" document type and upload dummy file | Document added |
| 22 | Re-run generic filler (dropdowns may have unlocked after skills) | Any newly enabled dropdowns filled |
| 23 | Click "Save & Next" | Page shows "Step 4 of 8" |

---

#### Step 4 – Project Details (Step 4 of 8)

**Key requirement: Client Reporting Manager, Hiring Manager, and Billing Manager typeaheads must be filled.**

| # | Action | Expected Result |
|---|---|---|
| 24 | Run generic mandatory filler | Text, dropdown, date fields filled |
| 25 | Fill Client Reporting Manager typeahead: type "Aakash Kumar", select "Aakash" | Field has value |
| 26 | Fill Client Hiring Manager typeahead: type "Aakash Kumar", select "Aakash" | Field has value |
| 27 | Fill Client Billing Manager typeahead: type "Aakash Kumar", select "Aakash" | Field has value |
| 28 | Fill C2C Phone with "9820014253" | Valid phone format accepted |
| 29 | Fill C2C FEIN with "12-3456789" | Valid EIN format accepted |
| 30 | Fill C2C Zip with "400001" | Zip accepted |
| 31 | Click "Save & Next" | Page shows "Step 5 of 8" |

---

#### Step 5 – Placement Roles (Step 5 of 8)

**Explicit required fields — each filled with select-first / typeahead suggestion / generic-text fallback. Retry up to 5× if still on Step 5 after clicking Save & Next.**

Required field patterns:
- Branch (Primary) *
- Credit % (Primary) *
- Vertical (Primary) *
- Human Resource Associate (HRA) *
- Consultant Care Associate (CCA) *
- Operations Manager *
- Recruiter – Role (Primary/Secondary) *
- STEP Recruiter – Role (Primary/Secondary) *
- Delivery Manager – Role (Primary/Secondary) *
- Branch Delivery Manager – Role (Primary/Secondary) *
- Resource Manager – Role/Employee (Primary/Secondary) *
- Account Delivery Manager – Role (Primary/Secondary) *
- Director Delivery – Role (Primary/Secondary) *
- Regional Sales Director *
- Primary Branch *
- Primary Vertical *

| # | Action | Expected Result |
|---|---|---|
| 32 | Fill all explicit required Placement Roles fields | Each field has a value |
| 33 | Click "Save & Next" (retry up to 5×, refill on each failed attempt) | Page shows "Step 6 of 8" |

---

#### Step 6 – Pay & Bill Details (Step 6 of 8)

**Critical: `Pay Rate Unit *` and `Bill Rate Unit *` are custom ARIA comboboxes (not native selects) — must be filled explicitly. `Overtime Eligibility *` is also a custom combobox.**

| Field | Type | Required | Method |
|---|---|---|---|
| Pay Rate | number spinbutton | * | Generic filler (number) |
| Pay Rate Unit | ARIA combobox (not native select) | * | `fillComboboxByLabel(/Pay Rate Unit/i)` |
| Bill Rate | number spinbutton | * | Generic filler (number) |
| Bill Rate Unit | ARIA combobox (not native select) | * | `fillComboboxByLabel(/Bill Rate Unit/i)` |
| Overtime Eligibility | ARIA combobox (not native select) | * | `fillComboboxByLabel(/Overtime Eligibility/i)` |
| Client Billing Manager | typeahead text input | * (conditional) | Type "Aakash Kumar" → select "Aakash" |

| # | Action | Expected Result |
|---|---|---|
| 34 | Run generic mandatory filler | Text and number fields filled |
| 35 | Fill Pay Rate Unit * custom combobox | "Hourly" or first option selected |
| 36 | Fill Bill Rate Unit * custom combobox | "Hourly" or first option selected |
| 37 | Fill Overtime Eligibility * custom combobox | First option selected |
| 38 | If Client Billing Manager visible and empty, fill typeahead | Field has value |
| 39 | Click "Save & Next" (retry up to 5×, refill comboboxes on each failed attempt) | Page shows "Step 7 of 8" |

---

#### Step 7 – HR Checklist (Step 7 of 8)

**Mandatory-only mode. Do NOT advance to Step 8.**

| # | Action | Expected Result |
|---|---|---|
| 40 | Run generic mandatory filler (text, dropdowns, dates) | Visible mandatory fields filled |
| 41 | Verify "Step 7 of 8" is still visible | Step indicator remains on Step 7 |
| 42 | *(Step 8 is out of scope — do not click Save & Next)* | — |

---

### Pass Criteria
- Test reaches Step 7 of 8 without errors.
- All mandatory fields in Steps 1–6 are successfully filled and accepted by the form.
- Minimum 3 skills are added in Step 3.
- All manager typeaheads resolve to valid selections.
- Pay Rate Unit * and Bill Rate Unit * comboboxes are filled (no "Pay Rate Unit is required" validation error).
- Step 7 indicator is visible and stable.

### Fail Criteria
- Form validation blocks advancement past any step.
- Fewer than 3 skills are added.
- Any mandatory manager or role field is left empty.
- Test times out before reaching Step 7.

### Out of Scope
- Step 8 (HR Onboarding submission) is explicitly excluded.
- Optional fields are not filled.
- Negative test cases are not covered.
