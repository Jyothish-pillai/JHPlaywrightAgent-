// File: tests/JSONPlaceholder/APITests/create_a_post.spec.ts
// spec: specs/JSONPlaceholder/APITests/create_a_post-test-plan.md
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
const BASE_URL = 'https://jsonplaceholder.typicode.com';
const POSTS_ENDPOINT = '/posts';
const REQUEST_CONTENT_TYPE = 'application/json';

// Request Payload Values
const REQUEST_TITLE = 'API Testing Post';
const REQUEST_BODY_TEXT = 'This post was created for API automation testing.';
const REQUEST_USER_ID = 1;

// Expected Response Values
const EXPECTED_STATUS = 201;
const EXPECTED_CONTENT_TYPE = 'application/json';
const EXPECTED_RESPONSE_KEYS = ['id', 'title', 'body', 'userId'];

// Grouped view of the same inline data for readability
const TEST_DATA = {
  url: `${BASE_URL}${POSTS_ENDPOINT}`,
  requestHeaders: { 'Content-Type': REQUEST_CONTENT_TYPE },
  requestPayload: {
    title: REQUEST_TITLE,
    body: REQUEST_BODY_TEXT,
    userId: REQUEST_USER_ID,
  },
};

interface CreatedPost {
  id: number;
  title: string;
  body: string;
  userId: number;
}

// ============================================================================
// TEST SUITE: Create a Post on the JSONPlaceholder Posts API
// ============================================================================
test.describe('Create a Post', () => {
  let api: ApiSnapshot;
  let createdPost: CreatedPost;

  test('should successfully create a post and return the created post details', async ({ request }) => {
    // ── PHASE 1 + 2: EXECUTE AND CAPTURE ────────────────────────────────────
    await test.step('Send a POST request to create a new post with a valid JSON payload', async () => {
      api = await callApi(request, {
        method: 'POST',
        url: TEST_DATA.url,
        headers: TEST_DATA.requestHeaders,
        data: TEST_DATA.requestPayload,
        label: 'Create a post',
      });

      expect(api.url).toBe(TEST_DATA.url);
    });

    // ── PHASE 3: VALIDATE (pure assertions over the captured snapshot) ───────
    await test.step('Verify the API responds with HTTP status 201 Created', async () => {
      expect(api.status).toBe(EXPECTED_STATUS);
      expect(api.ok).toBe(true);
    });

    await test.step('Verify the response Content-Type header is application/json', async () => {
      const contentType = api.header('content-type');
      expect(contentType).toBeDefined();
      expect(contentType).toContain(EXPECTED_CONTENT_TYPE);
    });

    await test.step('Read and parse the created post from the JSON response body', async () => {
      createdPost = api.json<CreatedPost>();

      expect(createdPost).toBeDefined();
      expect(typeof createdPost).toBe('object');
    });

    await test.step('Verify the server assigned a numeric id to the newly created post', async () => {
      expect(Object.prototype.hasOwnProperty.call(createdPost, 'id')).toBe(true);
      expect(typeof createdPost.id).toBe('number');
      expect(Number.isFinite(createdPost.id)).toBe(true);
      expect(createdPost.id).toBeGreaterThan(0);
    });

    await test.step('Verify the returned title matches the submitted title', async () => {
      expect(typeof createdPost.title).toBe('string');
      expect(createdPost.title).toBe(REQUEST_TITLE);
    });

    await test.step('Verify the returned body text matches the submitted body text', async () => {
      expect(typeof createdPost.body).toBe('string');
      expect(createdPost.body).toBe(REQUEST_BODY_TEXT);
    });

    await test.step('Verify the returned userId matches the submitted userId', async () => {
      expect(typeof createdPost.userId).toBe('number');
      expect(createdPost.userId).toBe(REQUEST_USER_ID);
    });

    await test.step('Verify the response contains all required post fields and no unexpected fields', async () => {
      for (const field of EXPECTED_RESPONSE_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(createdPost, field)).toBe(true);
      }
      expect(Object.keys(createdPost).sort()).toEqual([...EXPECTED_RESPONSE_KEYS].sort());
    });

    await test.step('Verify the Location header points to the newly created post resource', async () => {
      const location = api.header('location');
      expect(location).toBeDefined();
      // Observed live behaviour: location ends with /posts/{id} for the returned id
      expect(location).toContain(`${POSTS_ENDPOINT}/${createdPost.id}`);
    });
  });
});
