# User Story: Complete Placement Workflow Using Mandatory Fields and Test Data

## Application URL

<https://10.35.213.19/report/#>

---

## User Story

**Title:** Create an Onboarding Record and Complete the Placement Workflow from Step 1 through Step 7 Using Mandatory Fields

> **As an** Onboarding user,
> **I want to** log in to MagicBox, initiate a Contract Pre-Placement onboarding record for an available candidate, and complete the Placement workflow from Step 1 – Initiate Preplacement through Step 7 – HR Checklist by entering or selecting only mandatory information,
> **So that** I can successfully create a Placement record using valid test data while preserving all system-generated, calculated, dependent, and auto-populated information.

---

## Login Test Data

| Field    | Value                            |
| -------- | -------------------------------- |
| Username | rohit.laishram@celsiortech.com   |
| Password | Pyramid@1                        |

---

## Global Execution Rules

The Planner, Generator, and Playwright Agent must follow these rules throughout the complete workflow:

1. Execute the workflow **sequentially**:
   `Login → Navigate to Initiate Contract Pre-Placements → Create Onboarding Record → Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6 → Step 7 → Final Review & Submit`

2. Complete **mandatory fields only**, except for explicit business requirements such as adding three skills and uploading two required documents.

3. If a field contains an **auto-populated, system-generated, calculated, dependent, defaulted, or read-only** value:
   - Verify that the expected value is populated.
   - Do **not** clear the field.
   - Do **not** type into the field.
   - Do **not** overwrite the field.
   - Do **not** select another value.
   - Do **not** modify the field in any way.

4. For every mandatory **Drop-down**:
   - First attempt to select the exact value specified in Test Data.
   - If the provided test-data value is unavailable, select the **first valid enabled option**.
   - Never select placeholders such as `Select`, `Select One`, `-- Select One --`, empty values, disabled values, or `None`.
   - Record the actual selected value when a fallback option is used.

5. For mandatory **Edit Boxes, Text Areas, Numeric Fields, Date Fields, Searchable Drop-downs, Autocomplete Controls**, and other editable controls, use the provided test data.

6. For **Searchable Drop-downs and Autocomplete Controls**:
   - Click the control.
   - Enter the provided search text.
   - Wait for matching suggestions.
   - Select the expected matching option.
   - Verify dependent fields populated by the selection.
   - Do **not** modify dependent auto-populated fields.

7. After completing each step:
   - Verify all mandatory fields contain valid values.
   - Verify auto-populated fields were not modified.
   - Click **Save and Continue**.
   - Wait for navigation and page loading to complete.
   - Verify the expected next step is displayed and active.

8. Do **not** populate optional fields unless explicitly required to complete the workflow.

---

## Planner Workflow

### 1. Login to MagicBox

- Navigate to the MagicBox application URL.
- Wait for the Login page to load completely.
- Enter the valid **Username**: `rohit.laishram@celsiortech.com`
- Enter the valid **Password**: `Pyramid@1`
- Click the **Login** button.
- Wait until the MagicBox dashboard loads completely.
- Verify that the MagicBox dashboard is displayed successfully.

> **Expected Result:** The user should successfully log in and land on the MagicBox dashboard.

---

### 2. Navigate to Initiate Contract Pre-Placements

- Click **Onboarding +** from the top navigation bar.
- Wait for the Onboarding menu to open.
- Select **Initiate Contract Pre-Placements**.
- Wait for the Create Pre-Placement page to load completely.
- Verify that the Create Pre-Placement page is displayed.
- Verify that the page contains a candidate listing table.
- Verify that at least one candidate is available for onboarding.

> **Expected Result:** The Create Pre-Placement page should be displayed with available candidates.

---

### 3. Create Onboarding Record

- Locate the candidate listing table.
- Select any available candidate that has a valid **Create Onboarding Record** action.
- Do **not** modify candidate information displayed in the candidate table.
- In the selected candidate row, locate the **Action** column.
- Click **Create Onboarding Record**.
- Wait for the Consultant Demographic confirmation page to load.
- Verify that the confirmation page is displayed.
- Verify that the confirmation message is displayed for the selected candidate.
- Verify that the selected candidate information is populated.
- Do **not** modify auto-populated candidate information.
- Click **Save & Create**.
- Wait for the onboarding wizard to load completely.
- Verify that the Placement workflow stepper is displayed.
- Verify that **Step 1 – Initiate Preplacement** is displayed and active.

> **Expected Result:** A new onboarding record should be successfully created, and the user should land on Step 1 – Initiate Preplacement.

---

## Acceptance Criteria 1: Step 1 – Initiate Preplacement

**Given** the user has successfully created an onboarding record,
**And** Step 1 – Initiate Preplacement is displayed and active,
**When** the agent processes the mandatory fields,
**Then** auto-populated consultant information must only be verified and the remaining mandatory fields must be populated.

### Field Definitions

| Field Name              | Field Type              | Mandatory | Test Data              | Agent Action                                                              |
| ----------------------- | ----------------------- | :-------: | ---------------------- | ------------------------------------------------------------------------- |
| Consultant First Name   | Auto-populated Edit Box | Yes       | Existing candidate value | Verify populated. Do not modify.                                         |
| Consultant Last Name    | Auto-populated Edit Box | Yes       | Existing candidate value | Verify populated. Do not modify.                                         |
| SSN Last 4 Digits Only  | Edit Box                | Yes       | 4567                   | If auto-populated, verify and do not modify. If empty, enter test data.  |
| Division                | Drop-down               | Yes       | Staffing               | Select test data. If unavailable, select first valid enabled option.     |
| Contract Type           | Drop-down               | Yes       | C2C                    | Select test data. If unavailable, select first valid enabled option.     |
| Client Name             | Drop-down               | Yes       | CUS-avA                | Select test data. If unavailable, select first valid enabled option.     |

### Execution Flow

1. Verify **Consultant First Name** is populated. Do **not** modify.
2. Verify **Consultant Last Name** is populated. Do **not** modify.
3. Inspect **SSN Last 4 Digits Only**:
   - If already populated, verify and leave unchanged.
   - If empty, enter `4567`.
4. Select **Staffing** from **Division**. If unavailable, select the first valid enabled option.
5. Select **C2C** from **Contract Type**. If unavailable, select the first valid enabled option.
6. Select **CUS-avA** from **Client Name**. If unavailable, select the first valid enabled option.
7. Verify all mandatory Step 1 fields contain valid values.
8. Click **Save and Continue**. Wait for navigation.
9. Verify **Step 2 – Consultant Information** is displayed and active.

> **Expected Result:** All mandatory Step 1 fields should contain valid values, auto-populated Consultant First Name and Consultant Last Name should remain unchanged, and the user should successfully navigate to Step 2.

---

## Acceptance Criteria 2: Step 2 – Consultant Information

**Given** Step 2 – Consultant Information is displayed,
**When** the agent completes the mandatory consultant and job information,
**Then** the following test data and control-specific behavior must be used.

### Field Definitions

| Field Name              | Field Type                          | Mandatory | Test Data                                 | Agent Action                                    |
| ----------------------- | ----------------------------------- | :-------: | ----------------------------------------- | ----------------------------------------------- |
| Email                   | Edit Box                            | Yes       | facac0.8404153695706421@test.com          | Enter test data.                                |
| Confirm Email           | Edit Box                            | Yes       | Same as Email                             | Enter same Email value.                         |
| Contact Phone Number    | Edit Box                            | Yes       | 2292568005                                | Enter test data.                                |
| Consultant Address      | Searchable Drop-down / Autocomplete | Yes       | Search `APP`; select the first available option | Search and select         |
| City                    | Auto-populated Dependent Field      | Yes       | System-populated value                    | Verify populated. Do not modify.                |
| State                   | Auto-populated Dependent Field      | Yes       | System-populated value                    | Verify populated. Do not modify.                |
| Zip                     | Auto-populated Dependent Field      | Yes       | System-populated value                    | Verify populated. Do not modify.                |
| Work Authorization      | Drop-down                           | Yes       | E-3                                       | Select test data; otherwise first valid option. |
| SOW?                    | Drop-down                           | Yes       | No                                        | Select test data; otherwise first valid option. |
| Hours to Be Worked      | Drop-down                           | Yes       | 30 or more                                | Select test data; otherwise first valid option. |
| Candidate Source        | Drop-down                           | Yes       | CareerBuilder Job Applicant               | Select test data; otherwise first valid option. |
| Job Title               | Drop-down                           | Yes       | \_Developer: Software - IV                | Select test data; otherwise first valid option. |
| JobDiva Ref             | System-generated / Read-only        | Yes       | Existing system value                     | Verify populated. Do not modify.                |
| Job Description         | Text Area                           | Yes       | Software Automation Architect description | Enter test data.                                |

### Job Description Test Data

> We are looking for an experienced Software Automation Architect to design, develop, and implement scalable test automation solutions for web, API, and enterprise applications. The ideal candidate should have strong experience with Playwright, Selenium, Java, Python, API testing, CI/CD pipelines, and automation framework development.

> **Expected Result:** All mandatory Step 2 fields should contain valid values, Consultant Address should be selected using the searchable drop-down, dependent fields should remain unchanged, and Step 3 should be displayed after clicking Save and Continue.

---

## Acceptance Criteria 3: Step 3 – Skills and Documents

**Given** Step 3 – Skills is displayed,
**When** the agent completes the required skills and document upload process,
**Then** at least three skills must be added one-by-one and two documents must be uploaded.

### Skills Test Data

| Sequence | Skill           | Years of Experience | Agent Action                                              |
| :------: | --------------- | ------------------- | --------------------------------------------------------- |
| 1        | Playwright      | 5-10 Years          | Select Skill → Select Experience → Add → Verify row       |
| 2        | Selenium        | 10+ Years           | Select Skill → Select Experience → Add → Verify row       |
| 3        | Test Automation | 10+ Years           | Select Skill → Select Experience → Add → Verify row       |

> If a specified Skill or Experience value is unavailable, select the first valid enabled option while ensuring that **three valid skill rows** are added.

### Document Test Data

| Document Type                   | File Path                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Resume                          | `C:\Users\kamleshk\OneDrive - Pyramid Consulting, Inc\Documents\magicbox\Resume.txt`                                   |
| Interview Prep Call Screenshot  | `C:\Users\kamleshk\OneDrive - Pyramid Consulting, Inc\Documents\magicbox\InterviewPrepCall.txt`                        |

For each document:
`Select Document Type → Select File → Upload → Wait for completion → Verify document type and filename in the document grid`

> **Expected Result:** At least three skills should be displayed in the Skills grid, both required documents should be uploaded successfully, and Step 4 should be displayed after clicking Save and Continue.

---

## Acceptance Criteria 4: Step 4 – Project Details

**Given** Step 4 – Project Details is displayed,
**When** the agent completes the mandatory Project and Vendor fields,
**Then** dynamic dates and provided test data must be used.

### Field Definitions

| Field Name                  | Field Type                    | Mandatory | Test Data / Rule                | Agent Action                                                         |
| --------------------------- | ----------------------------- | :-------: | ------------------------------- | -------------------------------------------------------------------- |
| Start Date                  | Date Field                    | Yes       | Runtime current date            | Enter dynamically as `MM/DD/YYYY`.                                   |
| Anticipated End Date        | Date Field                    | Yes       | Start Date + 1 calendar year    | Calculate dynamically and enter.                                     |
| Pass-Thru/Payrolling        | Drop-down                     | Yes       | No                              | Test data; otherwise first valid option.                             |
| Job Category                | Drop-down                     | Yes       | Tech                            | Test data; otherwise first valid option.                             |
| Client Reporting Manager    | Lookup / Selection Control    | Yes       | Existing/available value        | If populated, verify only. Otherwise select available value.         |
| Client Hiring Manager       | Lookup / Selection Control    | Yes       | Existing/available value        | If populated, verify only. Otherwise select available value.         |
| Client Billing Manager      | Lookup / Selection Control    | Yes       | Existing/available value        | If populated, verify only. Otherwise select available value.         |
| Project Address Line 1      | Edit Box                      | Yes       | Appalachian Trail               | Enter test data.                                                     |
| City                        | Edit Box / Dependent Field    | Yes       | Boiling Springs                 | Verify if auto-populated; otherwise enter test data.                 |
| State                       | Drop-down / Dependent Field   | Yes       | PENNSYLVANIA                    | Verify if auto-populated; otherwise select test data or first valid option. |
| Zip                         | Edit Box / Dependent Field    | Yes       | 17007                           | Verify if auto-populated; otherwise enter test data.                 |
| Federal ID Number           | Edit Box                      | Yes       | 34-3456786                      | Enter test data.                                                     |
| Contact Person First Name   | Edit Box                      | Yes       | Tim                             | Enter test data.                                                     |
| Contact Person Last Name    | Edit Box                      | Yes       | David                           | Enter test data.                                                     |
| Company Name                | Edit Box                      | Yes       | Celsior                         | Enter test data.                                                     |
| Contact #                   | Edit Box                      | Yes       | 9891254643                      | Enter test data.                                                     |
| Email Id                    | Edit Box                      | Yes       | test@test.com                   | Enter test data.                                                     |
| Company Address Line 1      | Edit Box                      | Yes       | D-25                            | Enter test data.                                                     |
| Vendor City                 | Edit Box                      | Yes       | Noida                           | Enter test data.                                                     |
| Vendor State                | Drop-down                     | Yes       | ANDAMAN AND NICOBAR ISLANDS     | Test data; otherwise first valid option.                             |
| Vendor Zip                  | Edit Box                      | Yes       | 12100                           | Enter test data.                                                     |

> **Expected Result:** All mandatory Step 4 fields should contain valid values, dynamic dates should be correct, auto-populated values should remain unchanged, and Step 5 should be displayed after clicking Save and Continue.

---

## Acceptance Criteria 5: Step 5 – Placement Roles

**Given** Step 5 – Placement Roles is displayed,
**When** the agent processes the mandatory Placement Role fields,
**Then** only mandatory controls should be populated.

### Field Definitions

| Field Name                   | Field Type | Mandatory | Test Data / Rule | Agent Action                                    |
| ---------------------------- | ---------- | :-------: | ---------------- | ----------------------------------------------- |
| Branch (Primary)             | Drop-down  | Yes       | OFC- KU          | Test data; otherwise first valid option.        |
| Human Resource Associate     | Drop-down  | Yes       | Available value  | Verify if populated; otherwise select first valid option. |
| Consultant Care Associate    | Drop-down  | Yes       | Available value  | Verify if populated; otherwise select first valid option. |
| Operations Manager           | Drop-down  | Yes       | Available value  | Verify if populated; otherwise select first valid option. |

> Do **not** populate optional Recruiting, Delivery, Sales, Vertical, Secondary Branch, or Other Role Assignment fields.
>    Any dependent fields automatically populated by the application must only be verified.

> **Expected Result:** All mandatory Placement Role fields should contain valid values, auto-populated dependent fields should remain unchanged, and Step 6 should be displayed after clicking Save and Continue.

---

## Acceptance Criteria 6: Step 6 – Pay & Bill Details

**Given** Step 6 – Pay & Bill Details is displayed,
**When** the agent completes the mandatory Pay and Bill fields,
**Then** the provided test data and Bill Rate business rule must be followed.

### Field Definitions

| Field Name                  | Field Type                  | Mandatory | Test Data             | Agent Action                                    |
| --------------------------- | --------------------------- | :-------: | --------------------- | ----------------------------------------------- |
| Pay Rate                    | Numeric Edit Box            | Yes       | 15.00                 | Enter test data.                                |
| Pay Rate Unit               | Drop-down                   | Yes       | Hourly                | Test data; otherwise first valid option.        |
| Bill Rate                   | Numeric Edit Box            | Yes       | 30.00                 | Enter test data.                                |
| Bill Rate Unit              | Drop-down                   | Yes       | Hourly                | Test data; otherwise first valid option.        |
| Pay Currency                | Auto-populated / Read-only  | N/A       | System value          | Verify only.                                    |
| Bill Currency               | Auto-populated / Read-only  | N/A       | System value          | Verify only.                                    |
| Vendor Rate After Reduction | Calculated Field            | No        | System-calculated value | Verify only.                                  |
| Net GM                      | Calculated Display          | N/A       | System-calculated value | Verify only.                                  |

### Critical Business Rule

> **Bill Rate must always be greater than Pay Rate.**
>
> With the provided test data:
> - Pay Rate = `15.00`
> - Bill Rate = `30.00`
> - `30.00 > 15.00` = ✅ PASS
>
> If currencies differ, respect the application's currency conversion and Net GM calculation behavior.

> **Expected Result:** All mandatory Pay and Bill fields should contain valid values, Bill Rate should be greater than Pay Rate, calculated fields should remain unchanged, and Step 7 should be displayed after clicking Save and Continue.

---

## Acceptance Criteria 7: Step 7 – HR Checklist

**Given** Step 7 – HR Checklist is displayed,
**When** the agent verifies persisted information,
**Then** no optional fields should be modified.

### Field Definitions

| Field / Information             | Type               | Expected Data        | Agent Action            |
| ------------------------------- | ------------------ | -------------------- | ----------------------- |
| Is Rehire                       | Persisted Checkbox | Status from Step 2   | Verify only. Do not modify. |
| Resume Document                 | Document Grid Row  | Resume.txt           | Verify document exists. |
| Interview Prep Call Screenshot  | Document Grid Row  | InterviewPrepCall.txt | Verify document exists. |

> **Expected Result:** The Rehire status should persist from Step 2, both required documents should be displayed, and the workflow should successfully proceed to the Final Review step.