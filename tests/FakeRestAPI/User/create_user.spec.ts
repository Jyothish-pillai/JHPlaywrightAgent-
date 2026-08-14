// File: tests/FakeRestAPI/User/create_user.spec.ts
// spec: specs/FakeRestAPI/User/create_user-test-plan.md
// TEST_DATA_STRATEGY=inline
//
// Follows the Execute → Capture → Validate contract:
//   PHASE 1+2  callApi() executes the request and captures all evidence
//   PHASE 3    every later step is a pure assertion over the returned snapshot
// See tests/support/api-evidence.ts for why capture must precede validation.

import { test, expect } from '@playwright/test';
import { callApi, type ApiSnapshot } from '../../support/api-evidence';

// ============================================================================
// TEST DATA CONSTANTS - All test data embedded inline (no external files)
// ============================================================================

// Application Configuration
const BASE_URL = 'https://fakerestapi.azurewebsites.net';
const USERS_ENDPOINT = '/api/v1/Users';
const REQUEST_CONTENT_TYPE = 'application/json';
const REQUEST_ACCEPT = 'application/json';

// Request Payload Values
const REQUEST_USER_ID = 0;
const REQUEST_USER_NAME = 'testuser';
const REQUEST_PASSWORD = 'Test@123';

// Expected Response Values (observed live — see test plan "Live Observations")
const EXPECTED_STATUS = 200;
const EXPECTED_CONTENT_TYPE = 'application/json';
const EXPECTED_RESPONSE_KEYS = ['id', 'userName', 'password'];

// Grouped view of the same inline data for readability
const TEST_DATA = {
  url: `${BASE_URL}${USERS_ENDPOINT}`,
  requestHeaders: {
    'Content-Type': REQUEST_CONTENT_TYPE,
    Accept: REQUEST_ACCEPT,
  },
  requestPayload: {
    id: REQUEST_USER_ID,
    userName: REQUEST_USER_NAME,
    password: REQUEST_PASSWORD,
  },
};

interface CreatedUser {
  id: number;
  userName: string;
  password: string;
}

// ============================================================================
// TEST SUITE: Create a New User on the FakeRestAPI Users API
// ============================================================================
test.describe('Create a New User', () => {
  let api: ApiSnapshot;
  let createdUser: CreatedUser;

  test('should successfully create a user with valid data and return the created user details', async ({ request }) => {
    // ── PHASE 1 + 2: EXECUTE AND CAPTURE ────────────────────────────────────
    await test.step('Send a POST request to create a new user with a valid JSON payload', async () => {
      api = await callApi(request, {
        method: 'POST',
        url: TEST_DATA.url,
        headers: TEST_DATA.requestHeaders,
        data: TEST_DATA.requestPayload,
        label: 'Create a user',
      });

      expect(api.url).toBe(TEST_DATA.url);
    });

    // ── PHASE 3: VALIDATE (pure assertions over the captured snapshot) ───────
    await test.step('Verify the API responds with a successful HTTP status 200 OK', async () => {
      expect(api.status).toBe(EXPECTED_STATUS);
      expect(api.ok).toBe(true);
    });

    await test.step('Verify the response Content-Type header is application/json', async () => {
      // Live value carries extra suffixes (`; charset=utf-8; v=1.0`), so match by
      // containment rather than strict equality.
      const contentType = api.header('content-type');
      expect(contentType).toBeDefined();
      expect(contentType).toContain(EXPECTED_CONTENT_TYPE);
    });

    await test.step('Read and parse the created user from the JSON response body', async () => {
      createdUser = api.json<CreatedUser>();

      expect(createdUser).toBeDefined();
      expect(typeof createdUser).toBe('object');
    });

    await test.step('Verify the response contains an id field returned as an integer', async () => {
      expect(Object.prototype.hasOwnProperty.call(createdUser, 'id')).toBe(true);
      expect(typeof createdUser.id).toBe('number');
      expect(Number.isInteger(createdUser.id)).toBe(true);
    });

    await test.step('Verify the returned id echoes the id submitted in the request', async () => {
      // Observed live behaviour: the endpoint echoes the submitted id verbatim
      // (posting id 999 returns 999); it does not assign one server-side.
      expect(createdUser.id).toBe(REQUEST_USER_ID);
    });

    await test.step('Verify the returned userName matches the submitted userName', async () => {
      expect(Object.prototype.hasOwnProperty.call(createdUser, 'userName')).toBe(true);
      expect(typeof createdUser.userName).toBe('string');
      expect(createdUser.userName).toBe(REQUEST_USER_NAME);
    });

    await test.step('Verify the returned password matches the submitted password', async () => {
      expect(Object.prototype.hasOwnProperty.call(createdUser, 'password')).toBe(true);
      expect(typeof createdUser.password).toBe('string');
      expect(createdUser.password).toBe(REQUEST_PASSWORD);
    });

    await test.step('Verify the response follows the expected user schema with no missing or unexpected fields', async () => {
      for (const field of EXPECTED_RESPONSE_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(createdUser, field)).toBe(true);
      }
      expect(Object.keys(createdUser).sort()).toEqual([...EXPECTED_RESPONSE_KEYS].sort());
    });
  });
});
