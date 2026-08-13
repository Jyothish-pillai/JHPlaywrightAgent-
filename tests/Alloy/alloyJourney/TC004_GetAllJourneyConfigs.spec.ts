import { test, expect, type APIResponse } from '@playwright/test';

const BASE_URL = 'http://172.25.1.45:32122';
const LIST_URL = `${BASE_URL}/alloy-journey/config`;

function buildHeaders(token?: string, includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  const chosen = token ?? process.env.ALLOY_BEARER_TOKEN;
  if (chosen && chosen.trim().length > 0) {
    headers.Authorization = `Bearer ${chosen.trim()}`;
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

function validateListContract(body: unknown): void {
  const parsed = body as Record<string, unknown> | null;
  expect(parsed, 'Expected response body object').toBeTruthy();

  // Service contract describes RestResponse<List<DTOJourneyConfig?>>.
  // Validate presence of data key when success path is returned.
  expect(Object.prototype.hasOwnProperty.call(parsed as object, 'data')).toBe(true);

  const data = (parsed as Record<string, unknown>).data;
  expect(Array.isArray(data), 'Expected response.data to be an array').toBe(true);

  const firstNonNull = (data as unknown[]).find((item) => item !== null);
  if (firstNonNull && typeof firstNonNull === 'object') {
    const config = firstNonNull as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(config, 'journeyUuid')) {
      expect(typeof config.journeyUuid === 'string' || config.journeyUuid === null).toBe(true);
    }
    if (Object.prototype.hasOwnProperty.call(config, 'journeyToken')) {
      expect(typeof config.journeyToken === 'string' || config.journeyToken === null).toBe(true);
    }
  }
}

test.describe('TC004_GetAllJourneyConfigs - API Contract and Validation', () => {
  test('TC004-S01: Authorized request returns list contract or controlled auth denial', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const token = process.env.ALLOY_ADMIN_BEARER_TOKEN || process.env.ALLOY_JHID_BEARER_TOKEN || process.env.ALLOY_BEARER_TOKEN;

    await test.step('Call list endpoint with available auth token', async () => {
      const response = await request.get(LIST_URL, { headers: buildHeaders(token) });
      const status = response.status();
      const body = await readJsonSafely(response);

      if (status === 200) {
        validateListContract(body);
        return;
      }

      expect([401, 403], `Expected 200/401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC004-S02: Unauthenticated request is denied', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('Call list endpoint without auth header', async () => {
      const response = await request.get(LIST_URL, { headers: { 'Content-Type': 'application/json' } });
      const status = response.status();
      const body = await readJsonSafely(response);

      expect([401, 403], `Expected 401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
      if (body !== null) {
        expect(['object', 'string']).toContain(typeof body);
      }
    });
  });

  test('TC004-S03: Invalid token is denied', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('Call list endpoint with invalid token', async () => {
      const response = await request.get(LIST_URL, { headers: buildHeaders('invalid-token-for-role-check') });
      const status = response.status();

      expect([401, 403], `Expected 401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC004-S04: GET with request body has controlled behavior', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const token = process.env.ALLOY_ADMIN_BEARER_TOKEN || process.env.ALLOY_JHID_BEARER_TOKEN || process.env.ALLOY_BEARER_TOKEN;

    await test.step('Send GET request with unexpected JSON body', async () => {
      const response = await request.fetch(LIST_URL, {
        method: 'GET',
        headers: buildHeaders(token),
        data: {
          unexpected: 'payload',
          traceId: `TC004-${Date.now()}`,
        },
      });

      const status = response.status();
      const body = await readJsonSafely(response);

      if (status === 200) {
        validateListContract(body);
        return;
      }

      expect([400, 401, 403, 405, 415, 422], `Expected 200/400/401/403/405/415/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC004-S05: Baseline contract consistency check', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const token = process.env.ALLOY_ADMIN_BEARER_TOKEN || process.env.ALLOY_JHID_BEARER_TOKEN || process.env.ALLOY_BEARER_TOKEN;

    await test.step('Call baseline GET and verify contract/error shape', async () => {
      const response = await request.get(LIST_URL, { headers: buildHeaders(token) });
      const status = response.status();
      const body = await readJsonSafely(response);

      if (status === 200) {
        validateListContract(body);
        return;
      }

      expect([401, 403], `Expected 200/401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
      if (body !== null) {
        expect(['object', 'string']).toContain(typeof body);
      }
    });
  });
});
