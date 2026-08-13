import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';

const BASE_URL = 'http://172.25.1.45:32122';
const CREATE_CONFIG_PATH = '/alloy-journey/config';
const CREATE_CONFIG_URL = `${BASE_URL}${CREATE_CONFIG_PATH}`;

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const bearer = process.env.ALLOY_BEARER_TOKEN;
  if (bearer && bearer.trim().length > 0) {
    headers.Authorization = `Bearer ${bearer.trim()}`;
  }

  return headers;
}

function buildValidPayload() {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    dtoJourneyConfig: {
      journeyToken: `ALLOY-JRN-${unique}`,
      journeyName: `Journey Config ${unique}`,
      stepUpKey: `STEPUP-${unique}`,
    },
  };
}

async function readJsonSafely(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function expectNoServerError(status: number): void {
  expect(status, `Expected non-5xx status but got ${status}`).toBeLessThan(500);
}

test.describe('TC003_CreateJourneyConfig - API Contract and Validation', () => {
  test('TC003-S01/S02: Create journey config should either succeed with contract or deny unauthorized', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const payload = buildValidPayload();
    const response = await request.post(CREATE_CONFIG_URL, {
      headers: buildHeaders(),
      data: payload,
    });

    const status = response.status();
    const body = await readJsonSafely(response);

    if (status === 200) {
      const parsed = body as Record<string, unknown>;
      const data = parsed?.data as Record<string, unknown> | undefined;

      expect(data, 'Expected response.data in success response').toBeTruthy();
      expect(typeof data?.journeyUuid, 'Expected server-generated journeyUuid').toBe('string');
      expect(data?.journeyToken).toBe(payload.dtoJourneyConfig.journeyToken);
      expect(data?.journeyName).toBe(payload.dtoJourneyConfig.journeyName);
      expect(data?.stepUpKey).toBe(payload.dtoJourneyConfig.stepUpKey);
      return;
    }

    expect([401, 403], `Expected 200/401/403 but got ${status}`).toContain(status);
    expectNoServerError(status);

    if (body !== null) {
      const type = typeof body;
      expect(['object', 'string']).toContain(type);
    }
  });

  test('TC003-S03: Malformed JSON should be rejected with 4xx and never 5xx', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const response = await request.fetch(CREATE_CONFIG_URL, {
      method: 'POST',
      headers: buildHeaders(),
      data: '{"dtoJourneyConfig": ',
    });

    const status = response.status();
    expect(status, `Expected 4xx for malformed JSON but got ${status}`).toBeGreaterThanOrEqual(400);
    expectNoServerError(status);
  });

  test('TC003-S04: Missing dtoJourneyConfig should fail validation or authorization without 5xx', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const response = await request.post(CREATE_CONFIG_URL, {
      headers: buildHeaders(),
      data: {},
    });

    const status = response.status();
    expect([400, 401, 403, 422], `Expected 400/401/403/422 but got ${status}`).toContain(status);
    expectNoServerError(status);
  });
});
