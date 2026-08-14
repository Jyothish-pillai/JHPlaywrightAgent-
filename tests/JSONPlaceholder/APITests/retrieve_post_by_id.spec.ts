// File: tests/JSONPlaceholder/APITests/retrieve_post_by_id.spec.ts
// spec: specs/JSONPlaceholder/APITests/retrieve_post_by_id-test-plan.md
// TEST_DATA_STRATEGY=inline
//
// Follows the Execute → Capture → Validate contract:
//   PHASE 1+2  callApi() executes the request and captures all evidence
//   PHASE 3    every later step is a pure assertion over the returned snapshot
// See tests/support/api-evidence.ts for why capture must precede validation.

import { test, expect } from '@playwright/test';
import { callApi, type ApiSnapshot } from '../../support/api-evidence';

// ============================================================================
// TEST DATA CONSTANTS - All test data embedded inline
// ============================================================================
const TEST_DATA = {
  BASE_URL: 'https://jsonplaceholder.typicode.com',
  POST_ID: 1,
  EXPECTED_STATUS: 200,
  EXPECTED_CONTENT_TYPE: 'application/json',
};

interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

// ============================================================================
// TEST SUITE: Retrieve Post by ID from JSONPlaceholder API
// ============================================================================
test.describe('Retrieve Post by ID', () => {
  let api: ApiSnapshot;
  let responseData: Post;

  test('should successfully retrieve post by ID with complete validation', async ({ request }) => {
    // ── PHASE 1 + 2: EXECUTE AND CAPTURE ────────────────────────────────────
    await test.step('Send GET request to retrieve post by ID', async () => {
      api = await callApi(request, {
        method: 'GET',
        url: `${TEST_DATA.BASE_URL}/posts/${TEST_DATA.POST_ID}`,
        label: `Retrieve post ${TEST_DATA.POST_ID}`,
      });

      expect(api.url).toBe(`${TEST_DATA.BASE_URL}/posts/${TEST_DATA.POST_ID}`);
    });

    // ── PHASE 3: VALIDATE (pure assertions over the captured snapshot) ───────
    await test.step('Validate HTTP status code is 200', async () => {
      expect(api.status).toBe(TEST_DATA.EXPECTED_STATUS);
    });

    await test.step('Validate Content-Type header contains application/json', async () => {
      expect(api.header('content-type')).toContain(TEST_DATA.EXPECTED_CONTENT_TYPE);
    });

    await test.step('Parse response JSON body', async () => {
      responseData = api.json<Post>();

      expect(responseData).toBeDefined();
      expect(typeof responseData).toBe('object');
    });

    await test.step('Validate response id field equals 1', async () => {
      expect(responseData.id).toBe(TEST_DATA.POST_ID);
    });

    await test.step('Validate userId field is a number', async () => {
      expect(typeof responseData.userId).toBe('number');
      expect(responseData.userId).toBeGreaterThan(0);
    });

    await test.step('Validate title field is a non-empty string', async () => {
      expect(typeof responseData.title).toBe('string');
      expect(responseData.title.length).toBeGreaterThan(0);
      expect(responseData.title).toBeTruthy();
    });

    await test.step('Validate body field is a non-empty string', async () => {
      expect(typeof responseData.body).toBe('string');
      expect(responseData.body.length).toBeGreaterThan(0);
      expect(responseData.body).toBeTruthy();
    });

    await test.step('Validate response headers indicate successful delivery', async () => {
      expect(api.headers).toBeDefined();
      expect(Object.keys(api.headers).length).toBeGreaterThan(0);
    });

    await test.step('Verify all required fields are present in response', async () => {
      const requiredFields = ['userId', 'id', 'title', 'body'];
      for (const field of requiredFields) {
        expect(Object.prototype.hasOwnProperty.call(responseData, field)).toBe(true);
      }
    });
  });
});
