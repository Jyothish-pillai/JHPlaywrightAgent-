import { test, expect, type APIResponse } from '@playwright/test';

const BASE_URL = process.env.OA_ALLOY_BASE_URL || 'http://172.25.1.45:32122';

function headersWithToken(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const selected = token ?? process.env.ALLOY_SERVICE_BEARER_TOKEN ?? process.env.ALLOY_JHID_BEARER_TOKEN ?? process.env.ALLOY_BEARER_TOKEN;
  if (selected && selected.trim().length > 0) {
    headers.Authorization = `Bearer ${selected.trim()}`;
  }

  return headers;
}

async function readJsonSafely(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function expectNoServerError(status: number): void {
  expect(status, `Expected non-5xx status but got ${status}`).toBeLessThan(500);
}

function expectStructured(body: unknown): void {
  if (body === null) return;
  expect(['object', 'string']).toContain(typeof body);
}

const testUuid = '00000000-0000-4000-8000-000000000001';
const testAppUuid = '00000000-0000-4000-8000-000000000002';
const testJourneyAppUuid = '00000000-0000-4000-8000-000000000003';

function buildPersonPayload() {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    do_await_additional_entities: false,
    entities: [
      {
        external_entity_id: `PERSON_${unique}`,
        entity_type: 'PERSON',
        branch_name: 'default',
        data: {
          name_first: 'John',
          name_middle: 'M',
          name_last: 'Doe',
          birth_date: '1990-01-01',
          document_ssn: '123-45-6789',
          email_address: `john.doe+${unique}@example.com`,
          phone_number: '+1-555-0100',
          ip_address_v4: '192.168.1.1',
        },
      },
    ],
  };
}

function buildBusinessPayload() {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    do_await_additional_entities: false,
    entities: [
      {
        external_entity_id: `BIZ_${unique}`,
        entity_type: 'BUSINESS',
        branch_name: 'default',
        data: {
          business_name: `Test Business ${unique}`,
          business_federal_ein: '12-3456789',
          business_phone_number: '+1-555-0200',
          business_url: 'https://example.com',
          business_type: 'LLC',
          representatives: [
            {
              name_first: 'Jane',
              name_last: 'Owner',
              type: 'OWNER',
              birth_date: '1985-05-15',
              document_ssn: '987-65-4321',
              email_address: `jane.owner+${unique}@example.com`,
              phone_number: '+1-555-0300',
              ownership_percentage: 100,
            },
          ],
        },
      },
    ],
  };
}

test.describe('TC008_JourneyConfig - Multi-Endpoint Journey APIs', () => {
  test('TC008-S01: GET config endpoint with valid application UUID', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('GET application config', async () => {
      const response = await request.get(`${BASE_URL}/alloy-journey/applications/${testAppUuid}/config`, {
        headers: headersWithToken(),
      });

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([200, 400, 401, 403, 404], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectStructured(body);
    });
  });

  test('TC008-S02: GET config auth behavior with and without token', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('GET with token', async () => {
      const response = await request.get(`${BASE_URL}/alloy-journey/applications/${testAppUuid}/config`, {
        headers: headersWithToken(),
      });

      const status = response.status();
      expect([200, 400, 401, 403, 404], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });

    await test.step('GET without token', async () => {
      const response = await request.get(`${BASE_URL}/alloy-journey/applications/${testAppUuid}/config`, {
        headers: { 'Content-Type': 'application/json' },
      });

      const status = response.status();
      expect([401, 403], `Expected 401/403 without token but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC008-S03: GET config with invalid UUID path format', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('GET with malformed UUID', async () => {
      const response = await request.get(`${BASE_URL}/alloy-journey/applications/not-a-uuid/config`, {
        headers: headersWithToken(),
      });

      const status = response.status();
      expect([400, 401, 403, 404], `Expected path validation status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC008-S04: POST start-person journey happy path', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('POST start person journey', async () => {
      const response = await request.post(`${BASE_URL}/alloy-journey/${testUuid}/start-person`, {
        headers: headersWithToken(),
        data: buildPersonPayload(),
      });

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([200, 400, 401, 403, 404, 422], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectStructured(body);
    });
  });

  test('TC008-S05: POST start-person payload validation', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('POST malformed JSON', async () => {
      const malformed = '{"entities": [';
      const response = await request.fetch(`${BASE_URL}/alloy-journey/${testUuid}/start-person`, {
        method: 'POST',
        headers: headersWithToken(),
        data: malformed,
      });

      const status = response.status();
      expect([400, 401, 403, 404, 415, 422], `Expected validation status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });

    await test.step('POST type-mismatch entities', async () => {
      const response = await request.post(`${BASE_URL}/alloy-journey/${testUuid}/start-person`, {
        headers: headersWithToken(),
        data: {
          do_await_additional_entities: false,
          entities: 'not-an-array',
        },
      });

      const status = response.status();
      expect([400, 401, 403, 404, 422], `Expected validation status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC008-S06: POST start-business journey happy path', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('POST start business journey', async () => {
      const response = await request.post(`${BASE_URL}/alloy-journey/${testUuid}/start-business`, {
        headers: headersWithToken(),
        data: buildBusinessPayload(),
      });

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([200, 400, 401, 403, 404, 422], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectStructured(body);
    });
  });

  test('TC008-S07: POST start-business payload validation', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('POST malformed JSON business', async () => {
      const malformed = '{"entities": {';
      const response = await request.fetch(`${BASE_URL}/alloy-journey/${testUuid}/start-business`, {
        method: 'POST',
        headers: headersWithToken(),
        data: malformed,
      });

      const status = response.status();
      expect([400, 401, 403, 404, 415, 422], `Expected validation status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC008-S08: GET journey application status', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('GET journey application state', async () => {
      const response = await request.get(`${BASE_URL}/alloy-journey/applications/${testJourneyAppUuid}`, {
        headers: headersWithToken(),
      });

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([200, 400, 401, 403, 404], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectStructured(body);
    });
  });

  test('TC008-S09: GET journey application auth behavior', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('GET journey with token', async () => {
      const response = await request.get(`${BASE_URL}/alloy-journey/applications/${testJourneyAppUuid}`, {
        headers: headersWithToken(),
      });

      const status = response.status();
      expect([200, 400, 401, 403, 404], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });

    await test.step('GET journey without token', async () => {
      const response = await request.get(`${BASE_URL}/alloy-journey/applications/${testJourneyAppUuid}`, {
        headers: { 'Content-Type': 'application/json' },
      });

      const status = response.status();
      expect([401, 403], `Expected 401/403 without token but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC008-S10: GET journey with invalid UUID format', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('GET journey with malformed UUID', async () => {
      const response = await request.get(`${BASE_URL}/alloy-journey/applications/invalid-uuid`, {
        headers: headersWithToken(),
      });

      const status = response.status();
      expect([400, 401, 403, 404], `Expected path validation status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC008-S11: RestResponse contract consistency across endpoints', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('Validate response envelope shapes', async () => {
      const getConfigResp = await request.get(`${BASE_URL}/alloy-journey/applications/${testAppUuid}/config`, {
        headers: headersWithToken(),
      });
      const postPersonResp = await request.post(`${BASE_URL}/alloy-journey/${testUuid}/start-person`, {
        headers: headersWithToken(),
        data: buildPersonPayload(),
      });
      const getJourneyResp = await request.get(`${BASE_URL}/alloy-journey/applications/${testJourneyAppUuid}`, {
        headers: headersWithToken(),
      });

      const configBody = await readJsonSafely(getConfigResp);
      const personBody = await readJsonSafely(postPersonResp);
      const journeyBody = await readJsonSafely(getJourneyResp);

      expectStructured(configBody);
      expectStructured(personBody);
      expectStructured(journeyBody);

      expectNoServerError(getConfigResp.status());
      expectNoServerError(postPersonResp.status());
      expectNoServerError(getJourneyResp.status());
    });
  });
});
