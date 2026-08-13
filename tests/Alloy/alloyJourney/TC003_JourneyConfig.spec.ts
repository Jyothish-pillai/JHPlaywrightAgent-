import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';

const BASE_URL = 'http://172.25.1.45:32122';
const ENDPOINTS = {
  create: `${BASE_URL}/alloy-journey/config`,
  list: `${BASE_URL}/alloy-journey/config`,
  byId: (journeyUuid: string) => `${BASE_URL}/alloy-journey/config/${journeyUuid}`,
  schema: (journeyUuid: string) => `${BASE_URL}/alloy-journey/${journeyUuid}/schema`,
};

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

function buildPayload() {
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

function randomUuidLike(): string {
  const hex = 'abcdef0123456789';
  const p = (n: number) => Array.from({ length: n }, () => hex[Math.floor(Math.random() * hex.length)]).join('');
  return `${p(8)}-${p(4)}-4${p(3)}-a${p(3)}-${p(12)}`;
}

async function createConfigIfAuthorized(request: APIRequestContext): Promise<{ journeyUuid: string | null; status: number; body: unknown }> {
  const payload = buildPayload();
  const response = await request.post(ENDPOINTS.create, { headers: buildHeaders(), data: payload });
  const status = response.status();
  const body = await readJsonSafely(response);

  if (status !== 200) {
    expect([401, 403], `Expected 200/401/403 but got ${status}`).toContain(status);
    expectNoServerError(status);
    return { journeyUuid: null, status, body };
  }

  const parsed = body as Record<string, unknown>;
  const data = parsed?.data as Record<string, unknown> | undefined;
  expect(data).toBeTruthy();
  expect(typeof data?.journeyUuid).toBe('string');

  return { journeyUuid: String(data?.journeyUuid), status, body };
}

test.describe('TC003_JourneyConfig - API Contract and Validation', () => {
  test('TC003-S01: Create journey config should succeed or deny unauthorized', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const payload = buildPayload();

    await test.step('Send create request', async () => {
      const response = await request.post(ENDPOINTS.create, { headers: buildHeaders(), data: payload });
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
    });
  });

  test('TC003-S02: Malformed JSON should be rejected or denied unauthorized without 5xx', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('Send malformed JSON create request', async () => {
      const response = await request.fetch(ENDPOINTS.create, {
        method: 'POST',
        headers: buildHeaders(),
        data: '{"dtoJourneyConfig": ',
      });

      const status = response.status();
      expect([400, 401, 403, 415, 422], `Expected 400/401/403/415/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC003-S03: Get all configs should return list wrapper or auth denial', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('Call list endpoint', async () => {
      const response = await request.get(ENDPOINTS.list, { headers: buildHeaders() });
      const status = response.status();
      const body = await readJsonSafely(response);

      if (status === 200) {
        const parsed = body as Record<string, unknown>;
        expect(parsed).toBeTruthy();
        return;
      }

      expect([401, 403], `Expected 200/401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC003-S04: Get by UUID should return data/not-found/auth denial without 5xx', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const created = await createConfigIfAuthorized(request);
    const journeyUuid = created.journeyUuid ?? randomUuidLike();

    await test.step('Call get-by-uuid endpoint', async () => {
      const response = await request.get(ENDPOINTS.byId(journeyUuid), { headers: buildHeaders() });
      const status = response.status();
      const body = await readJsonSafely(response);

      if (status === 200) {
        const parsed = body as Record<string, unknown>;
        const data = parsed?.data as Record<string, unknown> | undefined;
        expect(data).toBeTruthy();
        expect(typeof data?.journeyUuid).toBe('string');
        return;
      }

      expect([400, 401, 403, 404], `Expected 200/400/401/403/404 but got ${status}`).toContain(status);
      expectNoServerError(status);
      if (body !== null) expect(['object', 'string']).toContain(typeof body);
    });
  });

  test('TC003-S05: Update with matching UUID should succeed or be denied/missing without 5xx', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const created = await createConfigIfAuthorized(request);
    const journeyUuid = created.journeyUuid ?? randomUuidLike();
    const payload = buildPayload();
    (payload.dtoJourneyConfig as Record<string, string>).journeyUuid = journeyUuid;

    await test.step('Call update endpoint', async () => {
      const response = await request.put(ENDPOINTS.byId(journeyUuid), {
        headers: buildHeaders(),
        data: payload,
      });

      const status = response.status();
      if (status === 200) return;

      expect([400, 401, 403, 404, 422], `Expected 200/400/401/403/404/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC003-S06: Update with UUID mismatch should be rejected or denied without 5xx', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const pathUuid = randomUuidLike();
    const bodyUuid = randomUuidLike();
    const payload = buildPayload();
    (payload.dtoJourneyConfig as Record<string, string>).journeyUuid = bodyUuid;

    await test.step('Call update endpoint with mismatched UUIDs', async () => {
      const response = await request.put(ENDPOINTS.byId(pathUuid), {
        headers: buildHeaders(),
        data: payload,
      });

      const status = response.status();
      expect([400, 401, 403, 404, 422], `Expected 400/401/403/404/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC003-S07: Delete should succeed or be denied/not-found without 5xx', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const created = await createConfigIfAuthorized(request);
    const journeyUuid = created.journeyUuid ?? randomUuidLike();

    await test.step('Call delete endpoint', async () => {
      const response = await request.delete(ENDPOINTS.byId(journeyUuid), { headers: buildHeaders() });
      const status = response.status();

      if (status === 200) return;

      expect([400, 401, 403, 404], `Expected 200/400/401/403/404 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC003-S08: Schema endpoint should return data or mapped auth/not-found without 5xx', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const created = await createConfigIfAuthorized(request);
    const journeyUuid = created.journeyUuid ?? randomUuidLike();

    await test.step('Call schema endpoint', async () => {
      const response = await request.get(ENDPOINTS.schema(journeyUuid), { headers: buildHeaders() });
      const status = response.status();
      const body = await readJsonSafely(response);

      if (status === 200) {
        const parsed = body as Record<string, unknown>;
        expect(parsed).toBeTruthy();
        return;
      }

      expect([400, 401, 403, 404], `Expected 200/400/401/403/404 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});
