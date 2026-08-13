# End-to-End QA Workflow with Natural Language and MCP Servers

I want to demonstrate a complete end-to-end QA workflow using natural language, Playwright Agents and MCP servers.

## Framework Requirements

1. Playwright framework capabilities:
   - Create the execution plan.
   - Generate end-to-end test scripts.
   - Support auto-healing/self-healing for object identification failures.
   - Execute tests using Google Chrome browser only.
2. Browser policy:
   - Use Chrome-only execution strategy.
   - Do not run Firefox, Edge, Safari, or any other browser.

## Performance Optimization Requirements

1. Optimize framework for fast and stable execution:
   - Run tests efficiently with minimal overhead.
   - Use Playwright best practices for speed and reliability.
   - Avoid unnecessary waits and delays.
   - Prefer smart waits and locator-based synchronization.
   - Reuse browser context wherever applicable.
   - Generate lightweight reports with minimal impact on runtime.

## Test Data Strategy Configuration

The framework supports two test data strategies, controlled by the `TEST_DATA_STRATEGY` environment variable:

### Strategy: `inline` (DEFAULT)

When `TEST_DATA_STRATEGY=inline`:

- **All test data is embedded directly within the generated test script**
- No external test data files are created or referenced
- Generated tests are completely self-contained and portable
- Test data is defined as constants, objects, or inline values within the test file
- Tests can be copied to another framework and executed immediately without dependencies

**Use this strategy when:**
- You want maximum test portability
- You prefer self-contained test scripts
- You want to minimize external file dependencies
- Each test has unique, non-reusable test data

### Strategy: `external`

When `TEST_DATA_STRATEGY=external`:

- Test data is stored in a centralized Excel workbook (`test-data/test-data.xlsx`)
- Generated tests import and load data using `getMergedTestData()` from `tests/support/excel-data.ts`
- Test data is reusable across multiple tests
- Supports data-driven testing patterns

**Use this strategy when:**
- You need centralized test data management
- Multiple tests share the same test data
- You want to support data-driven testing
- You prefer separating test logic from test data

### Current Strategy

**The default strategy for this framework is: `inline`**

To override, set the environment variable before running the generation pipeline:
```bash
TEST_DATA_STRATEGY=external
```

## Test Data Organization Requirements

⚠️ **REQUIREMENTS DEPEND ON ACTIVE STRATEGY**

### When `TEST_DATA_STRATEGY=inline` (DEFAULT)

**ALL test data must be embedded directly in the generated test script.**

Rules:
- **Do NOT create or reference external test data files**
- **Do NOT use `getMergedTestData()` or Excel imports**
- **Do NOT generate or modify `test-data/test-data.xlsx`**
- Define all test data as constants, objects, arrays, or inline values within the test file
- Keep test data organized and clearly labeled
- Use meaningful variable names in `UPPER_SNAKE_CASE` for constants
- Group related data together (e.g., user credentials, form inputs, expected values)

**✅ Correct inline pattern:**
```typescript
import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────
// INLINE TEST DATA (embedded directly in this file)
// ─────────────────────────────────────────────────────────────────────────
const TEST_DATA = {
  baseUrl: 'https://app.example.com',
  credentials: {
    username: 'john.doe@example.com',
    password: 'SecurePass123!',
  },
  consultant: {
    firstName: 'John',
    lastName: 'Doe',
    ssnLast4: '1234',
  },
  client: {
    name: 'Acme Corporation',
    searchTerm: 'Acme Corp',
  },
  expectedMessages: {
    successLogin: 'Welcome back, John',
    placementCreated: 'Placement created successfully',
  },
  formInputs: {
    jobTitle: 'Senior Software Engineer',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    billRate: '150',
    payRate: '100',
  },
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
};

// Alternative: Define constants directly
const BASE_URL = 'https://app.example.com';
const USERNAME = 'john.doe@example.com';
const PASSWORD = 'SecurePass123!';
const CONSULTANT_FIRST_NAME = 'John';
const CONSULTANT_LAST_NAME = 'Doe';

test.describe('Complete Placement Workflow', () => {
  test('should create a new placement with valid data', async ({ page }) => {
    await test.step('Navigate to application', async () => {
      await page.goto(TEST_DATA.baseUrl);
    });

    await test.step('Login with valid credentials', async () => {
      await page.locator('#username').fill(TEST_DATA.credentials.username);
      await page.locator('#password').fill(TEST_DATA.credentials.password);
      await page.locator('button[type="submit"]').click();
    });

    await test.step('Verify successful login', async () => {
      await expect(page.getByText(TEST_DATA.expectedMessages.successLogin)).toBeVisible();
    });

    // ... more steps using TEST_DATA
  });
});
```

**❌ Forbidden in inline mode:**
```typescript
import { getMergedTestData } from '../../support/excel-data';  // ❌ NO Excel imports
const TEST_DATA = getMergedTestData({...});                     // ❌ NO external data loading
```

### When `TEST_DATA_STRATEGY=external`

Use a centralized Excel workbook as the single source of truth for test data.

- Workbook path: `test-data/test-data.xlsx`
- Common sheet: `CommonData` (shared values like base URL, username, password)
- Functional sheets: one sheet per functionality (example: `{application}_{functionality}`)
- Key column in functional sheets: `TEST_ID` (unique per test case)
- Loader module: `tests/support/excel-data.ts`

Every generated test must read merged data from Excel (CommonData + functional sheet row) and must not hardcode business data values.

### Test Data Scope Lock (Only for `external` strategy)

⚠️ **THIS SECTION APPLIES ONLY WHEN `TEST_DATA_STRATEGY=external`**

For each pipeline run, add or update Excel data only for the current user story path:

- Current run scope = `{application}` + `{functionality_path}` + planned `TEST_ID` values
- Allowed sheets to modify:
   - `CommonData` row for current `{application}` and active `ENV` only
   - Functional sheet for current scope only (example: `Amazon_Login`)
- Allowed functional rows to modify:
   - Only `TEST_ID` values defined by the current test plan for this user story

Strictly forbidden in the same run:

- Creating or updating sheets for non-mentioned applications (example: OrangeHRM, SwagLabs)
- Inserting rows for unrelated functionalities or unrelated `TEST_ID`s
- Bulk/bootstrap insertion of cross-application sample data

**Rules:**
- **NEVER hardcode** any business test data value directly inside test steps or assertions.
- Keep `UPPER_SNAKE_CASE` constants in test files only as aliases mapped from Excel values.
- Each test file must define `APP`, `SHEET_NAME`, `TEST_ID`, and load data using `getMergedTestData({ app, sheetName, testId, requiredFields })`.
- If a list is stored in one cell (comma-separated), convert it with `csvToList(...)`.
- Keep test logic strictly separate from test data.

**CommonData columns (minimum):**
```typescript
APP
ENV
BASE_URL
USERNAME
PASSWORD
TIMEOUT_MS
```

**Functional sheet columns (minimum):**
```typescript
TEST_ID
SCENARIO_NAME
START_URL
COMPLETION_URL
EXPECTED_SUCCESS_TEXT
EXPECTED_ERROR_TEXT
SEARCH_TERM
COLLECTION_ITEMS
```

**✅ Correct pattern (Excel-driven):**
```typescript
import { csvToList, getMergedTestData } from '../support/excel-data';

const APP = 'APPLICATION_NAME';
const SHEET_NAME = 'Application_Login';
const TEST_ID = 'APPLICATION_LOGIN_TC001';
const REQUIRED_FIELDS = ['BASE_URL', 'USERNAME', 'PASSWORD', 'EXPECTED_SUCCESS_TEXT'];
const TEST_DATA = getMergedTestData({ app: APP, sheetName: SHEET_NAME, testId: TEST_ID, requiredFields: REQUIRED_FIELDS });

const START_URL = TEST_DATA.BASE_URL;
const USERNAME = TEST_DATA.USERNAME;
const PASSWORD = TEST_DATA.PASSWORD;
const COLLECTION_ITEMS = csvToList(TEST_DATA.COLLECTION_ITEMS);

await page.goto(START_URL);
await page.locator('input[name="username"]').fill(USERNAME);
```

**❌ Forbidden pattern:**
```typescript
await page.goto('https://app.example.com');
await page.locator('input[name="username"]').fill('Admin');
```

## Placeholder (Set Before Running)

- `{application}`: top-level application name (example: `Amazon`, `SwagLabs`, `OrangeHRM`)
- `{functionality_path}`: functionality folder path under the application (example: `Login`, `Checkout/Payment`)
- `{user_story_name}`: markdown file name without extension (example: `test_valid_login`)

Derived path placeholder:

- `{user_story_path}` = `{application}/{functionality_path}/{user_story_name}`
- `{story_folder_path}` = `{application}/{functionality_path}`

## Folder Structure Enforcement (Mandatory)

Use only the mirrored user story structure for all generated artifacts.

- User story input (source of truth): `user-stories/{application}/{functionality_path}/{user_story_name}.md`
- Test plan output: `specs/{application}/{functionality_path}/{user_story_name}-test-plan.md`
- Test scripts output path: `tests/{application}/{functionality_path}/{user_story_name}.spec.ts`

Do not create any alternate structure.

- Forbidden examples:
   - `specs/{user_story_name}-test-plan.md`
   - `tests/{user_story_name}/...`
   - `tests/{application}/{functionality_path}/{user_story_name}/...` (story name as folder)
   - `tests/{application}/{functionality_path}/happy-path.spec.ts` (missing story-name prefix)

Current value for this run:

- `{application}` = `Alloy`
- `{functionality_path}` = `alloyJourney`
- `{user_story_name}` = `TC009_Webhook`
- `{user_story_path}` = `Alloy/alloyJourney/TC009_Webhook`
- `{story_folder_path}` = `Alloy/alloyJourney`

Derived artifact paths:

- User story file: `user-stories/{user_story_path}.md`
- Test plan: `specs/{user_story_path}-test-plan.md`
- Automation test script: `tests/{story_folder_path}/{user_story_name}.spec.ts`
- Healing log: `test-results/{user_story_name}-healing-log-{timestamp}.md`
- Final report (HTML): `test-results/{user_story_name}-test-report-{timestamp}.html`
- Screenshots folder (if failures): `test-results/screenshots/`

> **Timestamp format:** `YYYYMMDD_HHmmss` (e.g. `20260626_143022`). Generate `{timestamp}` once at the start of each workflow run and reuse it across all artifacts produced in that run. This ensures every run creates new files rather than overwriting previous results.

## Workflow Overview (Updated Responsibilities)

1. Plan Generation: `playwright-test-planner` creates comprehensive test plan from user story.
2. Test Data Preparation:
   - **When `TEST_DATA_STRATEGY=inline`**: Skip this step — test data will be embedded in generated scripts
   - **When `TEST_DATA_STRATEGY=external`**: Create/update `test-data/test-data.xlsx` (`CommonData` + functionality sheets) for all planned test cases
3. Test Script Generation: `playwright-test-generator` creates Playwright E2E tests from the plan (with inline or external data based on strategy).
4. Auto-Healing: `playwright-test-healer` identifies and fixes object/locator failures.
5. Fast Test Execution: execute tests with Chrome-only strategy and optimized runtime settings.
6. Reporting: generate simple HTML report with screenshots for failures, pass/fail status, and healing summary.

## STEP 2.5 - PREPARE TEST DATA

⚠️ **THIS STEP IS CONDITIONAL BASED ON `TEST_DATA_STRATEGY`**

### When `TEST_DATA_STRATEGY=inline` (DEFAULT)

**SKIP THIS STEP ENTIRELY.**

Test data will be embedded directly in the generated test scripts in STEP 3.
Do not create or modify any Excel files.

### When `TEST_DATA_STRATEGY=external`

**PREPARE EXCEL TEST DATA (MANDATORY BEFORE SCRIPT GENERATION)**

After creating the test plan and before generating scripts:

1. Ensure workbook exists: `test-data/test-data.xlsx`
2. Ensure common sheet exists: `CommonData`
3. Ensure functionality sheet exists for the story path (for example `{application}_{functionality}`)
4. For each planned test case, create/update one row in the functionality sheet keyed by `TEST_ID`
5. Merge keys to be consumed by tests: `APP`, `ENV`, `SHEET_NAME`, `TEST_ID`
6. Populate all required columns used by the script assertions and inputs
7. Do not proceed to script generation until the Excel row exists for every test case

Scope constraints for Step 2.5:

1. Update only the current `{application}` row in `CommonData`.
2. Update only the current functionality sheet for this story.
3. Add only test rows referenced by the current story test plan.
4. Do not add seed/sample/default data for any other application.
5. If unrelated data already exists from prior runs, leave it unchanged and do not add more.

## STEP 1 - READ USER STORY

First, read the user story from:

`user-stories/{user_story_path}.md`

Provide:

- Summary of the user story
- List of acceptance criteria
- Application URL and test credentials
- Key features to test

## STEP 2 - CREATE TEST PLAN (INTERACTIVE EXPLORATION REQUIRED)

⚠️ **CRITICAL REQUIREMENT**: The test planner agent MUST launch a browser and actively navigate through the entire workflow before creating any test plan. NO test plan should be created purely from assumptions or documentation review. The agent must interact with the live application to observe and capture each step precisely.

Use the `playwright-test-planner` agent with the following mandatory workflow:

### 2.1 Launch Browser and Explore Application

**MANDATORY FIRST STEP - DO NOT SKIP**

1. Read the application URL and test credentials from the user story
2. Use MCP planner tools to launch Google Chrome browser (headed mode recommended for observation)
3. Navigate to the application URL
4. Log in using the test credentials provided in the user story
5. Keep the browser open throughout the exploration phase

⚠️ **The browser must remain open during all observation and planning activities**

### 2.2 Navigate Through Complete Workflow

**REQUIRED EXPLORATION ACTIVITIES**

The agent must actively navigate and interact with the application:

1. **Visit every page** mentioned in the acceptance criteria
2. **Interact with every UI element**:
   - Click all buttons, links, and navigation elements
   - Fill in form fields to see validation behavior
   - Test dropdown menus to capture all available options
   - Check radio buttons and checkboxes to understand choices
   - Hover over elements to reveal tooltips or help text
3. **Observe and document**:
   - Exact field labels, placeholders, and help text
   - Button text and icon labels
   - Validation messages (both error and success)
   - Page titles and URLs at each step
   - Navigation paths and breadcrumbs
   - Dynamic behaviors (fields that appear/disappear based on selections)
   - Loading states and progress indicators
   - Confirmation dialogs and messages
4. **Capture the complete flow**:
   - Entry point to the workflow
   - Each intermediate step with all interactions
   - Final success/completion page
   - Any error scenarios encountered during exploration

⚠️ **DO NOT proceed to test plan creation until all pages and elements have been observed**

### 2.3 Document Live Observations

**REQUIRED BEFORE WRITING TEST PLAN**

Create detailed observation notes that include:

1. **Exact element identifiers**:
   - Field names as they appear in the UI (not guessed or assumed)
   - Button labels with exact text
   - Link text and navigation menu items
2. **Page structure**:
   - URL patterns for each page
   - Page titles and headings
   - Section organization
3. **Interaction behaviors**:
   - What happens when each button is clicked
   - Which fields are required vs optional
   - Validation rules observed during interaction
   - Conditional fields or sections
4. **Data requirements**:
   - Dropdown options available
   - Date/time format requirements
   - Text field length limits or format requirements
   - File upload requirements (if any)

⚠️ **All observations must be based on actual interaction with the live application, not assumptions**

### 2.4 Create Test Plan Based on Live Observations

**ONLY AFTER COMPLETING STEPS 2.1, 2.2, AND 2.3**

Now create a test plan with **ONE positive test case only**:
- Focus on the primary happy path scenario
- **Every test step must reference actual observed elements**
- Use exact field names and labels from your observations
- Include only actions and validations you actually witnessed

Save the test plan as:

`specs/{user_story_path}-test-plan.md`

Ensure each test scenario includes:

- Clear test case title
- Detailed step-by-step instructions **based on live observations**
- Expected results for each step **as actually observed**
- Test data requirements **matching observed field formats**
- **Exact element identifiers** (labels, names, roles) from the live application

Expected output:

- Complete test plan markdown file based on live browser exploration
- Organized test scenarios with clear structure
- **All steps reference actual observed UI elements, not assumptions**
- **Browser must be closed immediately once the test plan is saved — do not keep it open into subsequent steps**

## STEP 3 - GENERATE AUTOMATION SCRIPTS

Review:

- Test plan from `specs/{user_story_path}-test-plan.md`

Use the `playwright-test-generator` agent to create Playwright JavaScript automation scripts.

Requirements:

- Use stable element properties (IDs, data attributes, roles).
- Use smart waits and locator-based synchronization.
- Avoid unnecessary static waits.
- Reuse browser context where applicable.
- Optimize script structure for fast execution.
- **Apply the Test Data Organization Requirements based on the active `TEST_DATA_STRATEGY`**

Generate:

1. Scripts for each test scenario.
2. Save scripts as story-named files directly under functionality path:

`tests/{story_folder_path}/{user_story_name}.spec.ts`

3. Use test case names from the test plan.
4. Use reliable selectors and strategies.

### All scripts must follow these base requirements:

- Follow Playwright best practices
- Use proper assertions with `expect()`
- Use descriptive test names
- Include comments for complex logic
- Use appropriate wait strategies
- Include `beforeEach()` and `afterEach()` hooks as needed
- Execute on Google Chrome only
- **Close browser after each test execution**

### Test Data Implementation (Strategy-Dependent)

⚠️ **CRITICAL: Follow the pattern for the active `TEST_DATA_STRATEGY`**

#### When `TEST_DATA_STRATEGY=inline` (DEFAULT)

**ALL test data must be embedded directly in the generated test file.**

Requirements:
- **DO NOT import** `getMergedTestData` or any Excel-related modules
- **DO NOT reference** external test data files
- Define all test data as constants, objects, or inline values within the test file
- Use clear, descriptive variable names in `UPPER_SNAKE_CASE` for constants
- Group related data logically (credentials, form inputs, expected values, etc.)
- Include all necessary data: URLs, usernames, passwords, form values, search terms, expected messages, etc.
- The generated test must be completely self-contained and portable

**✅ Correct inline pattern:**
```typescript
import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────
// INLINE TEST DATA (All data embedded in this file)
// ─────────────────────────────────────────────────────────────────────────

// Application Configuration
const BASE_URL = 'https://app.example.com/login';
const APP_TIMEOUT = 30000;

// User Credentials
const USERNAME = 'john.doe@example.com';
const PASSWORD = 'SecurePass123!';

// Consultant Information
const CONSULTANT_FIRST_NAME = 'John';
const CONSULTANT_LAST_NAME = 'Doe';
const SSN_LAST4 = '1234';

// Client Information
const CLIENT_NAME = 'Acme Corporation';
const CLIENT_SEARCH_TERM = 'Acme Corp';
const END_CLIENT_NAME = 'Global Tech Solutions';
const END_CLIENT_SEARCH_TERM = 'Global Tech';

// Form Input Values
const JOB_TITLE = 'Senior Software Engineer';
const START_DATE = '2026-08-01';
const END_DATE = '2027-07-31';
const BILL_RATE = '150.00';
const PAY_RATE = '100.00';
const PHONE_NUMBER = '555-123-4567';
const EMAIL = 'consultant@example.com';

// Skills List
const SKILLS = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Playwright'];
const MIN_SKILLS_COUNT = 3;

// Expected Messages
const EXPECTED_SUCCESS_MESSAGE = 'Placement created successfully';
const EXPECTED_LOGIN_CONFIRMATION = 'Welcome back';
const EXPECTED_ERROR_MESSAGE = 'Please fill in all required fields';

// Alternative: Use an object for organized data
const TEST_DATA = {
  config: {
    baseUrl: 'https://app.example.com/login',
    timeout: 30000,
  },
  credentials: {
    username: 'john.doe@example.com',
    password: 'SecurePass123!',
  },
  consultant: {
    firstName: 'John',
    lastName: 'Doe',
    ssnLast4: '1234',
  },
  client: {
    name: 'Acme Corporation',
    searchTerm: 'Acme Corp',
  },
  formInputs: {
    jobTitle: 'Senior Software Engineer',
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    billRate: '150.00',
    payRate: '100.00',
  },
  expectedMessages: {
    success: 'Placement created successfully',
    loginConfirmation: 'Welcome back',
    error: 'Please fill in all required fields',
  },
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
};

test.describe('Complete Placement Workflow', () => {
  test('should create a new placement with valid data', async ({ page }) => {
    await test.step('Navigate to application', async () => {
      await page.goto(BASE_URL);
      // Or: await page.goto(TEST_DATA.config.baseUrl);
    });

    await test.step('Login with valid credentials', async () => {
      await page.locator('#username').fill(USERNAME);
      await page.locator('#password').fill(PASSWORD);
      await page.locator('button[type="submit"]').click();
    });

    // ... more steps using inline data
  });
});
```

**❌ FORBIDDEN in inline mode:**
```typescript
// ❌ DO NOT import Excel helpers
import { getMergedTestData, csvToList } from '../../support/excel-data';

// ❌ DO NOT load from Excel
const TEST_DATA = getMergedTestData({
  app: 'MagicBox',
  sheetName: 'MagicBox_StartNewPlacement',
  testId: 'MB_SNP_TC001',
  requiredFields: ['BASE_URL', 'USERNAME'],
});
```

#### When `TEST_DATA_STRATEGY=external`

**ALL test data must be loaded from Excel.**

Requirements:
- Import and use `getMergedTestData` from `tests/support/excel-data.ts`
- Define `APP`, `SHEET_NAME`, `TEST_ID`, `REQUIRED_FIELDS`
- Map Excel fields to `UPPER_SNAKE_CASE` constants
- **Do not hardcode** URLs, credentials, input values, expected values, search terms, or configuration in test steps/assertions
- Use `csvToList()` for comma-separated list values from Excel

**✅ Correct external pattern:**
```typescript
import { test, expect } from '@playwright/test';
import { getMergedTestData, csvToList } from '../../support/excel-data';

// ─────────────────────────────────────────────────────────────────────────
// EXTERNAL TEST DATA (loaded from Excel)
// ─────────────────────────────────────────────────────────────────────────
const TEST_DATA = getMergedTestData({
  app: 'MagicBox',
  sheetName: 'MagicBox_StartNewPlacement',
  testId: 'MB_SNP_TC001',
  requiredFields: [
    'BASE_URL',
    'USERNAME',
    'PASSWORD',
    'CONSULTANT_FIRST_NAME',
    'CONSULTANT_LAST_NAME',
    'CLIENT_NAME',
    'EXPECTED_SUCCESS_TEXT',
    'SKILLS_LIST',
  ],
});

// Map Excel columns to constants (UPPER_SNAKE_CASE)
const BASE_URL = TEST_DATA.BASE_URL;
const USERNAME = TEST_DATA.USERNAME;
const PASSWORD = TEST_DATA.PASSWORD;
const CONSULTANT_FIRST_NAME = TEST_DATA.CONSULTANT_FIRST_NAME;
const CONSULTANT_LAST_NAME = TEST_DATA.CONSULTANT_LAST_NAME;
const CLIENT_NAME = TEST_DATA.CLIENT_NAME;
const EXPECTED_SUCCESS_TEXT = TEST_DATA.EXPECTED_SUCCESS_TEXT;
const SKILLS = csvToList(TEST_DATA.SKILLS_LIST);

test.describe('Complete Placement Workflow', () => {
  test('should create a new placement with valid data', async ({ page }) => {
    await test.step('Navigate to application', async () => {
      await page.goto(BASE_URL);
    });

    await test.step('Login with valid credentials', async () => {
      await page.locator('#username').fill(USERNAME);
      await page.locator('#password').fill(PASSWORD);
      await page.locator('button[type="submit"]').click();
    });

    // ... more steps using Excel data
  });
});
```

**❌ FORBIDDEN in external mode:**
```typescript
// ❌ DO NOT hardcode test data
await page.goto('https://app.example.com');
await page.locator('#username').fill('john.doe@example.com');
```

### test.step() Requirement (Mandatory for All Generated Scripts)

⚠️ **Every action and assertion inside a test must be wrapped in `test.step()` with a meaningful natural language description. This is mandatory — no raw actions or expects should exist outside a `test.step()` block.**

**Rules:**
- Each `test.step()` title must describe what the user is doing in plain English (e.g. `'Navigate to Amazon home page'`, `'Enter valid credentials and submit'`)
- Never use technical/locator text as a step title (e.g. do NOT write `"Expect toBeVisible getByRole(...)"`)
- Group logically related actions (navigate + verify) into a single meaningful step
- Assertions that verify the outcome of an action should be placed in the same step or a dedicated verification step with a clear title
- If a step fails, the step title appears in the report — so the title must make the failure immediately understandable to a non-technical stakeholder

**✅ Correct pattern:**
```typescript
await test.step('Navigate to Amazon home page', async () => {
  await page.goto(BASE_URL);
});

await test.step('Click on Sign In link from the navigation bar', async () => {
  await page.getByRole('link', { name: 'Hello, sign in Account & Lists' }).click();
});

await test.step('Verify Sign In page is displayed', async () => {
  await expect(page.getByRole('heading', { name: 'Sign in or create account' })).toBeVisible();
});

await test.step('Enter valid email and click Continue', async () => {
  await page.getByRole('textbox', { name: 'Enter mobile number or email' }).fill(USERNAME);
  await page.getByRole('button', { name: 'Continue' }).click();
});

await test.step('Verify user is successfully logged in', async () => {
  await expect(page).not.toHaveURL(/ap\/signin/i);
  await expect(page.getByRole('link', { name: /Account & Lists/i })).toBeVisible();
});
```

**❌ Forbidden pattern (raw actions without test.step):**
```typescript
await page.goto(BASE_URL);
await page.getByRole('link', { name: 'Hello, sign in Account & Lists' }).click();
await expect(page.getByRole('heading', { name: 'Sign in or create account' })).toBeVisible();
```

After generation, execute the tests to verify they run successfully.
**Ensure browser is closed after verification execution.**

Expected output:

- Playwright test suite files under folder structure aligned to user story path (example: `tests/{application}/{functionality_path}/...`)
- Scripts using robust selectors
- Playwright best-practice implementation
- Initial test generation completed
- **Browser closed after verification execution**

Path enforcement:

- Every generated spec file must be inside `tests/{application}/{functionality_path}/` and start with `{user_story_name}`
- Do not generate tests in any other folder path.

## STEP 4 - EXECUTE AND HEAL TESTS (CHROME ONLY)

Use the `playwright-test-healer` agent.

1. Run story-scoped tests matching `tests/{story_folder_path}/{user_story_name}*.spec.ts`
2. Identify failing tests
3. Heal failures by fixing selectors, waits, and assertions as needed
4. Re-run tests until stable or classify remaining failures as product defects/blockers
5. Document healing results (initial results, healing actions, final results, and any blockers) to `test-results/{user_story_name}-healing-log-{timestamp}.md`

Expected output:

- Updated automation scripts
- Stable execution results or clearly documented blockers
- Healing summary in `test-results/{user_story_name}-healing-log-{timestamp}.md`
- **Browser closed after all test executions complete**

## STEP 5 - CREATE TEST REPORT

Create a modern, meaningful HTML report in the approved latest format.

Primary output location:

- `final-reports/{story_name}-{timestamp}.html`

Optional copy (if pipeline requires story-scoped artifact naming):

- `test-results/{user_story_name}-test-report-{timestamp}.html`

Compile report content from:

- Step 4 healing log: `test-results/{user_story_name}-healing-log-{timestamp}.md`
- Test plan: `specs/{user_story_path}-test-plan.md`
- Playwright execution results (status, duration, retries, stack traces)
- Failure screenshots (if any)
- Trace artifacts (if any)

Latest format requirements (must match sample style):

1. **Header + Metadata Strip**
   - Report title
   - Application name
   - Environment (e.g. QA)
   - Browser (e.g. Chromium)
   - Execution date/time in `DD-Mon-YYYY HH:MM:SS IST` format
   - Run duration

2. **Top KPI Cards**
   - Total Tests
   - Passed
   - Failed
   - Skipped/Blocked

3. **Execution Summary Table with Toolbar**
   - Search box (TC ID / Test Name / Functionality)
   - Status filters: All / PASS / FAIL / SKIP
   - Columns: Test Case ID, Test Name, Functionality, Total Steps, Passed Steps, Failed Steps, Result

4. **Functionality-wise Collapsible Sections**
   - Group test cases by functionality
   - Keep passed test cases collapsed by default
   - Auto-expand failed functionality and failed test case blocks by default

5. **Failed Test First-Failure Digest (per failed TC)**
   - Failed Step Number + Description
   - Error Type
   - Error Message
   - Evidence links (screenshot, trace if available)
   - Source test file and line number

6. **Step Details Table (inside testcase)**
   - Step #, Test Step, Actual Result, Status, Screenshot Link
   - Color-coded status cells (PASS/FAIL/SKIP)

Screenshot and artifact requirements:

- Capture screenshots for all failed steps
- Naming: `{user_story_name}-{test-case-id}-failure-{timestamp}.png`
- Save under: `test-results/screenshots/{timestamp}/`
- Report should support embedded screenshots (base64) for single-file portability
- Screenshots should be clickable to open full size
- If traces exist, include links in failed test details

Design and UX requirements:

- Professional, responsive layout (desktop/mobile)
- Color standards:
  - PASS: #28a745
  - FAIL: #dc3545
  - BLOCKED/SKIP: #ffc107
  - INFO: #0dcaf0
- Collapsible sections for testcase details and stack traces
- Search/filter interactivity in summary table
- Print-friendly CSS (`@media print`)
- Single self-contained HTML file (inline CSS + JS)

Expected output:

- Report generated in latest approved format
- Output saved in `final-reports/` (and optionally copied to `test-results/` if required by pipeline)
- Clear PASS/FAIL/BLOCKED visibility with actionable failure evidence
- Stakeholder-ready report with triage-friendly structure

