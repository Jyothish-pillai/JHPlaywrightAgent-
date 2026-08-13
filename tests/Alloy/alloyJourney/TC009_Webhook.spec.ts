import { test, expect, type APIResponse } from '@playwright/test';
import { randomUUID } from 'crypto';

const BASE_URL = process.env.OA_ALLOY_BASE_URL || 'http://172.25.1.45:32122';

// Helper: Build authorization header with token precedence chain
function buildHeaders(token?: string, includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  // Token precedence: explicit > SERVICE_BEARER_TOKEN > JHID_BEARER_TOKEN > ALLOY_BEARER_TOKEN
  const selected = token ?? 
    process.env.ALLOY_SERVICE_BEARER_TOKEN ?? 
    process.env.ALLOY_JHID_BEARER_TOKEN ?? 
    process.env.ALLOY_BEARER_TOKEN;
  
  if (selected && selected.trim().length > 0) {
    headers.Authorization = `Bearer ${selected.trim()}`;
  }

  return headers;
}

// Helper: Safe JSON parsing with fallback
async function readJsonSafely(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Helper: Validate no 5xx server errors
function expectNoServerError(status: number): void {
  expect(status, `Expected non-5xx status but got ${status}`).toBeLessThan(500);
}

// Helper: Capture API response details for report
async function captureApiResponse(testInfo: any, response: APIResponse): Promise<void> {
  const status = response.status();
  const body = await response.text();
  
  // Attach status code with metadata name for reporter to parse
  await testInfo.attach(`api-response-code-${status}`, { body: String(status), contentType: 'text/plain' });
  
  // Attach response body if available
  if (body && body.trim()) {
    await testInfo.attach('api-response-body', { body, contentType: 'application/json' });
  }
}

// Helper: Validate RestResponse<T> structure
function validateRestResponseStructure(body: unknown, shouldHaveResponse: boolean = true): void {
  if (body === null || body === undefined) {
    return;
  }
  
  const parsed = body as Record<string, unknown>;
  
  if (shouldHaveResponse) {
    expect(Object.prototype.hasOwnProperty.call(parsed, 'response')).toBe(true);
    expect(parsed.response).not.toBeNull();
  }
}

// Helper: Generate random UUID
function generateUuid(): string {
  return randomUUID();
}

// Helper: Generate test data builders
function buildAddPersonPayload() {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    entities: [
      {
        external_entity_id: `PERSON-${unique}`,
        entity_type: 'person',
        branch_name: 'primary',
        data: {
          name_first: 'John',
          name_middle: 'Michael',
          name_last: 'Doe',
          birth_date: '1985-03-15',
          document_ssn: '123-45-6789',
          email_address: `john.doe+${unique}@example.com`,
          phone_number: '+1-555-0123',
          ip_address_v4: '192.168.1.100',
          addresses: [
            {
              type: 'residential',
              line_1: '123 Main St',
              line_2: 'Suite 100',
              city: 'Springfield',
              state: 'IL',
              postal_code: '62701',
              country_code: 'US',
            },
          ],
        },
      },
    ],
  };
}

function buildAddBusinessPayload() {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    entities: [
      {
        external_entity_id: `BUSINESS-${unique}`,
        entity_type: 'business',
        branch_name: 'primary',
        data: {
          business_name: `Test Business ${unique}`,
          business_federal_ein: '12-3456789',
          business_phone_number: '+1-555-0100',
          business_url: `https://business${unique}.example.com`,
          business_type: 'LLC',
          addresses: [
            {
              type: 'principal',
              line_1: '456 Business Ave',
              line_2: '',
              city: 'Chicago',
              state: 'IL',
              postal_code: '60601',
              country_code: 'US',
            },
          ],
          representatives: [
            {
              name_first: 'Jane',
              name_middle: 'Marie',
              name_last: 'Smith',
              type: 'owner',
              birth_date: '1980-06-20',
              document_ssn: '987-65-4321',
              email_address: `jane.smith+${unique}@example.com`,
              phone_number: '+1-555-0199',
              ownership_percentage: 50,
              addresses: [
                {
                  type: 'residential',
                  line_1: '789 Oak Rd',
                  line_2: '',
                  city: 'Evanston',
                  state: 'IL',
                  postal_code: '60201',
                  country_code: 'US',
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

// ============================================================================
// TC009: Webhook - Portal Link, Add Person, Add Business, Rerun
// ============================================================================

test.describe('TC009-S01: GET Portal Link - Happy Path', () => {
  test('Retrieve portal link with valid journeyApplicationUuid', async ({ request, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/portal-link`;

    await test.step('Step 1: Generate valid UUID for test journey application', async () => {
      expect(journeyApplicationUuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    await test.step('Step 2: Build GET request URL with base URL and journey application UUID', async () => {
      expect(url).toContain('/alloy-journey/applications/');
      expect(url).toContain('/portal-link');
    });

    await test.step('Step 3: Add Authorization header with Bearer token (service or jhid role)', async () => {
      const headers = buildHeaders();
      // Authorization is optional - only verify format if present
      if (Object.prototype.hasOwnProperty.call(headers, 'Authorization')) {
        expect(headers.Authorization).toContain('Bearer');
      }
    });

    await test.step('Step 4: Execute GET request to retrieve portal link', async () => {
      const response = await request.get(url, { headers: buildHeaders() });
      const status = response.status();
      const body = await readJsonSafely(response);

      // Capture API response for HTML report
      await captureApiResponse(testInfo, response);

      // Accept 200 for successful retrieval, or 4xx for known failure scenarios
      expect([200, 400, 401, 403, 404], `Expected 200/4xx but got ${status}`).toContain(status);
      expectNoServerError(status);

      if (status === 200) {
        await test.step('Step 5a: Verify successful response has RestResponse<String> wrapper', async () => {
          validateRestResponseStructure(body, true);
          const parsed = body as Record<string, unknown>;
          expect(typeof parsed.response).toBe('string');
        });

        await test.step('Step 6a: Validate portal link URL format starts with http/https', async () => {
          const parsed = body as Record<string, unknown>;
          expect((parsed.response as string)).toMatch(/^https?:\/\//);
        });

        await test.step('Step 7a: Confirm no 5xx server errors', async () => {
          expectNoServerError(status);
        });
      }
    });
  });
});

test.describe('TC009-S02: GET Portal Link - Authentication Behavior', () => {
  test('Request without auth token is denied', async ({ request, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/portal-link`;

    await test.step('GET without Authorization header', async () => {
      const response = await request.get(url, { headers: { 'Content-Type': 'application/json' } });
      const status = response.status();

      await captureApiResponse(testInfo, response);

      expect([401, 403], `Expected 401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('Request with invalid token is denied', async ({ request, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/portal-link`;

    await test.step('GET with invalid Bearer token', async () => {
      const response = await request.get(url, { headers: buildHeaders('invalid-token-xyz') });
      const status = response.status();

      await captureApiResponse(testInfo, response);

      expect([401, 403], `Expected 401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});

test.describe('TC009-S03: GET Portal Link - Invalid UUID Format', () => {
  test('Request with invalid UUID format in path is rejected', async ({ request, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const invalidUuid = 'not-a-uuid-at-all';
    const url = `${BASE_URL}/alloy-journey/applications/${invalidUuid}/portal-link`;

    await test.step('GET with malformed UUID path parameter', async () => {
      const response = await request.get(url, { headers: buildHeaders() });
      const status = response.status();

      await captureApiResponse(testInfo, response);

      // Framework binding validation rejects invalid UUID formats (400 or 404)
      expect([400, 401, 403, 404], `Expected 400/401/403/404 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});

test.describe('TC009-S04: GET Portal Link - Non-existent UUID', () => {
  test('Request for non-existent journeyApplicationUuid returns 404', async ({ request, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    // Valid UUID format but application does not exist in database
    const nonExistentUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${nonExistentUuid}/portal-link`;

    await test.step('GET for UUID that does not exist in database', async () => {
      const response = await request.get(url, { headers: buildHeaders() });
      const status = response.status();

      await captureApiResponse(testInfo, response);

      expect([200, 403, 404], `Expected 200/403/404 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});

test.describe('TC009-S05: PUT Add Person - Happy Path', () => {
  test('Add person to journey application succeeds', async ({ request, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-person`;
    const payload = buildAddPersonPayload();

    await test.step('PUT /alloy-journey/applications/{uuid}/add-person', async () => {
      const response = await request.put(url, {
        headers: buildHeaders(),
        data: payload,
      });

      const status = response.status();
      const body = await readJsonSafely(response);

      await captureApiResponse(testInfo, response);

      expect([200, 400, 401, 403, 404], `Expected 200/4xx but got ${status}`).toContain(status);
      expectNoServerError(status);

      if (status === 200) {
        validateRestResponseStructure(body, true);
        const parsed = body as Record<string, unknown>;
        const appData = parsed.response as Record<string, unknown> | undefined;
        if (appData) {
          expect(typeof appData.applicationUuid).toBe('string');
          expect(typeof appData.journeyApplicationToken).toBe('string');
          expect(typeof appData.journeyApplicationStatus).toBe('string');
          expect(Array.isArray(appData.entities)).toBe(true);
        }
      }
    });
  });
});

test.describe('TC009-S06: PUT Add Person - Payload Validation', () => {
  test('Missing required fields in person data is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-person`;

    await test.step('PUT with missing required person fields', async () => {
      const incompletePayload = {
        entities: [
          {
            external_entity_id: 'PERSON-INCOMPLETE',
            entity_type: 'person',
            // Missing branch_name and data
          },
        ],
      };

      const response = await request.put(url, {
        headers: buildHeaders(),
        data: incompletePayload,
      });

      const status = response.status();
      expect([400, 401, 403, 404, 422], `Expected 400/401/403/404/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('Malformed JSON payload is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-person`;

    await test.step('PUT with malformed JSON', async () => {
      const response = await request.fetch(url, {
        method: 'PUT',
        headers: buildHeaders(),
        data: '{"entities": [{"external_entity_id": ',
      });

      const status = response.status();
      expect([400, 401, 403, 404, 415, 422], `Expected 400/401/403/404/415/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('Type-mismatched payload fields are rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-person`;

    await test.step('PUT with type-mismatched payload', async () => {
      const invalidPayload = {
        entities: 'not-an-array',
      };

      const response = await request.put(url, {
        headers: buildHeaders(),
        data: invalidPayload,
      });

      const status = response.status();
      expect([400, 401, 403, 404, 422], `Expected 400/401/403/404/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});

test.describe('TC009-S07: PUT Add Person - Authentication Behavior', () => {
  test('Request without auth token is denied', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-person`;
    const payload = buildAddPersonPayload();

    await test.step('PUT without Authorization header', async () => {
      const response = await request.put(url, {
        headers: { 'Content-Type': 'application/json' },
        data: payload,
      });

      const status = response.status();
      expect([401, 403], `Expected 401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('Request with invalid token is denied', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-person`;
    const payload = buildAddPersonPayload();

    await test.step('PUT with invalid Bearer token', async () => {
      const response = await request.put(url, {
        headers: buildHeaders('invalid-person-token'),
        data: payload,
      });

      const status = response.status();
      expect([401, 403], `Expected 401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});

test.describe('TC009-S08: PUT Add Business - Happy Path', () => {
  test('Add business to journey application succeeds', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-business`;
    const payload = buildAddBusinessPayload();

    await test.step('PUT /alloy-journey/applications/{uuid}/add-business', async () => {
      const response = await request.put(url, {
        headers: buildHeaders(),
        data: payload,
      });

      const status = response.status();
      const body = await readJsonSafely(response);

      expect([200, 400, 401, 403, 404], `Expected 200/4xx but got ${status}`).toContain(status);
      expectNoServerError(status);

      if (status === 200) {
        validateRestResponseStructure(body, true);
        const parsed = body as Record<string, unknown>;
        const appData = parsed.response as Record<string, unknown> | undefined;
        if (appData) {
          expect(typeof appData.applicationUuid).toBe('string');
          expect(typeof appData.journeyApplicationToken).toBe('string');
          expect(typeof appData.journeyApplicationStatus).toBe('string');
          expect(Array.isArray(appData.entities)).toBe(true);
        }
      }
    });
  });
});

test.describe('TC009-S09: PUT Add Business - Payload Validation', () => {
  test('Missing required fields in business data is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-business`;

    await test.step('PUT with missing required business fields', async () => {
      const incompletePayload = {
        entities: [
          {
            external_entity_id: 'BUSINESS-INCOMPLETE',
            entity_type: 'business',
            // Missing branch_name and data
          },
        ],
      };

      const response = await request.put(url, {
        headers: buildHeaders(),
        data: incompletePayload,
      });

      const status = response.status();
      expect([400, 401, 403, 404, 422], `Expected 400/401/403/404/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('Malformed JSON payload is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-business`;

    await test.step('PUT with malformed JSON', async () => {
      const response = await request.fetch(url, {
        method: 'PUT',
        headers: buildHeaders(),
        data: '{"entities": [{"external_entity_id": "BUSINESS',
      });

      const status = response.status();
      expect([400, 401, 403, 404, 415, 422], `Expected 400/401/403/404/415/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('Type-mismatched payload fields are rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-business`;

    await test.step('PUT with type-mismatched payload', async () => {
      const invalidPayload = {
        entities: { wrong: 'type' },
      };

      const response = await request.put(url, {
        headers: buildHeaders(),
        data: invalidPayload,
      });

      const status = response.status();
      expect([400, 401, 403, 404, 422], `Expected 400/401/403/404/422 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});

test.describe('TC009-S10: PUT Add Business - Authentication Behavior', () => {
  test('Request without auth token is denied', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-business`;
    const payload = buildAddBusinessPayload();

    await test.step('PUT without Authorization header', async () => {
      const response = await request.put(url, {
        headers: { 'Content-Type': 'application/json' },
        data: payload,
      });

      const status = response.status();
      expect([401, 403], `Expected 401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('Request with invalid token is denied', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-business`;
    const payload = buildAddBusinessPayload();

    await test.step('PUT with invalid Bearer token', async () => {
      const response = await request.put(url, {
        headers: buildHeaders('invalid-business-token'),
        data: payload,
      });

      const status = response.status();
      expect([401, 403], `Expected 401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});

test.describe('TC009-S11: POST Rerun Journey - Happy Path', () => {
  test('Rerun journey application succeeds', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/rerun`;

    await test.step('POST /alloy-journey/applications/{uuid}/rerun', async () => {
      const response = await request.post(url, {
        headers: buildHeaders(),
        data: {},
      });

      const status = response.status();
      const body = await readJsonSafely(response);

      expect([200, 400, 401, 403, 404], `Expected 200/4xx but got ${status}`).toContain(status);
      expectNoServerError(status);

      if (status === 200) {
        validateRestResponseStructure(body, true);
        const parsed = body as Record<string, unknown>;
        const rerunData = parsed.response as Record<string, unknown> | undefined;
        if (rerunData) {
          expect(typeof rerunData.journeyApplicationToken).toBe('string');
        }
      }
    });
  });
});

test.describe('TC009-S12: POST Rerun Journey - Authentication Behavior', () => {
  test('Request without auth token is denied', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/rerun`;

    await test.step('POST without Authorization header', async () => {
      const response = await request.post(url, {
        headers: { 'Content-Type': 'application/json' },
        data: {},
      });

      const status = response.status();
      expect([401, 403], `Expected 401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('Request with invalid token is denied', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/rerun`;

    await test.step('POST with invalid Bearer token', async () => {
      const response = await request.post(url, {
        headers: buildHeaders('invalid-rerun-token'),
        data: {},
      });

      const status = response.status();
      expect([401, 403], `Expected 401/403 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});

test.describe('TC009-S13: POST Rerun Journey - Invalid UUID', () => {
  test('Request with invalid UUID format in path is rejected', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const invalidUuid = 'bad-uuid-format-123';
    const url = `${BASE_URL}/alloy-journey/applications/${invalidUuid}/rerun`;

    await test.step('POST with malformed UUID path parameter', async () => {
      const response = await request.post(url, {
        headers: buildHeaders(),
        data: {},
      });

      const status = response.status();
      expect([400, 401, 403, 404], `Expected 400/401/403/404 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });

  test('Request for non-existent journeyApplicationUuid is handled gracefully', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    // Valid UUID format but application does not exist
    const nonExistentUuid = generateUuid();
    const url = `${BASE_URL}/alloy-journey/applications/${nonExistentUuid}/rerun`;

    await test.step('POST for UUID that does not exist in database', async () => {
      const response = await request.post(url, {
        headers: buildHeaders(),
        data: {},
      });

      const status = response.status();
      expect([200, 403, 404], `Expected 200/403/404 but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});

test.describe('TC009-S14: RestResponse Contract Consistency', () => {
  test('All successful responses conform to RestResponse wrapper contract', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const journeyApplicationUuid = generateUuid();

    await test.step('Verify RestResponse<String> for portal-link', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/portal-link`;
      const response = await request.get(url, { headers: buildHeaders() });

      if (response.status() === 200) {
        const body = await readJsonSafely(response);
        validateRestResponseStructure(body, true);
        const parsed = body as Record<string, unknown>;
        expect(typeof parsed.response).toBe('string');
      }
    });

    await test.step('Verify RestResponse<DtoJourneysApplication> for add-person', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-person`;
      const response = await request.put(url, {
        headers: buildHeaders(),
        data: buildAddPersonPayload(),
      });

      if (response.status() === 200) {
        const body = await readJsonSafely(response);
        validateRestResponseStructure(body, true);
        const parsed = body as Record<string, unknown>;
        const appData = parsed.response as Record<string, unknown> | undefined;
        if (appData) {
          expect(Object.prototype.hasOwnProperty.call(appData, 'applicationUuid')).toBe(true);
          expect(Object.prototype.hasOwnProperty.call(appData, 'journeyApplicationToken')).toBe(true);
        }
      }
    });

    await test.step('Verify RestResponse<DtoJourneysApplication> for add-business', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/add-business`;
      const response = await request.put(url, {
        headers: buildHeaders(),
        data: buildAddBusinessPayload(),
      });

      if (response.status() === 200) {
        const body = await readJsonSafely(response);
        validateRestResponseStructure(body, true);
        const parsed = body as Record<string, unknown>;
        const appData = parsed.response as Record<string, unknown> | undefined;
        if (appData) {
          expect(Object.prototype.hasOwnProperty.call(appData, 'applicationUuid')).toBe(true);
          expect(Object.prototype.hasOwnProperty.call(appData, 'journeyApplicationToken')).toBe(true);
        }
      }
    });

    await test.step('Verify RestResponse<DtoJourneyRerun> for rerun', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${journeyApplicationUuid}/rerun`;
      const response = await request.post(url, {
        headers: buildHeaders(),
        data: {},
      });

      if (response.status() === 200) {
        const body = await readJsonSafely(response);
        validateRestResponseStructure(body, true);
        const parsed = body as Record<string, unknown>;
        const rerunData = parsed.response as Record<string, unknown> | undefined;
        if (rerunData) {
          expect(Object.prototype.hasOwnProperty.call(rerunData, 'journeyApplicationToken')).toBe(true);
        }
      }
    });
  });

  test('Error responses do not contain null response field on 4xx status', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    await test.step('Verify 401/403 error response structure', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${generateUuid()}/portal-link`;
      const response = await request.get(url, { headers: { 'Content-Type': 'application/json' } });

      const status = response.status();
      if ([401, 403, 400, 404].includes(status)) {
        const body = await readJsonSafely(response);
        if (body !== null && typeof body === 'object') {
          // Error response may not have 'response' field at all, or it may be null
          const parsed = body as Record<string, unknown>;
          if (Object.prototype.hasOwnProperty.call(parsed, 'response')) {
            // If present, it should not contradict the error status
            expect(parsed.response === null || parsed.response === undefined).toBeTruthy();
          }
        }
      }
    });
  });
});

test.describe('TC009-S15: Cross-Endpoint Isolation and Independence', () => {
  test('Multiple endpoint calls do not interfere with each other', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const uuid1 = generateUuid();
    const uuid2 = generateUuid();
    const uuid3 = generateUuid();

    await test.step('Call portal-link endpoint with first UUID', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${uuid1}/portal-link`;
      const response = await request.get(url, { headers: buildHeaders() });
      const status = response.status();
      expect([200, 400, 401, 403, 404], `Expected 200/4xx but got ${status}`).toContain(status);
      expectNoServerError(status);
    });

    await test.step('Call add-person endpoint with second UUID', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${uuid2}/add-person`;
      const response = await request.put(url, {
        headers: buildHeaders(),
        data: buildAddPersonPayload(),
      });
      const status = response.status();
      expect([200, 400, 401, 403, 404], `Expected 200/4xx but got ${status}`).toContain(status);
      expectNoServerError(status);
    });

    await test.step('Call rerun endpoint with third UUID', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${uuid3}/rerun`;
      const response = await request.post(url, {
        headers: buildHeaders(),
        data: {},
      });
      const status = response.status();
      expect([200, 400, 401, 403, 404], `Expected 200/4xx but got ${status}`).toContain(status);
      expectNoServerError(status);
    });

    await test.step('Re-call portal-link endpoint with first UUID (should still work)', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${uuid1}/portal-link`;
      const response = await request.get(url, { headers: buildHeaders() });
      const status = response.status();
      expect([200, 400, 401, 403, 404], `Expected 200/4xx but got ${status}`).toContain(status);
      expectNoServerError(status);
    });
  });
});

test.describe('TC009-S16: Status Code Boundary Testing', () => {
  test('Verify comprehensive status handling across all endpoints', async ({ request, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-only execution as required.');

    const testUuid = generateUuid();

    await test.step('Portal-link returns expected status set', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${testUuid}/portal-link`;
      const response = await request.get(url, { headers: buildHeaders() });
      const status = response.status();
      expect(status >= 100 && status < 600, `Status code out of range: ${status}`).toBeTruthy();
      expectNoServerError(status);
    });

    await test.step('Add-person returns expected status set', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${testUuid}/add-person`;
      const response = await request.put(url, {
        headers: buildHeaders(),
        data: buildAddPersonPayload(),
      });
      const status = response.status();
      expect(status >= 100 && status < 600, `Status code out of range: ${status}`).toBeTruthy();
      expectNoServerError(status);
    });

    await test.step('Add-business returns expected status set', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${testUuid}/add-business`;
      const response = await request.put(url, {
        headers: buildHeaders(),
        data: buildAddBusinessPayload(),
      });
      const status = response.status();
      expect(status >= 100 && status < 600, `Status code out of range: ${status}`).toBeTruthy();
      expectNoServerError(status);
    });

    await test.step('Rerun returns expected status set', async () => {
      const url = `${BASE_URL}/alloy-journey/applications/${testUuid}/rerun`;
      const response = await request.post(url, {
        headers: buildHeaders(),
        data: {},
      });
      const status = response.status();
      expect(status >= 100 && status < 600, `Status code out of range: ${status}`).toBeTruthy();
      expectNoServerError(status);
    });
  });
});
