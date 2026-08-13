// spec: specs/MagicBox/StartNewPlacement/test_start_a_pre_placement-test-plan.md
// seed: tests/seed.spec.ts
// Note: This is the inline variant — all test data is hardcoded; no Excel dependency.

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Hardcoded test data (inline — no Excel)
// ---------------------------------------------------------------------------
const START_URL                   = 'https://10.35.213.32:8080/ui/onboarding/start';
const CONSULTANT_FIRST_NAME       = 'John';
const CONSULTANT_LAST_NAME        = 'Smith';
const SSN_LAST4                   = '1234';
const CLIENT_NAME                 = 'Pyramid';
const CLIENT_NAME_SEARCH_TERM     = 'Py';
const END_CLIENT_NAME             = 'Pyramid';
const END_CLIENT_NAME_SEARCH_TERM = 'Py';
const MANAGER_SEARCH_TERM         = 'Aakash Kumar';
const MANAGER_NAME_FILTER         = 'Aakash';
const REPORTING_MANAGER_EMAIL     = 'Aditya';
const HIRING_MANAGER_EMAIL        = 'Aditya';
const BILLING_MANAGER_EMAIL       = 'Aditya';
const GENERIC_TEXT_VALUE          = 'QA Automation';
const GENERIC_NUMBER_VALUE        = '10';
const DATE_VALUE                  = '2027-01-01';
const PHONE_VALUE                 = '9175550184';
const EMAIL_VALUE                 = 'john.smith.accenture.qa@example.com';
const JOB_DESCRIPTION             = 'Automation job description for mandatory onboarding flow.';
const SKILLS_LIST                 = ['Automation', 'API', 'Agile', 'CSS', 'Angular', 'AWS'];
const MIN_SKILLS_COUNT            = 3;
const STEP5_TYPEAHEAD_SEARCH_TERM = 'a';
const C2C_PHONE                   = '9820014253';
const C2C_FEIN                    = '12-3456789';
const C2C_ZIP                     = '400001';
const EXPECTED_SUCCESS_TEXT       = 'Step 7 of 8';
const SCREENSHOTS_DIR             = path.join('test-results', 'screenshots');

// ---------------------------------------------------------------------------
// Step 5 – Placement Role required field patterns
// ---------------------------------------------------------------------------
const STEP5_REQUIRED_FIELD_PATTERNS: RegExp[] = [
  /Branch\s*\(Primary\)\s*\*/i,
  /Credit\s*%\s*\(Primary\)\s*\*/i,
  /Vertical\s*\(Primary\)\s*\*/i,
  /Human Resource Associate \(HRA\)\s*\*/i,
  /Consultant Care Associate \(CCA\)\s*\*/i,
  /Operations Manager\s*\*/i,
  /Recruiter\s*[\u2013\u2014-]\s*Role \(Primary\)\s*\*/i,
  /Recruiter\s*[\u2013\u2014-]\s*Role \(Secondary\)\s*\*/i,
  /STEP Recruiter\s*[\u2013\u2014-]\s*Role \(Primary\)\s*\*/i,
  /STEP Recruiter\s*[\u2013\u2014-]\s*Role \(Secondary\)\s*\*/i,
  /Delivery Manager\s*[\u2013\u2014-]\s*Role \(Primary\)\s*\*/i,
  /Delivery Manager\s*[\u2013\u2014-]\s*Role \(Secondary\)\s*\*/i,
  /Branch Delivery Manager\s*[\u2013\u2014-]\s*Role \(Primary\)\s*\*/i,
  /Branch Delivery Manager\s*[\u2013\u2014-]\s*Role \(Secondary\)\s*\*/i,
  /Resource Manager\s*[\u2013\u2014-]\s*Role \(Primary\)\s*\*/i,
  /Resource Manager\s*[\u2013\u2014-]\s*Employee \(Primary\)\s*\*/i,
  /Resource Manager\s*[\u2013\u2014-]\s*Role \(Secondary\)\s*\*/i,
  /Resource Manager\s*[\u2013\u2014-]\s*Employee \(Secondary\)\s*\*/i,
  /Account Delivery Manager\s*[\u2013\u2014-]\s*Role \(Primary\)\s*\*/i,
  /Account Delivery Manager\s*[\u2013\u2014-]\s*Role \(Secondary\)\s*\*/i,
  /Director Delivery\s*[\u2013\u2014-]\s*Role \(Primary\)\s*\*/i,
  /Director Delivery\s*[\u2013\u2014-]\s*Role \(Secondary\)\s*\*/i,
  /Regional Sales Director\s*\*/i,
  /Primary Branch\s*\*/i,
  /Primary Vertical\s*\*/i,
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Maps a field hint (id / name / placeholder) and HTML input type to a realistic value.
 * Falls back to defaultValue when no specific rule matches.
 */
function getRealisticInputValue(
  fieldHint: string,
  inputType: string | null,
  defaultValue: string,
): string {
  const hint = fieldHint.toLowerCase();
  if (inputType === 'number')                                                                        return GENERIC_NUMBER_VALUE;
  if (inputType === 'email'  || hint.includes('email'))                                             return EMAIL_VALUE;
  if (inputType === 'tel'    || hint.includes('phone') || hint.includes('tel') || hint.includes('fax')) return PHONE_VALUE;
  if (hint.includes('zip')   || hint.includes('postal'))                                            return C2C_ZIP;
  if (hint.includes('fein')  || hint.includes('ein')   || hint.includes('tax'))                    return C2C_FEIN;
  return defaultValue;
}

/**
 * Fills all visible, enabled, empty text / email / tel / number inputs on the current step.
 * Skips hidden, disabled, date, file, checkbox, radio, skills, and search/typeahead inputs.
 * Uses getRealisticInputValue to choose the best value per field hint.
 */
async function fillRequiredTextInputs(page: Page, value = GENERIC_TEXT_VALUE): Promise<void> {
  const inputs = page.locator(
    'input:not([disabled]):not([type="hidden"])' +
    ':not([type="checkbox"]):not([type="radio"]):not([type="date"]):not([type="file"])' +
    ':not([id*="skills" i]):not([name*="skills" i])' +
    ':not([placeholder*="search" i])',
  );
  const count = await inputs.count();
  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    if (!(await input.isVisible()))  continue;
    if (await input.isDisabled())    continue;
    const current = await input.inputValue();
    if (current)                     continue;
    const inputType   = await input.getAttribute('type');
    const id          = (await input.getAttribute('id')          || '').toLowerCase();
    const name        = (await input.getAttribute('name')        || '').toLowerCase();
    const placeholder = (await input.getAttribute('placeholder') || '').toLowerCase();
    const hint        = id || name || placeholder;
    await input.fill(getRealisticInputValue(hint, inputType, value));
  }
}

/**
 * Selects index 1 on all visible, enabled native <select> elements that have no selection.
 */
async function fillRequiredDropdowns(page: Page): Promise<void> {
  const selects = page.locator('select:not([disabled])');
  const count   = await selects.count();
  for (let i = 0; i < count; i++) {
    const select = selects.nth(i);
    if (!(await select.isVisible())) continue;
    if (await select.isDisabled())   continue;
    const optionCount = await select.locator('option').count();
    if (optionCount < 2) continue;
    const current = await select.inputValue().catch(() => '');
    const isDefault =
      !current ||
      current === '' ||
      current === '0' ||
      current.toLowerCase().startsWith('select');
    if (isDefault) {
      await select.selectOption({ index: 1 }).catch(() => {});
    }
  }
}

/**
 * Fills all visible, enabled, empty date inputs with DATE_VALUE.
 */
async function fillRequiredDateInputs(page: Page, dateValue = DATE_VALUE): Promise<void> {
  const dates = page.locator('input[type="date"]:not([disabled])');
  const count = await dates.count();
  for (let i = 0; i < count; i++) {
    const input = dates.nth(i);
    if (!(await input.isVisible())) continue;
    if (await input.isDisabled())   continue;
    const current = await input.inputValue();
    if (!current) await input.fill(dateValue);
  }
}

/**
 * Fills the Job Description textarea / input if present and empty.
 */
async function fillJobDescription(page: Page): Promise<void> {
  const candidates = [
    page.locator('#jobDescription'),
    page.getByLabel(/job description/i),
    page.getByPlaceholder(/job description/i),
    page.locator('textarea[name*="jobDescription" i], textarea[id*="jobDescription" i]'),
    page.locator('input[name*="jobDescription" i], input[id*="jobDescription" i]'),
  ];
  for (const locator of candidates) {
    const count = await locator.count();
    for (let i = 0; i < count; i++) {
      const field = locator.nth(i);
      if (!(await field.isVisible())) continue;
      if (await field.isDisabled())   continue;
      const tagName = await field.evaluate(el => el.tagName.toLowerCase());
      if (tagName !== 'textarea' && tagName !== 'input') continue;
      const current = await field.inputValue();
      if (!current.trim()) await field.fill(JOB_DESCRIPTION);
      return;
    }
  }
}

/**
 * Generic step filler: text inputs → job description → dropdowns → dates → second dropdown pass.
 * The second dropdown pass captures selects that became enabled after prior fills.
 */
async function runGenericStepFiller(page: Page): Promise<void> {
  await fillRequiredTextInputs(page, GENERIC_TEXT_VALUE);
  await fillJobDescription(page);
  await fillRequiredDropdowns(page);
  await fillRequiredDateInputs(page, DATE_VALUE);
  await fillRequiredDropdowns(page);
}

/**
 * Adds skills from SKILLS_LIST to the React skill chip field.
 * Uses React's internal onChange handler to ensure state updates, then clicks
 * "Add skill". Throws if fewer than MIN_SKILLS_COUNT skills are added.
 */
async function addSkills(page: Page): Promise<void> {
  const skillInput = page.getByPlaceholder('Skill');
  if ((await skillInput.count()) === 0) return;
  if (!(await skillInput.first().isVisible())) return;

  const addSkillBtn = page.getByRole('button', { name: 'Add skill' });
  let addedCount = 0;

  for (const skill of SKILLS_LIST) {
    if (addedCount >= MIN_SKILLS_COUNT) break;

    // Set Experience dropdown (resets after each Add skill click).
    const expDropdown = page.locator('select').filter({ has: page.locator('option[value="0-1"]') }).last();
    if ((await expDropdown.count()) > 0) {
      await expDropdown.selectOption('0-1');
    }

    // Trigger React state update via internal onChange handler so the "Add skill" button enables.
    await skillInput.first().evaluate((el: HTMLInputElement, val: string) => {
      const propsKey = Object.keys(el).find(k => k.startsWith('__reactProps'));
      const props = propsKey ? (el as any)[propsKey] : null;
      if (props?.onChange) {
        props.onChange({ target: { value: val }, currentTarget: el });
      } else {
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        nativeSetter?.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, skill);

    try {
      await expect(addSkillBtn).toBeEnabled({ timeout: 3000 });
      await addSkillBtn.click();
      addedCount++;
      await page.waitForTimeout(500);
    } catch {
      // This skill didn't enable the button; try next skill
    }
  }

  if (addedCount < MIN_SKILLS_COUNT) {
    throw new Error(
      `Skills field has ${addedCount} entries; at least ${MIN_SKILLS_COUNT} are required.`,
    );
  }
  await expect(page.getByText(/At least 3 skills required/i)).not.toBeVisible({ timeout: 3000 });
}

/**
 * Selects the Resume document type and uploads a dummy PDF file.
 */
async function uploadResume(page: Page): Promise<void> {
  // Select Resume document type (value='3')
  const docTypeSelect = page.locator('select:has(option[value="3"])').first();
  if ((await docTypeSelect.count()) === 0) return;
  if (!(await docTypeSelect.isVisible())) return;
  await docTypeSelect.selectOption({ value: '3' });

  // Upload a minimal dummy resume file using an in-memory buffer
  const fileInput = page.locator('input[type="file"]').first();
  if ((await fileInput.count()) === 0) return;
  await fileInput.setInputFiles({
    name: 'resume.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Automated Testing Dummy Resume'),
  });

  // Click 'Add document' once it becomes enabled
  const addDocBtn = page.getByRole('button', { name: 'Add document' });
  try {
    await expect(addDocBtn).toBeEnabled({ timeout: 5000 });
    await addDocBtn.click();
    await page.waitForTimeout(500);
  } catch {
    // continue even if button doesn't enable
  }
}

/**
 * Types searchTerm into a typeahead field identified by labelText,
 * then clicks the first suggestion matching suggestionFilter.
 */
async function fillTypeahead(
  page: Page,
  labelText: string | RegExp,
  searchTerm: string,
  suggestionFilter: string | RegExp,
): Promise<void> {
  const candidates = [
    page.getByRole('textbox', { name: labelText }),
    page.getByRole('combobox', { name: labelText }),
    page.getByLabel(labelText),
  ];
  for (const candidate of candidates) {
    const count = await candidate.count();
    for (let i = 0; i < count; i++) {
      const field = candidate.nth(i);
      if (!(await field.isVisible().catch(() => false))) continue;
      if (await field.isDisabled()) continue;

      await field.click();
      await field.fill('');
      await field.pressSequentially(searchTerm, { delay: 60 });
      await page.waitForTimeout(1000);

      const filterPattern =
        typeof suggestionFilter === 'string'
          ? new RegExp(suggestionFilter, 'i')
          : suggestionFilter;

      try {
        const suggestion = page.locator('li').filter({ hasText: filterPattern }).first();
        await suggestion.waitFor({ state: 'visible', timeout: 5000 });
        await suggestion.click();
        return;
      } catch {
        // Keyboard fallback for accessible comboboxes
        await field.press('ArrowDown').catch(() => {});
        await page.waitForTimeout(300);
        await field.press('Enter').catch(() => {});
        return;
      }
    }
  }
}

/**
 * Fills Reporting / Hiring / Billing Client Manager typeaheads with retry.
 * Primary pass fills all three; retry pass re-fills any still showing a required error.
 */
async function fillClientManagers(page: Page): Promise<void> {
  const managers = [
    { label: /Client Reporting Manager\s*\*/i, idName: 'reportingManager', searchTerm: REPORTING_MANAGER_EMAIL },
    { label: /Client Hiring Manager\s*\*/i,    idName: 'hiringManager',    searchTerm: HIRING_MANAGER_EMAIL    },
    { label: /Client Billing Manager\s*\*/i,   idName: 'billingManager',   searchTerm: BILLING_MANAGER_EMAIL   },
  ];

  // Primary fill pass
  for (const mgr of managers) {
    const filterPat = new RegExp(mgr.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const candidates = [
      page.getByRole('textbox', { name: mgr.label }),
      page.getByRole('combobox', { name: mgr.label }),
      page.getByLabel(mgr.label),
      page.locator(`input[id*="${mgr.idName}" i], input[name*="${mgr.idName}" i]`),
    ];
    for (const candidate of candidates) {
      const count = await candidate.count();
      for (let i = 0; i < count; i++) {
        const field = candidate.nth(i);
        if (!(await field.isVisible().catch(() => false))) continue;
        if (await field.isDisabled()) continue;
        const current = await field.inputValue().catch(() => '');
        if (current.trim()) break;

        await field.click();
        await field.fill('');
        await field.pressSequentially(mgr.searchTerm, { delay: 60 });
        await page.waitForTimeout(1000);
        try {
          const suggestion = page.locator('li').filter({ hasText: filterPat }).first();
          await suggestion.waitFor({ state: 'visible', timeout: 5000 });
          await suggestion.click();
        } catch {
          await field.press('ArrowDown').catch(() => {});
          await page.waitForTimeout(300);
          await field.press('Enter').catch(() => {});
        }
        break;
      }
    }
  }

  // Retry pass: re-fill any manager still flagged with a required validation error
  const retryItems = [
    { msg: /Client Reporting Manager is required/i, label: /Client Reporting Manager\s*\*/i, searchTerm: REPORTING_MANAGER_EMAIL },
    { msg: /Client Hiring Manager is required/i,    label: /Client Hiring Manager\s*\*/i,    searchTerm: HIRING_MANAGER_EMAIL    },
    { msg: /Client Billing Manager is required/i,   label: /Client Billing Manager\s*\*/i,   searchTerm: BILLING_MANAGER_EMAIL   },
  ];
  for (const item of retryItems) {
    const msgVisible = await page.getByText(item.msg).isVisible().catch(() => false);
    if (msgVisible) {
      await fillTypeahead(page, item.label, item.searchTerm, item.searchTerm);
    }
  }
}

/**
 * Fills a custom ARIA combobox (not a native <select>) identified by labelPattern.
 * Strategy (in order):
 *   1. Native <select> via getByLabel
 *   2. Walk label → for-attribute → linked control (select or ARIA combobox)
 *   3. Parent-scoped combobox trigger sibling of the label
 *   4. getByRole('combobox') fallback with keyboard navigation
 */
async function fillComboboxByLabel(page: Page, labelPattern: RegExp): Promise<void> {
  // 1. Native <select> via getByLabel
  const nativeByLabel = page.getByLabel(labelPattern);
  const nativeCount   = await nativeByLabel.count();
  for (let i = 0; i < nativeCount; i++) {
    const el      = nativeByLabel.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const tagName = await el.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      const current = await el.inputValue().catch(() => '');
      if (!current || /^select|^choose|^--/i.test(current)) {
        await el.selectOption({ index: 1 }).catch(() => {});
      }
      return;
    }
  }

  // 2. Walk label → associated control via the `for` attribute
  const labelLocator = page.locator('label').filter({ hasText: labelPattern });
  const labelCount   = await labelLocator.count();
  for (let i = 0; i < labelCount; i++) {
    const label = labelLocator.nth(i);
    if (!(await label.isVisible().catch(() => false))) continue;

    const forAttr = await label.getAttribute('for').catch(() => null);
    if (forAttr) {
      const control = page.locator(`[id="${forAttr}"]`);
      if ((await control.count()) > 0 && (await control.isVisible().catch(() => false))) {
        const tagName = await control.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
        if (tagName === 'select') {
          const current = await control.inputValue().catch(() => '');
          if (!current || /^select|^choose|^--/i.test(current)) {
            await control.selectOption({ index: 1 }).catch(() => {});
          }
          return;
        }
        // ARIA combobox: click to open, then pick first visible option
        await control.click().catch(() => {});
        await page.waitForTimeout(300);
        const firstOpt = page.locator('[role="option"]').first();
        if (await firstOpt.isVisible().catch(() => false)) {
          await firstOpt.click().catch(() => {});
          return;
        }
        const listboxItem = page.locator('[role="listbox"] [role="option"], [role="listbox"] li').first();
        if (await listboxItem.isVisible().catch(() => false)) {
          await listboxItem.click().catch(() => {});
          return;
        }
      }
    }

    // 3. Parent-scoped combobox trigger sibling of the label
    const parent  = label.locator('xpath=..');
    const trigger = parent.locator('[role="combobox"], button[aria-haspopup], [aria-haspopup="listbox"]').first();
    if ((await trigger.count()) > 0 && (await trigger.isVisible().catch(() => false))) {
      await trigger.click().catch(() => {});
      await page.waitForTimeout(300);
      const opt = page.locator('[role="option"]').first();
      if (await opt.isVisible().catch(() => false)) {
        await opt.click().catch(() => {});
        return;
      }
    }
  }

  // 4. getByRole('combobox') fallback
  const comboByRole = page.getByRole('combobox', { name: labelPattern });
  const comboCount  = await comboByRole.count();
  for (let i = 0; i < comboCount; i++) {
    const combo   = comboByRole.nth(i);
    if (!(await combo.isVisible().catch(() => false))) continue;
    const tagName = await combo.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      const current = await combo.inputValue().catch(() => '');
      if (!current || /^select|^choose|^--/i.test(current)) {
        await combo.selectOption({ index: 1 }).catch(() => {});
      }
      return;
    }
    await combo.click().catch(() => {});
    await page.waitForTimeout(300);
    const opt = page.locator('[role="option"]').first();
    if (await opt.isVisible().catch(() => false)) {
      await opt.click().catch(() => {});
      return;
    }
    // Last resort: keyboard navigation
    await combo.press('ArrowDown').catch(() => {});
    await page.waitForTimeout(200);
    await combo.press('Enter').catch(() => {});
    return;
  }
}

/**
 * Fills a single Step 5 required field by its label pattern.
 * Strategy: native <select> → AJAX typeahead suggestion → generic-text fallback.
 */
async function fillStep5FieldByLabel(page: Page, labelPattern: RegExp): Promise<void> {
  const candidates = [
    page.getByRole('textbox', { name: labelPattern }),
    page.getByRole('combobox', { name: labelPattern }),
    page.getByLabel(labelPattern),
  ];
  for (const candidate of candidates) {
    const count = await candidate.count();
    for (let i = 0; i < count; i++) {
      const field = candidate.nth(i);
      if (!(await field.isVisible().catch(() => false))) continue;
      if (await field.isDisabled()) continue;

      const tagName = await field.evaluate(el => el.tagName.toLowerCase()).catch(() => '');
      if (tagName === 'select') {
        const current = await field.inputValue().catch(() => '');
        if (!current || /^select/i.test(current)) {
          await field.selectOption({ index: 1 }).catch(() => {});
        }
        return;
      }

      const current = await field.inputValue().catch(() => '');
      // Only skip if the field has a value AND it's not "None" (None means no valid selection)
      if (current.trim() && current.trim().toLowerCase() !== 'none') return;

      // Typeahead attempt using the STEP5 search term
      await field.click();
      await field.fill('');
      await field.pressSequentially(STEP5_TYPEAHEAD_SEARCH_TERM, { delay: 60 });
      await page.waitForTimeout(1000);

      try {
        const suggestion = page.locator('li')
          .filter({ hasText: new RegExp(STEP5_TYPEAHEAD_SEARCH_TERM, 'i') }).first();
        await suggestion.waitFor({ state: 'visible', timeout: 3000 });
        await suggestion.click();
      } catch {
        // No matching suggestion — keyboard fallback
        await field.press('ArrowDown').catch(() => {});
        await page.waitForTimeout(300);
        await field.press('Enter').catch(() => {});
      }

      const afterFill = await field.inputValue().catch(() => '');
      if (afterFill.trim()) return;
    }
  }
}

/**
 * Iterates all Step 5 required Placement Role field patterns and fills each one.
 */
async function fillStep5ExplicitRequiredFields(page: Page): Promise<void> {
  for (const pattern of STEP5_REQUIRED_FIELD_PATTERNS) {
    await fillStep5FieldByLabel(page, pattern);
  }
}

/**
 * Captures a timestamped full-page failure screenshot to test-results/screenshots/.
 */
async function takeFailureScreenshot(page: Page): Promise<void> {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
  const timestamp      = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(SCREENSHOTS_DIR, `MB_SNP_TC001-inline-failure-${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

// ============================================================================
// Chrome-only execution
// ============================================================================
test.use({ channel: 'chrome', ignoreHTTPSErrors: true });

// ============================================================================
// TEST SUITE
// ============================================================================
test.describe('MagicBox \u2013 Start New Placement (Steps 1\u20137 Mandatory) [Inline Data]', () => {

  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'ngrok-skip-browser-warning': 'true' });
    page.on('dialog', d => d.accept());
    await page.goto(START_URL);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await takeFailureScreenshot(page);
    }
  });

  test('MB_SNP_TC001 Complete Pre-Placement Onboarding Steps 1-7 with Mandatory Fields Only', async ({ page }) => {
    test.setTimeout(300000);

    // =========================================================================
    // ENTRY – Open wizard via the "From JobDiva" contractor table
    // =========================================================================

    await test.step('Verify Start a Pre-Placement page is loaded', async () => {
      await expect(page.getByRole('heading', { name: /Start a Pre-Placement/i })).toBeVisible();
    });

    await test.step('Click From JobDiva link to view contractor table', async () => {
      await expect(page.getByRole('link', { name: /From JobDiva/i })).toBeVisible({ timeout: 10000 });
      await page.getByRole('link', { name: /From JobDiva/i }).click();
      await page.waitForURL(/jobdiva-start/i, { timeout: 15000 }).catch(async () => {
        const jobDivaUrl = START_URL.replace(/\/start\/?$/, '/jobdiva-start');
        await page.goto(jobDivaUrl);
      });
      await expect(page.getByRole('table')).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole('button', { name: 'Start' }).first()).toBeVisible({ timeout: 20000 });
    });

    await test.step('Click Start on first contractor row and accept confirmation dialog', async () => {
      await page
        .getByRole('row')
        .filter({ has: page.getByRole('button', { name: 'Start' }) })
        .first()
        .getByRole('button', { name: 'Start' })
        .click();
    });

    await test.step('Verify Step 1 of 8 is displayed', async () => {
      await expect(page.getByText(/Step 1 of 8/i)).toBeVisible({ timeout: 15000 });
    });

    // =========================================================================
    // STEP 1 – Initiate Preplacement
    // =========================================================================

    await test.step('Fill Consultant First Name', async () => {
      await page.locator('#consultantFirstName').fill(CONSULTANT_FIRST_NAME);
      await expect(page.locator('#consultantFirstName')).toHaveValue(CONSULTANT_FIRST_NAME);
    });

    await test.step('Fill Consultant Last Name', async () => {
      await page.locator('#consultantLastName').fill(CONSULTANT_LAST_NAME);
      await expect(page.locator('#consultantLastName')).toHaveValue(CONSULTANT_LAST_NAME);
    });

    await test.step('Fill Government ID last 4 digits', async () => {
      await page.locator('#ssnLast4DigitsOnly').fill(SSN_LAST4);
      await expect(page.locator('#ssnLast4DigitsOnly')).toHaveValue(SSN_LAST4);
    });

    await test.step('Select Contract Type', async () => {
      const contractTypeEl = page.locator('#contractType');
      if ((await contractTypeEl.count()) > 0) {
        await contractTypeEl.selectOption({ index: 1 }).catch(() => {});
        const val = await contractTypeEl.inputValue().catch(() => '');
        if (!val || val.toLowerCase().startsWith('select')) {
          await fillComboboxByLabel(page, /Contract Type/i);
        }
      } else {
        await fillComboboxByLabel(page, /Contract Type/i);
      }
    });

    await test.step('Fill Client Name typeahead and select suggestion', async () => {
      await fillTypeahead(page, 'Client Name', CLIENT_NAME_SEARCH_TERM, CLIENT_NAME);
      await expect(page.locator('#clientName')).not.toHaveValue('');
    });

    await test.step('Verify End Client Name field appears and fill it', async () => {
      const endClientVisible = await page.getByText('End Client Name *', { exact: true })
        .isVisible({ timeout: 15000 }).catch(() => false);
      if (endClientVisible) {
        await fillTypeahead(page, 'End Client Name', END_CLIENT_NAME_SEARCH_TERM, END_CLIENT_NAME);
        await expect(page.locator('#endClientName')).not.toHaveValue('');
      }
    });

    await test.step('Verify navigation button states', async () => {
      await expect(page.getByRole('button', { name: 'Back' })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Save & Next' })).toBeEnabled();
    });

    await test.step('Run generic mandatory filler for Step 1', async () => {
      await runGenericStepFiller(page);
    });

    await test.step('Submit Step 1 and verify Step 2 of 8', async () => {
      await page.getByRole('button', { name: 'Save & Next' }).click();
      await expect(page.getByText(/Step 2 of 8/i)).toBeVisible({ timeout: 15000 });
    });

    // =========================================================================
    // STEP 2 – Consultant Information (work location)
    // =========================================================================

    await test.step('Run generic mandatory filler for Step 2', async () => {
      await runGenericStepFiller(page);
      const jobTitleEl = page.getByRole('combobox', { name: /Job Title/i });
      if ((await jobTitleEl.count()) > 0 && (await jobTitleEl.isVisible().catch(() => false))) {
        const jobTitleVal = await jobTitleEl.inputValue().catch(() => '');
        if (!jobTitleVal || jobTitleVal.toLowerCase().startsWith('select')) {
          await jobTitleEl.selectOption({ index: 1 }).catch(async () => {
            await fillComboboxByLabel(page, /Job Title/i);
          });
        }
      }
    });

    await test.step('Fill city, state and zip with retry until Step 3 appears', async () => {
      const combos = [
        { state: 'MAHARASHTRA', zip: '400001', city: 'Mumbai'        },
        { state: 'NEW YORK',    zip: '10017',  city: 'New York'      },
        { state: 'KARNATAKA',   zip: '560001', city: 'Bangalore'     },
        { state: 'DELHI',       zip: '110001', city: 'Delhi'         },
        { state: 'CALIFORNIA',  zip: '90210',  city: 'Beverly Hills' },
      ];

      let advancedToStep3 = false;

      for (const combo of combos) {
        if (advancedToStep3) break;

        const cityInput = page.locator('input[id*="city" i], input[name*="city" i]').first();
        if ((await cityInput.count()) > 0 && (await cityInput.isVisible().catch(() => false))) {
          await cityInput.fill(combo.city);
        }

        const stateSelect = page.locator('select[id*="state" i], select[name*="state" i]').first();
        if ((await stateSelect.count()) > 0 && (await stateSelect.isVisible().catch(() => false))) {
          await stateSelect.selectOption({ label: combo.state }).catch(async () => {
            await stateSelect.selectOption({ index: 1 }).catch(() => {});
          });
        } else {
          const stateInput = page.locator('input[id*="state" i], input[name*="state" i]').first();
          if ((await stateInput.count()) > 0 && (await stateInput.isVisible().catch(() => false))) {
            await stateInput.fill(combo.state);
          }
        }

        const zipInput = page.locator(
          'input[id*="zip" i], input[name*="zip" i],' +
          'input[id*="postal" i], input[name*="postal" i]',
        ).first();
        if ((await zipInput.count()) > 0 && (await zipInput.isVisible().catch(() => false))) {
          await zipInput.fill(combo.zip);
        }

        const jobTitleRetry = page.getByRole('combobox', { name: /Job Title/i });
        if ((await jobTitleRetry.count()) > 0 && (await jobTitleRetry.isVisible().catch(() => false))) {
          const jv = await jobTitleRetry.inputValue().catch(() => '');
          if (!jv || jv.toLowerCase().startsWith('select')) {
            await jobTitleRetry.selectOption({ index: 1 }).catch(async () => {
              await fillComboboxByLabel(page, /Job Title/i);
            });
          }
        }

        await page.getByRole('button', { name: 'Save & Next' }).click();

        try {
          await page.getByText(/Step 3 of 8/i).waitFor({ state: 'visible', timeout: 5000 });
          advancedToStep3 = true;
        } catch {
          // Still on Step 2 — try the next state / zip combination
        }
      }
    });

    await test.step('Verify Step 3 of 8 is displayed', async () => {
      await expect(page.getByText(/Step 3 of 8/i)).toBeVisible({ timeout: 15000 });
    });

    // =========================================================================
    // STEP 3 – Work Experience (skills + resume upload)
    // =========================================================================

    await test.step('Run generic mandatory filler for Step 3', async () => {
      await runGenericStepFiller(page);
    });

    await test.step('Add at least 3 skills to the skills field', async () => {
      await addSkills(page);
    });

    await test.step('Upload resume document', async () => {
      await uploadResume(page);
    });

    await test.step('Re-run generic filler after skills added', async () => {
      await runGenericStepFiller(page);
    });

    await test.step('Submit Step 3 and verify Step 4 of 8', async () => {
      await page.getByRole('button', { name: 'Save & Next' }).click();
      await expect(page.getByText(/Step 4 of 8/i)).toBeVisible({ timeout: 15000 });
    });

    // =========================================================================
    // STEP 4 – Project Details (managers + C2C vendor fields)
    // =========================================================================

    await test.step('Run generic mandatory filler for Step 4', async () => {
      await runGenericStepFiller(page);
    });

    await test.step('Fill Client Reporting, Hiring, and Billing manager fields', async () => {
      await fillClientManagers(page);
    });

    await test.step('Fill C2C Vendor fields with valid formats if present', async () => {
      const c2cPhone = page.locator('#c2cPhone');
      if ((await c2cPhone.count()) > 0 && (await c2cPhone.isVisible().catch(() => false))) {
        await c2cPhone.fill(C2C_PHONE);
      }
      const c2cFein = page.locator('#c2cFein');
      if ((await c2cFein.count()) > 0 && (await c2cFein.isVisible().catch(() => false))) {
        await c2cFein.fill(C2C_FEIN);
      }
      const c2cZip = page.locator('#c2cZip');
      if ((await c2cZip.count()) > 0 && (await c2cZip.isVisible().catch(() => false))) {
        await c2cZip.fill(C2C_ZIP);
      }
    });

    await test.step('Submit Step 4 and verify Step 5 of 8', async () => {
      await page.getByRole('button', { name: 'Save & Next' }).click();
      await expect(page.getByText(/Step 5 of 8/i)).toBeVisible({ timeout: 15000 });
    });

    // =========================================================================
    // STEP 5 – Placement Roles (retry up to 5× on failed submission)
    // =========================================================================

    await test.step('Fill all explicit required Placement Role fields', async () => {
      await fillStep5ExplicitRequiredFields(page);
    });

    await test.step('Submit Step 5 with retry until Step 6 appears', async () => {
      let advancedToStep6 = false;
      for (let attempt = 0; attempt < 5 && !advancedToStep6; attempt++) {
        await page.getByRole('button', { name: 'Save & Next' }).click();
        try {
          await page.getByText(/Step 6 of 8/i).waitFor({ state: 'visible', timeout: 4000 });
          advancedToStep6 = true;
        } catch {
          await fillStep5ExplicitRequiredFields(page);
        }
      }
    });

    await test.step('Verify Step 6 of 8 is displayed', async () => {
      await expect(page.getByText(/Step 6 of 8/i)).toBeVisible({ timeout: 15000 });
    });

    // =========================================================================
    // STEP 6 – Pay & Bill Details
    // CRITICAL: fillComboboxByLabel MUST be called for Pay Rate Unit, Bill Rate Unit,
    // and Overtime Eligibility BEFORE clicking Save & Next.
    // =========================================================================

    await test.step('Run generic mandatory filler for Step 6', async () => {
      await runGenericStepFiller(page);
    });

    await test.step('Fill Pay Rate Unit custom combobox', async () => {
      await fillComboboxByLabel(page, /Pay Rate Unit/i);
    });

    await test.step('Fill Bill Rate Unit custom combobox', async () => {
      await fillComboboxByLabel(page, /Bill Rate Unit/i);
    });

    await test.step('Fill Overtime Eligibility custom combobox', async () => {
      await fillComboboxByLabel(page, /Overtime Eligibility/i);
    });

    await test.step('Fill Client Billing Manager if required on Step 6', async () => {
      const billingMgr = page.getByRole('textbox', { name: /Client Billing Manager/i }).first();
      if ((await billingMgr.count()) > 0 && (await billingMgr.isVisible().catch(() => false))) {
        const val = await billingMgr.inputValue().catch(() => '');
        if (!val.trim()) {
          await billingMgr.click();
          await billingMgr.fill('');
          await billingMgr.pressSequentially(BILLING_MANAGER_EMAIL, { delay: 60 });
          await page.waitForTimeout(1000);
          const filterPat = new RegExp(BILLING_MANAGER_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
          await page.locator('li').filter({ hasText: filterPat }).first().click();
        }
      }
    });

    await test.step('Submit Step 6 with retry until Step 7 appears', async () => {
      let advancedToStep7 = false;
      for (let attempt = 0; attempt < 5 && !advancedToStep7; attempt++) {
        await page.getByRole('button', { name: 'Save & Next' }).click();
        try {
          await page.getByText(/Step 7 of 8/i).waitFor({ state: 'visible', timeout: 4000 });
          advancedToStep7 = true;
        } catch {
          await runGenericStepFiller(page);
          await fillComboboxByLabel(page, /Pay Rate Unit/i);
          await fillComboboxByLabel(page, /Bill Rate Unit/i);
          await fillComboboxByLabel(page, /Overtime Eligibility/i);
        }
      }
    });

    await test.step('Verify Step 7 of 8 is displayed', async () => {
      await expect(page.getByText(/Step 7 of 8/i)).toBeVisible({ timeout: 15000 });
    });

    // =========================================================================
    // STEP 7 – HR Checklist (mandatory-only; Step 8 is explicitly out of scope)
    // =========================================================================

    await test.step('Run generic mandatory filler for Step 7 HR Checklist', async () => {
      await runGenericStepFiller(page);
    });

    await test.step('Verify Step 7 of 8 remains visible (Step 8 is out of scope)', async () => {
      await expect(page.getByText(/Step 7 of 8/i)).toBeVisible();
    });
  });
});
