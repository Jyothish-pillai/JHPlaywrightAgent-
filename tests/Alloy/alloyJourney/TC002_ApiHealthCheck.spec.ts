import { test, expect } from '@playwright/test';

const HEALTH_CHECK_URL = 'http://172.25.1.45:32122/';
const EXPECTED_STATUS_CODE = 200;
const EXPECTED_RESPONSE_BODY = {
  success: true,
  resultCode: 'OK',
  message: '',
  errors: [],
  warnings: [],
  infos: [],
  payload: 'Welcome to the Alloy Service!',
};

test.describe('TC002_Alloy - API Health Check', () => {
  test('TC002: Verify service health endpoint returns expected success payload', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    let responseBody: unknown;

    await test.step('Issue a GET request to the root health endpoint with no request body', async () => {
      const response = await request.get(HEALTH_CHECK_URL);

      expect(response.status()).toBe(EXPECTED_STATUS_CODE);
      responseBody = await response.json();
    });

    await test.step('Verify the response body exactly matches the expected health contract', async () => {
      expect(responseBody).toEqual(EXPECTED_RESPONSE_BODY);
    });
  });
});