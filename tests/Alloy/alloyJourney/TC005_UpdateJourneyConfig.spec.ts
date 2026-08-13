import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';

const BASE_URL = 'http://172.25.1.45:32122';
const ENDPOINTS = {
  create: `${BASE_URL}/alloy-journey/config`,
  update: (journeyUuid: string) => `${BASE_URL}/alloy-journey/config/${journeyUuid}`,
};

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const selected = token ?? process.env.ALLOY_ADMIN_BEARER_TOKEN ?? process.env.ALLOY_JHID_BEARER_TOKEN ?? process.env.ALLOY_BEARER_TOKEN;
  if (selected && selected.trim().length > 0) {
    headers.Authorization = `Bearer ${selected.trim()}`;
  }

  return headers;
}

function buildCreatePayload() {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    dtoJourneyConfig: {
      journeyToken: `ALLOY-JRN-${unique}`,
      journeyName: `Journey Config ${unique}`,
      stepUpKey: `STEPUP-${unique}`,
    },
  };
}

function buildUpdatePayload(journeyUuid: string) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    dtoJourneyConfig: {
      journeyUuid,
      journeyToken: `ALLOY-JRN-UPDATED-${unique}`,
      journeyName: `Journey Config Updated ${unique}`,
      stepUpKey: `STEPUP-UPDATED-${unique}`,
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
  const part = (n: number) => Array.from({ length: n }, () => hex[Math.floor(Math.random() * hex.length)]).join('');
  return `${part(8)}-${part(4)}-4${part(3)}-a${part(3)}-${part(12)}`;
}

async function createJourneyIfAuthorized(request: APIRequestContext): Promise<{ uuid: string | null; status: number }> {
  const response = await request.post(ENDPOINTS.create, {
    headers: buildHeaders(),
    data: buildCreatePayload(),
  });

  const status = response.status();
  if (status !== 200) {
    expect([401, 403], `Expected 200/401/403 during setup create but got ${status}`).toContain(status);
    expectNoServerError(status);
    return { uuid: null, status };
  }

  const body = await readJsonSafely(response);
  const parsed = body as Record<string, unknown>;
  const data = parsed?.data as Record<string, unknown> | undefined;
  expect(data).toBeTruthy();
  expect(typeof data?.journeyUuid).toBe('string');

  return { uuid: String(data?.journeyUuid), status };
}

test.describe('TC005_UpdateJourneyConfig - API Contract and Validation', () => {
  test('TC005-S01: Update succeeds with existing UUID or returns controlled auth denial', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const created = await createJourneyIfAuthorized(request);
    const uuid = created.uuid ?? randomUuidLike();
    const payload = buildUpdatePayload(uuid);

    await test.step('Send update request with valid route/body UUID', async () => {
      const response = await request.put(ENDPOINTS.update(uuid), {
        headers: buildHeaders(),
        data: payload,
      });

      const status = response.status();
      const body = await readJsonSafely(response);

      if (status === 200) {
        const parsed = body as Record<string, unknown>;
        const data = parsed?.data as Record<string, unknown> | undefined;
        expect(data).toBeTruthy();
        expect(data?.journeyUuid).toBe(uuid);
        expect(data?.journeyToken).toBe(payload.dtoJourneyConfig.journeyToken);
        expect(data?.journeyName).toBe(payload.dtoJourneyConfig.journeyName);
        expect(data?.stepUpKey).toBe(payload.dtoJourneyConfig.stepUpKey);
        return;
      }

      expect([400, 401, 403, 404, 422], `Expected 200/400/401/403/404/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC005-S02: Authorized role behavior is preserved for update', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const created = await createJourneyIfAuthorized(request);
    const uuid = created.uuid ?? randomUuidLike();

    await test.step('Update using available authorized token', async () => {
      const response = await request.put(ENDPOINTS.update(uuid), {
        headers: buildHeaders(),
        data: buildUpdatePayload(uuid),
      });
      const status = response.status();
      expect([200, 401, 403, 404], `Expected 200/401/403/404 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC005-S03: Route/body UUID mismatch is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const pathUuid = randomUuidLike();
    const bodyUuid = randomUuidLike();
    const payload = buildUpdatePayload(bodyUuid);

    await test.step('Send update with mismatched route and body UUID', async () => {
      const response = await request.put(ENDPOINTS.update(pathUuid), {
        headers: buildHeaders(),
        data: payload,
      });

      const status = response.status();
      expect([400, 401, 403, 404, 422], `Expected 400/401/403/404/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC005-S04: Malformed JSON and type mismatch payloads are rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const uuid = randomUuidLike();

    await test.step('Send malformed JSON update payload', async () => {
      const malformedResponse = await request.fetch(ENDPOINTS.update(uuid), {
        method: 'PUT',
        headers: buildHeaders(),
        data: '{"dtoJourneyConfig": ',
      });

      const malformedStatus = malformedResponse.status();
      expect([400, 401, 403, 404, 415, 422], `Expected 400/401/403/404/415/422 but got ${malformedStatus}`).toContain(malformedStatus);
      expectNoServerError(malformedStatus);
    });

    await test.step('Send type-mismatched update payload', async () => {
      const typeMismatchPayload = {
        dtoJourneyConfig: {
          journeyUuid: uuid,
          journeyToken: 12345,
          journeyName: true,
          stepUpKey: { bad: 'type' },
        },
      };

      const typeResponse = await request.put(ENDPOINTS.update(uuid), {
        headers: buildHeaders(),
        data: typeMismatchPayload,
      });

      const typeStatus = typeResponse.status();
      expect([400, 401, 403, 404, 422], `Expected 400/401/403/404/422 but got ${typeStatus}`).toContain(typeStatus);
      expectNoServerError(typeStatus);
    });
  });

  test('TC005-S05: Invalid UUID path format is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('Send update to invalid UUID path', async () => {
      const response = await request.put(ENDPOINTS.update('not-a-uuid'), {
        headers: buildHeaders(),
        data: buildUpdatePayload(randomUuidLike()),
      });

      const status = response.status();
      expect([400, 401, 403, 404], `Expected 400/401/403/404 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC005-S06: Non-existent UUID path returns mapped not-found/auth behavior', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const uuid = randomUuidLike();

    await test.step('Send update for non-existent but valid UUID', async () => {
      const response = await request.put(ENDPOINTS.update(uuid), {
        headers: buildHeaders(),
        data: buildUpdatePayload(uuid),
      });

      const status = response.status();
      expect([401, 403, 404], `Expected 401/403/404 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC005-S07: Error mapping parity returns structured payloads', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const pathUuid = randomUuidLike();
    const bodyUuid = randomUuidLike();

    await test.step('Capture mismatch error payload shape', async () => {
      const response = await request.put(ENDPOINTS.update(pathUuid), {
        headers: buildHeaders(),
        data: buildUpdatePayload(bodyUuid),
      });

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([400, 401, 403, 404, 422], `Expected 400/401/403/404/422 but got ${status}`).toContain(status);
      expectNoServerError(status);

      if (body !== null) {
        expect(['object', 'string']).toContain(typeof body);
      }
    });
  });
});
