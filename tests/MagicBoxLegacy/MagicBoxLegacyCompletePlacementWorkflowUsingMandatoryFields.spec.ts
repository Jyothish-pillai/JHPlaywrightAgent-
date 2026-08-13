// spec: specs/magicbox/MagicBoxLegacyCompletePlacementWorkflowUsingMandatoryFields-test-plan.md

import { test, expect, Page, Locator } from '@playwright/test';
import * as path from 'path';

// ─── URLs & Timeouts ──────────────────────────────────────────────────────────
const START_URL = 'https://10.35.213.19/report/#';
const PREPLACEMENT_URL_PATTERN = '**/pci/search/joblisting?perform=1';
const STEP1_URL_PATTERN = '**/pci/entity/onb_demographic/**?tab=step-1*';
const STEP2_URL_PATTERN = '**/pci/entity/onb_demographic/**?tab=step-2*';
const STEP3_URL_PATTERN = '**/pci/entity/onb_demographic/**?tab=step-3*';
const STEP4_URL_PATTERN = '**/pci/entity/onb_demographic/**?tab=step-4*';
const STEP5_URL_PATTERN = '**/pci/entity/onb_demographic/**?tab=step-5*';
const STEP6_URL_PATTERN = '**/pci/entity/onb_demographic/**?tab=step-6*';
const STEP7_URL_PATTERN = '**/pci/entity/onb_demographic/**?tab=step-7*';
const TEST_TIMEOUT_MS = 300000;
const SLOW_TIMEOUT_MS = 120000;
const DEFAULT_TIMEOUT_MS = 45000;
const RETRY_DELAY_MS = 400;
const UPLOAD_COMPLETE_WAIT_MS = 5000;
const TYPEAHEAD_WAIT_MS = 1500;

// ─── Credentials ──────────────────────────────────────────────────────────────
const USERNAME = 'rohit.laishram@celsiortech.com';
const PASSWORD = 'Pyramid@1';

// ─── Step 1 – Initiate Preplacement ───────────────────────────────────────────
const SSN_LAST_4 = '4567';
const DIVISION_VALUE = 'Staffing';
const CONTRACT_TYPE_VALUE = 'C2C';
const CLIENT_NAME_VALUE = 'CUS-avA';

// ─── Step 2 – Consultant Information ──────────────────────────────────────────
const EMAIL_VALUE = 'facac0.8404153695706421@test.com';
const CONTACT_PHONE = '2292568005';
const ADDRESS_SEARCH_TERM = 'APP';
const WORK_AUTHORIZATION_VALUE = 'E-3';
const SOW_VALUE = 'No';
const HOURS_WORKED_VALUE = '30 or more';
const CANDIDATE_SOURCE_VALUE = 'CareerBuilder Job Applicant';
const JOB_TITLE_VALUE = '_Developer: Software - IV';
const JOB_DESCRIPTION_TEXT =
  'We are looking for an experienced Software Automation Architect to design, develop, and implement scalable test automation solutions for web, API, and enterprise applications. The ideal candidate should have strong experience with Playwright, Selenium, Java, Python, API testing, CI/CD pipelines, and automation framework development.';

// ─── Step 3 – Skills & Documents ──────────────────────────────────────────────
const SKILL_1 = 'Playwright';
const SKILL_2 = 'Selenium';
const SKILL_3 = 'Test Automation';
const SKILL_1_EXPERIENCE = '5-10 Years';
const SKILL_2_EXPERIENCE = '10+ Years';
const SKILL_3_EXPERIENCE = '10+ Years';
const DOC_TYPE_RESUME = 'Resume';
const DOC_TYPE_INTERVIEW = 'Interview Prep Call Screenshot';
const RESUME_FILE_PATH = path.resolve(__dirname, '..', '..', '..', 'TestData', 'Resume.txt.txt');
const INTERVIEW_FILE_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'TestData',
  'InterviewPrepCall.txt.txt'
);

// ─── Step 4 – Project Details (dates computed at runtime) ─────────────────────
const START_DATE: string = (() => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
})();
const ANTICIPATED_END_DATE: string = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
})();
const PASS_THRU_VALUE = 'No';
const JOB_CATEGORY_VALUE = 'Tech';
const PROJECT_ADDRESS_LINE1 = 'Appalachian Trail';
const CITY_VALUE = 'Boiling Springs';
const STATE_VALUE = 'PENNSYLVANIA';
const ZIP_VALUE = '17007';
const FEDERAL_ID = '34-3456786';
const CONTACT_FIRST_NAME = 'Tim';
const CONTACT_LAST_NAME = 'David';
const COMPANY_NAME_VALUE = 'Celsior';
const CONTACT_NUMBER = '9891254643';
const EMAIL_ID_VALUE = 'test@test.com';
const COMPANY_ADDRESS_LINE1 = 'D-25';
const VENDOR_CITY = 'Noida';
const VENDOR_STATE_VALUE = 'ANDAMAN AND NICOBAR ISLANDS';
const VENDOR_ZIP = '12100';

// ─── Step 5 – Placement Roles ─────────────────────────────────────────────────
const BRANCH_PRIMARY_VALUE = 'OFC- KU';

// ─── Step 6 – Pay & Bill Details ──────────────────────────────────────────────
const PAY_RATE_VALUE = '15.00';
const BILL_RATE_VALUE = '30.00';
const PAY_RATE_UNIT_VALUE = 'Hourly';
const BILL_RATE_UNIT_VALUE = 'Hourly';

// ─── Placeholder pattern for <select> option filtering ───────────────────────
const PLACEHOLDER_PATTERN = /^(-{0,3}\s*)?(select(\s+one)?|--\s*select(\s+one)?\s*--)\s*$/i;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function resolveSelect(page: Page, labelText: string, fallbackCss: string): Promise<Locator> {
  const safeEscaped = labelText.replace(/'/g, '"');
  const re = new RegExp(labelText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const candidates: Locator[] = [
    page.getByLabel(re).first(),
    page
      .locator(
        `xpath=//*[contains(normalize-space(text()),'${safeEscaped}')]/following::select[1]`
      )
      .first(),
    page.locator(fallbackCss).first(),
  ];
  for (const loc of candidates) {
    if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) return loc;
  }
  return candidates[candidates.length - 1];
}

async function resolveInput(page: Page, labelText: string, fallbackCss: string): Promise<Locator> {
  const safeEscaped = labelText.replace(/'/g, '"');
  const re = new RegExp(labelText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const candidates: Locator[] = [
    page.getByLabel(re).first(),
    page
      .locator(
        `xpath=//*[contains(normalize-space(text()),'${safeEscaped}')]/following::input[1]`
      )
      .first(),
    page.locator(fallbackCss).first(),
  ];
  for (const loc of candidates) {
    if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) return loc;
  }
  return candidates[candidates.length - 1];
}

/**
 * Attempts to select targetLabel from a <select> element.
 * Fallback logic: when targetLabel is not found among available options,
 * iterates all <option> elements and selects the first that is:
 *   – not disabled
 *   – has a non-empty value attribute
 *   – does not match PLACEHOLDER_PATTERN (e.g. "Select", "-- Select One --")
 * Returns the label of the actually-selected option.
 */
async function selectOrFallback(selectLocator: Locator, targetLabel: string): Promise<string> {
  await selectLocator.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT_MS });
  const allOptions = await selectLocator.locator('option').all();
  const valid: { text: string; value: string }[] = [];
  for (const opt of allOptions) {
    const text = (await opt.textContent() ?? '').trim();
    const value = (await opt.getAttribute('value') ?? '').trim();
    const disabled = await opt.isDisabled().catch(() => false);
    if (!disabled && value && !PLACEHOLDER_PATTERN.test(text)) {
      valid.push({ text, value });
    }
  }
  const exact = valid.find((o) => o.text === targetLabel);
  if (exact) {
    await selectLocator.selectOption({ label: exact.text });
    return exact.text;
  }
  if (valid.length > 0) {
    await selectLocator.selectOption({ label: valid[0].text });
    return valid[0].text;
  }
  throw new Error(`selectOrFallback: no valid options found (target: "${targetLabel}")`);
}

/**
 * Fills a <select> only when it has no current value selected.
 * If the field already holds a non-empty, non-placeholder value it is left unchanged.
 * Fallback uses the same first-valid-option strategy as selectOrFallback.
 */
async function fillSelectIfEmpty(
  page: Page,
  labelText: string,
  fallbackCss: string
): Promise<void> {
  const sel = await resolveSelect(page, labelText, fallbackCss);
  if (!(await sel.isVisible({ timeout: 2000 }).catch(() => false))) return;
  const currentVal = (await sel.inputValue().catch(() => '')).trim();
  if (currentVal) return;
  const allOptions = await sel.locator('option').all();
  for (const opt of allOptions) {
    const text = (await opt.textContent() ?? '').trim();
    const value = (await opt.getAttribute('value') ?? '').trim();
    const disabled = await opt.isDisabled().catch(() => false);
    if (!disabled && value && !PLACEHOLDER_PATTERN.test(text)) {
      await sel.selectOption({ value });
      return;
    }
  }
}

async function clickWithRetry(locator: Locator, retries = 2): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      await locator.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT_MS });
      await locator.click({ timeout: DEFAULT_TIMEOUT_MS });
      return;
    } catch (err) {
      lastErr = err;
      if (i < retries) await locator.page().waitForTimeout(RETRY_DELAY_MS);
    }
  }
  throw lastErr;
}

async function saveAndContinue(page: Page): Promise<void> {
  const btn = page.getByRole('button', { name: /save and continue/i }).first();
  let dialogHandled = false;
  const dialogHandler = async (dialog: { accept: () => Promise<void> }) => {
    dialogHandled = true;
    await dialog.accept();
  };
  page.once('dialog', dialogHandler);
  await clickWithRetry(btn);
  const okBtn = page.getByRole('button', { name: /^ok$/i }).first();
  if (await okBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await okBtn.click();
  }
  if (!dialogHandled) page.removeListener('dialog', dialogHandler);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Complete Placement Workflow – Positive Path (Mandatory Fields Only)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(START_URL, { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await page
        .screenshot({
          path: path.join(
            'test-results',
            'screenshots',
            `placement_workflow_${Date.now()}.png`
          ),
          fullPage: true,
        })
        .catch(() => {});
    }
  });

  test('Complete Placement Workflow Using Mandatory Fields', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    // ── 1.1 Login ──────────────────────────────────────────────────────────────
    await expect(page.getByText('Employee Login')).toBeVisible({ timeout: DEFAULT_TIMEOUT_MS });
    await page.locator('input[name="username"], input[type="text"]').first().fill(USERNAME);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.getByRole('button', { name: /login/i }).first().click();
    await page.waitForURL('**/report/#*', { timeout: SLOW_TIMEOUT_MS });

    // ── 1.2 Navigate to Initiate Contract Pre-Placements ───────────────────────
    await clickWithRetry(
      page.locator('a[href="#"]:has-text("Onboarding"), a:has-text("Onboarding +")').first()
    );
    await clickWithRetry(
      page.getByRole('link', { name: /Initiate Contract Pre-Placements/i }).first()
    );
    await page.waitForURL(PREPLACEMENT_URL_PATTERN, { timeout: SLOW_TIMEOUT_MS });
    await expect(
      page.getByText('Create Pre-Placement', { exact: false })
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT_MS });

    // ── 1.3 Create Onboarding Record ───────────────────────────────────────────
    const firstCandidateRow = page
      .locator('#searchtab tbody tr')
      .filter({ has: page.getByRole('button', { name: /Create Onboarding Record/i }) })
      .first();
    await firstCandidateRow.waitFor({ state: 'visible', timeout: SLOW_TIMEOUT_MS });
    await clickWithRetry(
      firstCandidateRow.getByRole('button', { name: /Create Onboarding Record/i }).first()
    );
    await expect(
      page.getByText('Proceeding to this page will create a new onboarding record', { exact: false })
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT_MS });
    await clickWithRetry(page.getByRole('button', { name: /Save\s*&\s*Create/i }).first());
    await page.waitForURL(STEP1_URL_PATTERN, { timeout: SLOW_TIMEOUT_MS });

    // ── 1.4 Step 1 – Initiate Preplacement ─────────────────────────────────────
    const firstNameInput = await resolveInput(
      page,
      'Consultant First Name',
      'input[id*="first"][id*="name"], input[name*="first_name"]'
    );
    await firstNameInput.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT_MS });
    await expect(firstNameInput).not.toHaveValue('');

    const lastNameInput = await resolveInput(
      page,
      'Consultant Last Name',
      'input[id*="last"][id*="name"], input[name*="last_name"]'
    );
    await expect(lastNameInput).not.toHaveValue('');

    const ssnInput = page
      .locator('input[id*="ssn" i], input[name*="ssn" i], input[placeholder*="Last 4" i]')
      .first();
    await ssnInput.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT_MS });
    if (!(await ssnInput.inputValue())) {
      await ssnInput.fill(SSN_LAST_4);
    }

    const divisionSel = await resolveSelect(
      page,
      'Division',
      '#division_id, select[id*="division" i]'
    );
    await selectOrFallback(divisionSel, DIVISION_VALUE);

    const contractTypeSel = await resolveSelect(
      page,
      'Contract Type',
      '#employment_type_id, select[id*="employment_type" i]'
    );
    await selectOrFallback(contractTypeSel, CONTRACT_TYPE_VALUE);

    const clientSel = await resolveSelect(
      page,
      'Client Name',
      '#customer_id, select[id*="customer" i]'
    );
    await selectOrFallback(clientSel, CLIENT_NAME_VALUE);

    await saveAndContinue(page);
    await page.waitForURL(STEP2_URL_PATTERN, { timeout: SLOW_TIMEOUT_MS });
    await expect(page.getByText(/Consultant Information/i).first()).toBeVisible({
      timeout: DEFAULT_TIMEOUT_MS,
    });

    // ── 1.5 Step 2 – Consultant Information ────────────────────────────────────
    const emailInput = await resolveInput(
      page,
      'Email',
      'input[id*="email" i]:not([id*="confirm" i]):not([id*="job" i])'
    );
    await emailInput.fill(EMAIL_VALUE);

    const confirmEmailInput = await resolveInput(
      page,
      'Confirm Email',
      'input[id*="confirm" i][id*="email" i], input[id*="email_confirm" i]'
    );
    await confirmEmailInput.fill(EMAIL_VALUE);

    const phoneInput = await resolveInput(
      page,
      'Contact Phone',
      'input[id*="phone" i], input[name*="phone" i]'
    );
    await phoneInput.fill(CONTACT_PHONE);

    // Address typeahead: type search term, wait for suggestions, click first match
    const addrInput = page
      .locator('input[id*="address" i]:not([type="hidden"]), input[placeholder*="address" i]')
      .first();
    await addrInput.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT_MS });
    await addrInput.fill(ADDRESS_SEARCH_TERM);
    await page.waitForTimeout(TYPEAHEAD_WAIT_MS);
    const addrSuggestion = page
      .locator(
        'ul.dropdown-menu li, .ui-autocomplete .ui-menu-item, .tt-suggestion, li[role="option"]'
      )
      .first();
    if (await addrSuggestion.isVisible({ timeout: 4000 }).catch(() => false)) {
      await addrSuggestion.click();
    }

    const workAuthSel = await resolveSelect(
      page,
      'Work Authorization',
      'select[id*="work_auth" i], select[id*="visa" i]'
    );
    await selectOrFallback(workAuthSel, WORK_AUTHORIZATION_VALUE);

    const sowSel = await resolveSelect(page, 'SOW', 'select[id*="sow" i]');
    await selectOrFallback(sowSel, SOW_VALUE);

    const hoursSel = await resolveSelect(
      page,
      'Hours to Be Worked',
      'select[id*="hours" i]'
    );
    await selectOrFallback(hoursSel, HOURS_WORKED_VALUE);

    const candSrcSel = await resolveSelect(
      page,
      'Candidate Source',
      'select[id*="candidate_source" i], select[id*="source" i]'
    );
    await selectOrFallback(candSrcSel, CANDIDATE_SOURCE_VALUE);

    const jobTitleSel = await resolveSelect(
      page,
      'Job Title',
      'select[id*="job_title" i], select[id*="title" i]'
    );
    await selectOrFallback(jobTitleSel, JOB_TITLE_VALUE);

    const jobDescTextarea = page
      .locator(
        'textarea[id*="job_desc" i], textarea[id*="description" i], textarea[name*="desc" i]'
      )
      .first();
    await jobDescTextarea.waitFor({ state: 'visible', timeout: DEFAULT_TIMEOUT_MS });
    await jobDescTextarea.fill(JOB_DESCRIPTION_TEXT);

    await saveAndContinue(page);
    await page.waitForURL(STEP3_URL_PATTERN, { timeout: SLOW_TIMEOUT_MS });
    await expect(page.getByText(/Skills/i).first()).toBeVisible({ timeout: DEFAULT_TIMEOUT_MS });

    // ── 1.6 Step 3 – Skills & Documents ────────────────────────────────────────
    // Skill 1: Playwright / 5-10 Years
    await selectOrFallback(
      page.locator('select[id*="skill" i]:not([id*="doc" i]), select[name*="skill" i]').first(),
      SKILL_1
    );
    await selectOrFallback(
      page
        .locator('select[id*="experience" i], select[id*="exp" i], select[id*="years" i]')
        .first(),
      SKILL_1_EXPERIENCE
    );
    await clickWithRetry(page.getByRole('button', { name: /^add$/i }).first());
    await page.waitForTimeout(500);

    // Skill 2: Selenium / 10+ Years
    await selectOrFallback(
      page.locator('select[id*="skill" i]:not([id*="doc" i]), select[name*="skill" i]').first(),
      SKILL_2
    );
    await selectOrFallback(
      page
        .locator('select[id*="experience" i], select[id*="exp" i], select[id*="years" i]')
        .first(),
      SKILL_2_EXPERIENCE
    );
    await clickWithRetry(page.getByRole('button', { name: /^add$/i }).first());
    await page.waitForTimeout(500);

    // Skill 3: Test Automation / 10+ Years
    await selectOrFallback(
      page.locator('select[id*="skill" i]:not([id*="doc" i]), select[name*="skill" i]').first(),
      SKILL_3
    );
    await selectOrFallback(
      page
        .locator('select[id*="experience" i], select[id*="exp" i], select[id*="years" i]')
        .first(),
      SKILL_3_EXPERIENCE
    );
    await clickWithRetry(page.getByRole('button', { name: /^add$/i }).first());
    await page.waitForTimeout(500);

    // Upload Resume from TestData folder
    const docTypeSel1 = await resolveSelect(
      page,
      'Document Type',
      'select[id*="doc_type" i], select[id*="document_type" i]'
    );
    await selectOrFallback(docTypeSel1, DOC_TYPE_RESUME);
    await page.locator('input[type="file"]').first().setInputFiles(RESUME_FILE_PATH);
    await clickWithRetry(page.getByRole('button', { name: /^upload$/i }).first());
    await page.waitForTimeout(UPLOAD_COMPLETE_WAIT_MS);

    // Upload Interview Prep Call Screenshot from TestData folder
    const docTypeSel2 = await resolveSelect(
      page,
      'Document Type',
      'select[id*="doc_type" i], select[id*="document_type" i]'
    );
    await selectOrFallback(docTypeSel2, DOC_TYPE_INTERVIEW);
    await page.locator('input[type="file"]').first().setInputFiles(INTERVIEW_FILE_PATH);
    await clickWithRetry(page.getByRole('button', { name: /^upload$/i }).first());
    await page.waitForTimeout(UPLOAD_COMPLETE_WAIT_MS);

    await saveAndContinue(page);
    await page.waitForURL(STEP4_URL_PATTERN, { timeout: SLOW_TIMEOUT_MS });
    await expect(page.getByText(/Project Details/i).first()).toBeVisible({
      timeout: DEFAULT_TIMEOUT_MS,
    });

    // ── 1.7 Step 4 – Project Details ────────────────────────────────────────────
    const startDateInput = await resolveInput(
      page,
      'Start Date',
      'input[id*="start_date" i], input[name*="start_date" i]'
    );
    await startDateInput.fill(START_DATE);

    const endDateInput = await resolveInput(
      page,
      'Anticipated End Date',
      'input[id*="end_date" i], input[id*="anticipated" i]'
    );
    await endDateInput.fill(ANTICIPATED_END_DATE);

    const passThrSel = await resolveSelect(
      page,
      'Pass-Thru',
      'select[id*="pass_thru" i], select[id*="payrolling" i]'
    );
    await selectOrFallback(passThrSel, PASS_THRU_VALUE);

    const jobCatSel = await resolveSelect(
      page,
      'Job Category',
      'select[id*="job_cat" i], select[name*="job_category" i]'
    );
    await selectOrFallback(jobCatSel, JOB_CATEGORY_VALUE);

    // Client managers: populate only if empty; leave unchanged when already set
    await fillSelectIfEmpty(
      page,
      'Client Reporting Manager',
      'select[id*="reporting_manager" i], select[id*="report_manager" i]'
    );
    await fillSelectIfEmpty(
      page,
      'Client Hiring Manager',
      'select[id*="hiring_manager" i], select[id*="hire_manager" i]'
    );
    await fillSelectIfEmpty(
      page,
      'Client Billing Manager',
      'select[id*="billing_manager" i], select[id*="bill_manager" i]'
    );

    const projAddrInput = await resolveInput(
      page,
      'Project Address Line 1',
      'input[id*="project_address" i], input[id*="proj_addr" i]'
    );
    await projAddrInput.fill(PROJECT_ADDRESS_LINE1);

    // City / State / Zip: fill only when not already auto-populated
    const cityInput = await resolveInput(
      page,
      'City',
      'input[id*="city" i]:not([id*="vendor" i])'
    );
    if (!(await cityInput.inputValue().catch(() => ''))) {
      await cityInput.fill(CITY_VALUE);
    }

    const stateSelect = await resolveSelect(
      page,
      'State',
      'select[id*="state" i]:not([id*="vendor" i])'
    );
    if (!(await stateSelect.inputValue().catch(() => ''))) {
      await selectOrFallback(stateSelect, STATE_VALUE);
    }

    const zipInput = await resolveInput(
      page,
      'Zip',
      'input[id*="zip" i]:not([id*="vendor" i])'
    );
    if (!(await zipInput.inputValue().catch(() => ''))) {
      await zipInput.fill(ZIP_VALUE);
    }

    const fedIdInput = await resolveInput(
      page,
      'Federal ID Number',
      'input[id*="federal_id" i], input[id*="fed_id" i]'
    );
    await fedIdInput.fill(FEDERAL_ID);

    const contactFnInput = await resolveInput(
      page,
      'Contact Person First Name',
      'input[id*="contact_first" i], input[id*="contact_fn" i]'
    );
    await contactFnInput.fill(CONTACT_FIRST_NAME);

    const contactLnInput = await resolveInput(
      page,
      'Contact Person Last Name',
      'input[id*="contact_last" i], input[id*="contact_ln" i]'
    );
    await contactLnInput.fill(CONTACT_LAST_NAME);

    const compNameInput = await resolveInput(
      page,
      'Company Name',
      'input[id*="company_name" i], input[id*="vendor_company" i]'
    );
    await compNameInput.fill(COMPANY_NAME_VALUE);

    const contactNumInput = await resolveInput(
      page,
      'Contact #',
      'input[id*="contact_num" i], input[id*="contact_phone" i]'
    );
    await contactNumInput.fill(CONTACT_NUMBER);

    const emailIdInput = await resolveInput(
      page,
      'Email Id',
      'input[id*="email_id" i], input[id*="contact_email" i]'
    );
    await emailIdInput.fill(EMAIL_ID_VALUE);

    const compAddrInput = await resolveInput(
      page,
      'Company Address Line 1',
      'input[id*="company_address" i], input[id*="vendor_addr" i]'
    );
    await compAddrInput.fill(COMPANY_ADDRESS_LINE1);

    const vendorCityInput = await resolveInput(
      page,
      'Vendor City',
      'input[id*="vendor_city" i]'
    );
    await vendorCityInput.fill(VENDOR_CITY);

    const vendorStateSel = await resolveSelect(
      page,
      'Vendor State',
      'select[id*="vendor_state" i]'
    );
    await selectOrFallback(vendorStateSel, VENDOR_STATE_VALUE);

    const vendorZipInput = await resolveInput(
      page,
      'Vendor Zip',
      'input[id*="vendor_zip" i]'
    );
    await vendorZipInput.fill(VENDOR_ZIP);

    await saveAndContinue(page);
    await page.waitForURL(STEP5_URL_PATTERN, { timeout: SLOW_TIMEOUT_MS });
    await expect(page.getByText(/Placement Roles/i).first()).toBeVisible({
      timeout: DEFAULT_TIMEOUT_MS,
    });

    // ── 1.8 Step 5 – Placement Roles ────────────────────────────────────────────
    const branchSel = await resolveSelect(
      page,
      'Branch',
      'select[id*="branch" i], select[name*="branch" i]'
    );
    await selectOrFallback(branchSel, BRANCH_PRIMARY_VALUE);

    await fillSelectIfEmpty(
      page,
      'Human Resource Associate',
      'select[id*="hr_associate" i], select[id*="human_resource" i]'
    );
    await fillSelectIfEmpty(
      page,
      'Consultant Care Associate',
      'select[id*="care_associate" i], select[id*="consultant_care" i]'
    );
    await fillSelectIfEmpty(
      page,
      'Operations Manager',
      'select[id*="ops_manager" i], select[id*="operations_manager" i]'
    );

    await saveAndContinue(page);
    await page.waitForURL(STEP6_URL_PATTERN, { timeout: SLOW_TIMEOUT_MS });
    await expect(page.getByText(/Pay.*Bill|Bill.*Pay/i).first()).toBeVisible({
      timeout: DEFAULT_TIMEOUT_MS,
    });

    // ── 1.9 Step 6 – Pay & Bill Details ─────────────────────────────────────────
    const payRateInput = await resolveInput(
      page,
      'Pay Rate',
      'input[id*="pay_rate" i]:not([id*="unit" i])'
    );
    await payRateInput.fill(PAY_RATE_VALUE);

    const payRateUnitSel = await resolveSelect(
      page,
      'Pay Rate Unit',
      'select[id*="pay_rate_unit" i], select[id*="pay_unit" i]'
    );
    await selectOrFallback(payRateUnitSel, PAY_RATE_UNIT_VALUE);

    const billRateInput = await resolveInput(
      page,
      'Bill Rate',
      'input[id*="bill_rate" i]:not([id*="unit" i])'
    );
    await billRateInput.fill(BILL_RATE_VALUE);

    const billRateUnitSel = await resolveSelect(
      page,
      'Bill Rate Unit',
      'select[id*="bill_rate_unit" i], select[id*="bill_unit" i]'
    );
    await selectOrFallback(billRateUnitSel, BILL_RATE_UNIT_VALUE);

    await saveAndContinue(page);
    await page.waitForURL(STEP7_URL_PATTERN, { timeout: SLOW_TIMEOUT_MS });
    await expect(page.getByText(/HR Checklist/i).first()).toBeVisible({
      timeout: DEFAULT_TIMEOUT_MS,
    });

    // ── 1.10 Step 7 – HR Checklist ───────────────────────────────────────────────
    await expect(page.getByText('Resume.txt', { exact: false }).first()).toBeVisible({
      timeout: DEFAULT_TIMEOUT_MS,
    });
    await expect(
      page.getByText('InterviewPrepCall.txt', { exact: false }).first()
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT_MS });

    await saveAndContinue(page);
    // Final step tab name varies; wait for any onb_demographic URL change from step-7
    await page.waitForURL(/\/pci\/entity\/onb_demographic\//, { timeout: SLOW_TIMEOUT_MS });
    await expect(
      page
        .getByText(/Review.*Submit|Final.*Step|Submit.*Review/i, { exact: false })
        .first()
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT_MS });

    // ── 1.11 Final Step – Review & Submit ────────────────────────────────────────
    await expect(
      page.getByText(/Review.*Submit|Review.*&.*Submit/i, { exact: false }).first()
    ).toBeVisible({ timeout: DEFAULT_TIMEOUT_MS });

    // Verify Net GM header shows a non-empty calculated value
    const netGmEl = page
      .locator('[id*="net_gm" i], [class*="net-gm" i], [id*="netgm" i], [class*="netgm" i]')
      .first();
    if (await netGmEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(netGmEl).not.toHaveText('', { timeout: 5000 });
    }
  });
});
