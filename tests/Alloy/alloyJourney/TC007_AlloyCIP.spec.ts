import { test, expect, type APIResponse } from '@playwright/test';

const BASE_URL = process.env.OA_ALLOY_BASE_URL || 'http://172.25.1.45:32122';

function buildCipPath(workspaceUuid: string, enrollmentId: string | number, applicantId: string | number, cipId: string | number): string {
  return `/workspace/${workspaceUuid}/enrollment/${enrollmentId}/applicant/${applicantId}/cip/${cipId}/alloy`;
}

function buildRunUrl(workspaceUuid: string, enrollmentId: string | number, applicantId: string | number, cipId: string | number): string {
  return `${BASE_URL}${buildCipPath(workspaceUuid, enrollmentId, applicantId, cipId)}`;
}

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

function validRunBody(): Record<string, unknown> {
  return {
    evaluationRequest: {
      userIpAddressV4: '10.1.1.10',
      userIpAddressV6: '2001:db8::1',
      applicantType: 'CONSUMER',
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

function expectStructured(body: unknown): void {
  if (body === null) return;
  expect(['object', 'string']).toContain(typeof body);
}

test.describe('TC007_AlloyCIP - API Contract and Validation', () => {
  const validPath = {
    workspaceUuid: '00000000-0000-4000-8000-000000000001',
    enrollmentId: 1001,
    applicantId: 2001,
    cipId: 3001,
  };

  test('TC007-S01: POST run with valid path/body returns controlled status', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('POST valid Alloy run request', async () => {
      const response = await request.post(
        buildRunUrl(validPath.workspaceUuid, validPath.enrollmentId, validPath.applicantId, validPath.cipId),
        {
          headers: headersWithToken(),
          data: validRunBody(),
        },
      );

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([200, 400, 401, 403, 404, 422], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectStructured(body);
    });
  });

  test('TC007-S02: POST authorization behavior with and without token', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('POST with available token', async () => {
      const response = await request.post(
        buildRunUrl(validPath.workspaceUuid, validPath.enrollmentId, validPath.applicantId, validPath.cipId),
        {
          headers: headersWithToken(),
          data: validRunBody(),
        },
      );

      const status = response.status();
      expect([200, 400, 401, 403, 404, 422], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });

    await test.step('POST without token', async () => {
      const response = await request.post(
        buildRunUrl(validPath.workspaceUuid, validPath.enrollmentId, validPath.applicantId, validPath.cipId),
        {
          headers: { 'Content-Type': 'application/json' },
          data: validRunBody(),
        },
      );

      const status = response.status();
      expect([401, 403], `Expected 401/403 without token but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC007-S03: POST payload validation handles malformed and type-mismatch bodies', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('POST malformed JSON', async () => {
      const malformed = '{"evaluationRequest": ';
      const response = await request.fetch(
        buildRunUrl(validPath.workspaceUuid, validPath.enrollmentId, validPath.applicantId, validPath.cipId),
        {
          method: 'POST',
          headers: headersWithToken(),
          data: malformed,
        },
      );

      const status = response.status();
      expect([400, 401, 403, 404, 415, 422], `Expected controlled validation/auth status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });

    await test.step('POST type-mismatch body', async () => {
      const response = await request.post(
        buildRunUrl(validPath.workspaceUuid, validPath.enrollmentId, validPath.applicantId, validPath.cipId),
        {
          headers: headersWithToken(),
          data: {
            evaluationRequest: {
              userIpAddressV4: 123,
              userIpAddressV6: { bad: 'type' },
              applicantType: 999,
            },
          },
        },
      );

      const status = response.status();
      expect([400, 401, 403, 404, 422], `Expected controlled validation/auth status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC007-S04: POST invalid workspace UUID is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('POST with invalid workspace UUID format', async () => {
      const response = await request.post(
        buildRunUrl('not-a-uuid', validPath.enrollmentId, validPath.applicantId, validPath.cipId),
        {
          headers: headersWithToken(),
          data: validRunBody(),
        },
      );

      const status = response.status();
      expect([400, 401, 403, 404], `Expected controlled path/auth status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC007-S05: PUT placeholder behavior with no body is controlled', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('PUT no-body placeholder request', async () => {
      const response = await request.fetch(
        buildRunUrl(validPath.workspaceUuid, validPath.enrollmentId, validPath.applicantId, validPath.cipId),
        {
          method: 'PUT',
          headers: headersWithToken(),
        },
      );

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([200, 400, 401, 403, 404, 422], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectStructured(body);
    });
  });

  test('TC007-S06: PUT authorization behavior with and without token', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('PUT with available token', async () => {
      const response = await request.fetch(
        buildRunUrl(validPath.workspaceUuid, validPath.enrollmentId, validPath.applicantId, validPath.cipId),
        {
          method: 'PUT',
          headers: headersWithToken(),
        },
      );

      const status = response.status();
      expect([200, 400, 401, 403, 404, 422], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });

    await test.step('PUT without token', async () => {
      const response = await request.fetch(
        buildRunUrl(validPath.workspaceUuid, validPath.enrollmentId, validPath.applicantId, validPath.cipId),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const status = response.status();
      expect([401, 403], `Expected 401/403 without token but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC007-S07: PUT path validation with invalid identifiers is controlled', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('PUT with invalid numeric path value', async () => {
      const response = await request.fetch(
        buildRunUrl(validPath.workspaceUuid, 'bad-int', validPath.applicantId, validPath.cipId),
        {
          method: 'PUT',
          headers: headersWithToken(),
        },
      );

      const status = response.status();
      expect([400, 401, 403, 404], `Expected controlled path/auth status but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC007-S08: PUT with unexpected JSON body remains controlled', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('PUT with unexpected body', async () => {
      const response = await request.fetch(
        buildRunUrl(validPath.workspaceUuid, validPath.enrollmentId, validPath.applicantId, validPath.cipId),
        {
          method: 'PUT',
          headers: headersWithToken(),
          data: {
            unexpected: true,
            traceId: `TC007-${Date.now()}`,
          },
        },
      );

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([200, 400, 401, 403, 404, 415, 422], `Expected controlled status but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectStructured(body);
    });
  });
});
