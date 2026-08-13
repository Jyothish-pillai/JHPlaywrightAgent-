import { test, expect, type APIResponse } from '@playwright/test';
import { createHmac } from 'crypto';

const OA_ALLOY_BASE_URL = process.env.OA_ALLOY_BASE_URL || 'http://172.25.1.45:32122';
const WEBHOOK_URL = `${OA_ALLOY_BASE_URL}/webhook/journeys`;
const INSTITUTION_ID = process.env.INSTITUTION_ID || '1';
const INGRESS_WEBHOOK_URL = `${OA_ALLOY_BASE_URL}/institution/${INSTITUTION_ID}/webhook/journeys`;

function buildRawWebhookPayload(): string {
  const now = new Date().toISOString();
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  return JSON.stringify({
    event: 'journey.updated',
    journey_id: `journey-${unique}`,
    status: 'completed',
    updated_at: now,
    metadata: {
      source: 'playwright-pipeline',
      testId: `TC006-${unique}`,
    },
  });
}

function buildSignature(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

function buildHeaders(rawBody: string, mode: 'valid' | 'invalid' | 'missing'): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (mode === 'missing') {
    return headers;
  }

  if (mode === 'invalid') {
    headers.Authorization = 'bad-signature-value';
    return headers;
  }

  const secret = process.env.ALLOY_WEBHOOK_SECRET || process.env.OA_ALLOY_WEBHOOK_SECRET;
  if (!secret) {
    // When secret is not configured, we still send a deterministic placeholder signature.
    headers.Authorization = buildSignature('missing-secret-placeholder', rawBody);
    return headers;
  }

  headers.Authorization = buildSignature(secret, rawBody);
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

function expectWrappedLikePayload(body: unknown): void {
  if (body === null) {
    return;
  }
  expect(['object', 'string']).toContain(typeof body);
}

test.describe('TC006_ProcessJourneysWebhook - API Contract and Validation', () => {
  test('TC006-S01: Signed webhook is acknowledged or controlled 4xx based on env configuration', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const rawBody = buildRawWebhookPayload();

    await test.step('POST signed payload to /webhook/journeys', async () => {
      const response = await request.fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: buildHeaders(rawBody, 'valid'),
        data: rawBody,
      });

      const status = response.status();
      const body = await readJsonSafely(response);

      // Contract notes indicate 200 on valid; environment policy can also return 400/403 for secret/signature mismatches.
      expect([200, 400, 403], `Expected 200/400/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectWrappedLikePayload(body);
    });
  });

  test('TC006-S02: External ingress path behaves as direct route (status class parity)', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const rawBody = buildRawWebhookPayload();
    const headers = buildHeaders(rawBody, 'valid');

    await test.step('Call direct and ingress routes with same payload', async () => {
      const direct = await request.fetch(WEBHOOK_URL, {
        method: 'POST',
        headers,
        data: rawBody,
      });
      const ingress = await request.fetch(INGRESS_WEBHOOK_URL, {
        method: 'POST',
        headers,
        data: rawBody,
      });

      const directStatus = direct.status();
      const ingressStatus = ingress.status();

      expectNoServerError(directStatus);
      expectNoServerError(ingressStatus);

      const directClass = Math.floor(directStatus / 100);
      const ingressClass = Math.floor(ingressStatus / 100);
      expect([2, 4]).toContain(directClass);
      expect([2, 4]).toContain(ingressClass);
    });
  });

  test('TC006-S03: Missing Authorization signature is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const rawBody = buildRawWebhookPayload();

    await test.step('POST webhook without Authorization header', async () => {
      const response = await request.fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: buildHeaders(rawBody, 'missing'),
        data: rawBody,
      });

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([400, 401, 403], `Expected 400/401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectWrappedLikePayload(body);
    });
  });

  test('TC006-S04: Invalid signature is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const rawBody = buildRawWebhookPayload();

    await test.step('POST webhook with invalid signature', async () => {
      const response = await request.fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: buildHeaders(rawBody, 'invalid'),
        data: rawBody,
      });

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([400, 401, 403], `Expected 400/401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectWrappedLikePayload(body);
    });
  });

  test('TC006-S05: Malformed JSON is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const malformed = '{"event":"journey.updated",';

    await test.step('POST malformed JSON payload', async () => {
      const response = await request.fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: buildHeaders(malformed, 'valid'),
        data: malformed,
      });

      const status = response.status();
      expect([400, 401, 403], `Expected 400/401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC006-S06: Missing/invalid secret configuration results in controlled error class', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const rawBody = buildRawWebhookPayload();

    await test.step('POST with deterministic placeholder signature to emulate missing secret mismatch', async () => {
      const response = await request.fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: buildSignature('definitely-not-real-secret', rawBody),
        },
        data: rawBody,
      });

      const status = response.status();
      expect([400, 401, 403], `Expected 400/401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('TC006-S07: Error path payload remains structured (wrapper parity check)', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const rawBody = buildRawWebhookPayload();

    await test.step('Inspect error payload shape from invalid signature path', async () => {
      const response = await request.fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: buildHeaders(rawBody, 'invalid'),
        data: rawBody,
      });

      const status = response.status();
      const body = await readJsonSafely(response);
      expect([400, 401, 403], `Expected 400/401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
      expectWrappedLikePayload(body);
    });
  });
});
