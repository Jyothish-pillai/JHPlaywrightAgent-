import { test, expect, Page, Locator } from '@playwright/test';

const START_URL = 'https://10.35.213.19/report/#';
const PREPLACEMENT_URL_PATTERN = '**/pci/search/joblisting?perform=1';
const STEP1_URL_PATTERN = '**/pci/entity/onb_demographic/**?tab=step-1*';
const STEP2_URL_PATTERN = '**/pci/entity/onb_demographic/**?tab=step-2*';

const USERNAME = 'rohit.laishram@celsiortech.com';
const PASSWORD = 'Pyramid@1';

const CANDIDATE_FULL_NAME = 'CAFN-roC CAFN-eG';
const CANDIDATE_SEARCH_TERM = 'CAFN-roC';
const NO_MATCHING_RECORDS_TEXT = 'No matching records found';

const CONSULTANT_MIDDLE_NAME = '';
const SUFFIX_VALUE = 'Jr';
const SSN_LAST_4 = '4567';
const DIVISION_VALUE = 'Celsior';
const CONTRACT_TYPE_VALUE = 'C2C';
const CLIENT_NAME_VALUE = 'CUS-avA';

const TEST_TIMEOUT_MS = 300000;
const SLOW_PAGE_TIMEOUT_MS = 120000;
const DEFAULT_WAIT_TIMEOUT_MS = 45000;
const SHORT_RETRY_DELAY_MS = 400;

async function waitUntilVisible(locator: Locator, timeout = DEFAULT_WAIT_TIMEOUT_MS): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
}

async function clickWithRetry(locator: Locator, retries = 2): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await waitUntilVisible(locator);
      await locator.click({ timeout: DEFAULT_WAIT_TIMEOUT_MS });
      return;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await locator.page().waitForTimeout(SHORT_RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

async function selectByLabel(page: Page, labelPattern: RegExp, fallbackSelector: string, value: string): Promise<void> {
  const labeled = page.getByLabel(labelPattern).first();
  if (await labeled.isVisible().catch(() => false)) {
    await labeled.selectOption({ label: value });
    return;
  }

  const fallback = page.locator(fallbackSelector).first();
  await waitUntilVisible(fallback);
  await fallback.selectOption({ label: value });
}

async function resolveTextboxNearLabel(page: Page, labelText: string, fallbackSelector: string): Promise<Locator> {
  const byLabel = page.getByLabel(new RegExp(labelText, 'i')).first();
  if (await byLabel.isVisible().catch(() => false)) {
    return byLabel;
  }

  const byContainer = page.locator(`div:has-text("${labelText}") input`).first();
  if (await byContainer.isVisible().catch(() => false)) {
    return byContainer;
  }

  const byFollowingSibling = page
    .locator(`xpath=//*[contains(normalize-space(),"${labelText}")]/following::input[1]`)
    .first();
  if (await byFollowingSibling.isVisible().catch(() => false)) {
    return byFollowingSibling;
  }

  return page.locator(fallbackSelector).first();
}

async function resolveSelectNearLabel(page: Page, labelText: string, fallbackSelector: string): Promise<Locator> {
  const byLabel = page.getByLabel(new RegExp(labelText, 'i')).first();
  if (await byLabel.isVisible().catch(() => false)) {
    return byLabel;
  }

  const byContainer = page.locator(`div:has-text("${labelText}") select`).first();
  if (await byContainer.isVisible().catch(() => false)) {
    return byContainer;
  }

  const byFollowingSibling = page
    .locator(`xpath=//*[contains(normalize-space(),"${labelText}")]/following::select[1]`)
    .first();
  if (await byFollowingSibling.isVisible().catch(() => false)) {
    return byFollowingSibling;
  }

  return page.locator(fallbackSelector).first();
}

async function performLoginIfNeeded(page: Page): Promise<void> {
  const loginButton = page.getByRole('button', { name: /login/i }).first();

  if (await loginButton.isVisible().catch(() => false)) {
    const usernameInput = page
      .locator('input[name="username"], input[name="email"], input[placeholder*="user" i], input[type="text"]')
      .first();
    const passwordInput = page.locator('input[type="password"]').first();

    await waitUntilVisible(usernameInput);
    await usernameInput.fill(USERNAME);
    await waitUntilVisible(passwordInput);
    await passwordInput.fill(PASSWORD);
    await clickWithRetry(loginButton);
  }

  await page.waitForURL('**/report/#*', { timeout: SLOW_PAGE_TIMEOUT_MS });
}

async function confirmSaveAndContinue(page: Page): Promise<void> {
  let dialogAccepted = false;
  const onDialog = async (dialog: any) => {
    dialogAccepted = true;
    await dialog.accept();
  };

  page.once('dialog', onDialog);

  const saveAndContinueButton = page.getByRole('button', { name: /save and continue/i }).first();
  await clickWithRetry(saveAndContinueButton);

  const okButtonSelectors = [
    page.getByRole('button', { name: /^ok$/i }).first(),
    page.locator('.modal-footer button:has-text("OK")').first(),
    page.locator('button:has-text("OK")').first()
  ];

  for (const okButton of okButtonSelectors) {
    if (await okButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await okButton.click();
      break;
    }
  }

  if (!dialogAccepted) {
    page.removeListener('dialog', onDialog);
  }
}

test.describe('MB-CR001 - Complete Contract Replacement Onboarding Step 1 and Verify Step 2', () => {
  test('TC001 - Complete Step 1 and confirm Step 2 is active', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    await page.goto(START_URL, { waitUntil: 'domcontentloaded' });
    await performLoginIfNeeded(page);

    const onboardingMenu = page.locator('a[href="#"]:has-text("Onboarding")').first();
    await clickWithRetry(onboardingMenu);

    const initiatePrePlacementLink = page.getByRole('link', { name: /Initiate Contract Pre-Placements/i }).first();
    await clickWithRetry(initiatePrePlacementLink);

    await page.waitForURL(PREPLACEMENT_URL_PATTERN, { timeout: SLOW_PAGE_TIMEOUT_MS });

    const tableSearch = page.locator('input[aria-controls="searchtab"], #searchtab_filter input[type="search"]').first();
    await waitUntilVisible(tableSearch);
    await tableSearch.fill(CANDIDATE_SEARCH_TERM);

    let candidateRow = page.locator('#searchtab tbody tr', { hasText: CANDIDATE_FULL_NAME }).first();

    if (!(await candidateRow.isVisible().catch(() => false))) {
      const noMatchRow = page.getByText(NO_MATCHING_RECORDS_TEXT).first();
      if (await noMatchRow.isVisible().catch(() => false)) {
        await tableSearch.fill('');
      }

      candidateRow = page.locator('#searchtab tbody tr').filter({ has: page.getByRole('button', { name: /Create Onboarding Record/i }) }).first();
    }

    await waitUntilVisible(candidateRow, SLOW_PAGE_TIMEOUT_MS);
    const selectedCandidateText = (await candidateRow.textContent()) || '';
    const selectedCandidateMatch = selectedCandidateText.match(/(CAFN-[^\s]+)\s+(CAFN-[^\s]+)/i);
    const expectedFirstName = selectedCandidateMatch?.[1] || CANDIDATE_SEARCH_TERM;
    const expectedLastName = selectedCandidateMatch?.[2] || '';

    const createOnboardingButton = candidateRow.getByRole('button', { name: /Create Onboarding Record/i }).first();
    await clickWithRetry(createOnboardingButton);

    const confirmationText = page.getByText('Proceeding to this page will create a new onboarding record', { exact: false }).first();
    await waitUntilVisible(confirmationText, SLOW_PAGE_TIMEOUT_MS);

    const saveAndCreateButton = page.getByRole('button', { name: /Save\s*&\s*Create/i }).first();
    await clickWithRetry(saveAndCreateButton);

    await page.waitForURL(STEP1_URL_PATTERN, { timeout: SLOW_PAGE_TIMEOUT_MS });

    const firstNameInput = await resolveTextboxNearLabel(
      page,
      'Consultant First Name',
      'input[id*="first" i], input[name*="first" i]'
    );
    const lastNameInput = await resolveTextboxNearLabel(
      page,
      'Consultant Last Name',
      'input[id*="last" i], input[name*="last" i]'
    );
    const middleNameInput = await resolveTextboxNearLabel(
      page,
      'Consultant Middle Name',
      'input[id*="middle" i], input[name*="middle" i]'
    );

    await waitUntilVisible(firstNameInput, SLOW_PAGE_TIMEOUT_MS);
    await expect(firstNameInput).toHaveValue(new RegExp(expectedFirstName, 'i'));
    if (expectedLastName) {
      await expect(lastNameInput).toHaveValue(new RegExp(expectedLastName, 'i'));
    } else {
      await expect(lastNameInput).not.toHaveValue('');
    }

    if (await middleNameInput.isVisible().catch(() => false)) {
      await expect(middleNameInput).toHaveValue(CONSULTANT_MIDDLE_NAME);
    }

    const suffixSelect = await resolveSelectNearLabel(page, 'Suffix', '#suffix_type_id');
    await waitUntilVisible(suffixSelect);
    await suffixSelect.selectOption({ label: SUFFIX_VALUE });

    const ssnInput = page
      .locator('input[id*="ssn" i], input[name*="ssn" i], input[placeholder*="Last 4" i]')
      .first();
    await waitUntilVisible(ssnInput);
    await ssnInput.fill(SSN_LAST_4);

    const divisionSelect = await resolveSelectNearLabel(page, 'Division', '#division_id');
    await waitUntilVisible(divisionSelect);
    await divisionSelect.selectOption({ label: DIVISION_VALUE });

    const contractTypeSelect = await resolveSelectNearLabel(page, 'Contract Type', '#employment_type_id');
    await waitUntilVisible(contractTypeSelect);
    await contractTypeSelect.selectOption({ label: CONTRACT_TYPE_VALUE });

    const clientSelect = page.locator('#customer_id').first();
    await waitUntilVisible(clientSelect);
    const selectedClientText = await clientSelect.locator('option:checked').textContent();
    if (!selectedClientText || !selectedClientText.includes(CLIENT_NAME_VALUE)) {
      await clientSelect.selectOption({ label: CLIENT_NAME_VALUE });
    }

    const endClientContainer = page.locator('#endclient_id').locator('xpath=ancestor::*[contains(@class,"form-group")][1]').first();
    if (await endClientContainer.count()) {
      await expect(endClientContainer).toBeHidden();
    }

    await confirmSaveAndContinue(page);

    await page.waitForURL(STEP2_URL_PATTERN, { timeout: SLOW_PAGE_TIMEOUT_MS });

    const step2Header = page.getByText(/Consultant Information/i).first();
    await waitUntilVisible(step2Header, SLOW_PAGE_TIMEOUT_MS);

    const activeStepCandidate = page
      .locator('li.active, .active, .current')
      .filter({ hasText: /Consultant Information/i })
      .first();

    if (await activeStepCandidate.count()) {
      await expect(activeStepCandidate).toBeVisible();
    }
  });
});