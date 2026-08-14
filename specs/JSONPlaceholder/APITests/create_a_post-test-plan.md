# Test Plan: Create a Post

## Test Summary

This test plan covers automated testing of the JSONPlaceholder API's `POST /posts` endpoint used to create a new post and return the created resource.

**Application:** JSONPlaceholder
**Functionality:** APITests
**Story:** create_a_post
**Test Environment:** QA
**Browser:** N/A (API Testing — executed under the Chrome-only `chromium` project)
**Test Data Strategy:** inline (all data embedded in the spec file)

---

## API Endpoint Details

**Base URL:** https://jsonplaceholder.typicode.com
**Endpoint:** /posts
**Method:** POST
**Request Content-Type:** application/json

**Request Body:**

```json
{
  "title": "API Testing Post",
  "body": "This post was created for API automation testing.",
  "userId": 1
}
```

---

## Live Observations (captured from the live endpoint before writing this plan)

A real `POST` request was issued against the live endpoint. Everything below was directly observed, not assumed:

| Observation | Actual value seen |
|---|---|
| Status line | `HTTP/1.1 201 Created` |
| `Content-Type` | `application/json; charset=utf-8` |
| `Location` header | `https://jsonplaceholder.typicode.com/posts/101` |
| `Content-Length` | `124` |
| Other headers present | `Cache-Control: no-cache`, `etag`, `x-powered-by: Express`, `server: cloudflare`, `x-ratelimit-limit: 1000` |
| Response body | `{ "title": "API Testing Post", "body": "This post was created for API automation testing.", "userId": 1, "id": 101 }` |
| Response time | Sub-second (< 1s) |

**Key behaviours observed:**

1. The endpoint **echoes back** the submitted `title`, `body`, and `userId` values verbatim.
2. The server **assigns** the `id` field; it is appended to the payload (appears last in the JSON body).
3. The assigned `id` is always `101` because JSONPlaceholder is a mock/fake API — it does **not** persist created resources. A subsequent `GET /posts/101` returns `404`, therefore **no read-back verification step is included** in this plan.
4. `userId` is returned as a JSON **number** (`1`), not a string.
5. The `Location` response header points at the newly created resource URI and is exposed via `access-control-expose-headers`.

---

## Test Cases

### TC001: Successfully Create a Post with All Validations

**Objective:** Verify that the API accepts a valid post payload, returns `201 Created`, and returns the created post details with correct field values and data types.

**Preconditions:**

- Network access to `https://jsonplaceholder.typicode.com` is available.
- No authentication or credentials are required.

**Test Steps:**

| # | Test Step | Expected Result (as observed) |
|---|---|---|
| 1 | Send a `POST` request to `https://jsonplaceholder.typicode.com/posts` with header `Content-Type: application/json` and the request body above | Request is dispatched; a response object is returned for the requested URL |
| 2 | Validate HTTP status code | Status is `201`; response is reported as OK/created |
| 3 | Validate `Content-Type` response header | Header contains `application/json` |
| 4 | Parse the response body as JSON | Body parses into a valid JSON object |
| 5 | Validate the `id` field | `id` property exists and its value is of type `number` |
| 6 | Validate the `title` field | `title` equals `API Testing Post` and is of type `string` |
| 7 | Validate the `body` field | `body` equals `This post was created for API automation testing.` and is of type `string` |
| 8 | Validate the `userId` field | `userId` equals `1` and is of type `number` |
| 9 | Validate all required fields are present | Response contains exactly the keys `id`, `title`, `body`, `userId` |
| 10 | Validate the `Location` header identifies the created resource | `location` header is present and ends with `/posts/{id}` matching the returned `id` |

**Expected Results:**

- HTTP Status: `201 Created`
- Response headers include `Content-Type: application/json; charset=utf-8`
- Response body is valid JSON with structure:
  ```json
  {
    "title": "API Testing Post",
    "body": "This post was created for API automation testing.",
    "userId": 1,
    "id": 101
  }
  ```
- All submitted values are echoed back unchanged
- The server-assigned `id` is a number

**Test Data (inline, embedded in the spec):**

| Key | Value | Type |
|---|---|---|
| `BASE_URL` | `https://jsonplaceholder.typicode.com` | string |
| `POSTS_ENDPOINT` | `/posts` | string |
| `REQUEST_TITLE` | `API Testing Post` | string |
| `REQUEST_BODY_TEXT` | `This post was created for API automation testing.` | string |
| `REQUEST_USER_ID` | `1` | number |
| `EXPECTED_STATUS` | `201` | number |
| `EXPECTED_CONTENT_TYPE` | `application/json` | string |

**Assertions Required (minimum 5 — 10 planned):**

1. Status code equals `201`
2. `Content-Type` header contains `application/json`
3. Response body parses as a JSON object
4. `response.id` is of type `number`
5. `response.title` equals `API Testing Post` and is a `string`
6. `response.body` equals the expected body text and is a `string`
7. `response.userId` equals `1` and is a `number`
8. All four required keys are present in the response
9. No unexpected extra keys are returned
10. `location` header references `/posts/{id}` matching the returned `id`

**Pass Criteria:**

- All assertions pass without errors
- Response time is acceptable (< 5 seconds)
- No network errors or timeouts

---

## Coverage Summary

| Acceptance Criterion | Test Case | Status |
|---|---|---|
| HTTP status 201 Created | TC001 (Step 2) | ✓ Covered |
| Content-Type contains application/json | TC001 (Step 3) | ✓ Covered |
| Response contains `id` field | TC001 (Step 5) | ✓ Covered |
| `id` is of type number | TC001 (Step 5) | ✓ Covered |
| Response contains `title` field | TC001 (Step 6) | ✓ Covered |
| `title` equals `API Testing Post` | TC001 (Step 6) | ✓ Covered |
| `title` is of type string | TC001 (Step 6) | ✓ Covered |
| Response contains `body` field | TC001 (Step 7) | ✓ Covered |
| `body` equals expected sentence | TC001 (Step 7) | ✓ Covered |
| `body` is of type string | TC001 (Step 7) | ✓ Covered |
| Response contains `userId` field | TC001 (Step 8) | ✓ Covered |
| `userId` equals 1 | TC001 (Step 8) | ✓ Covered |
| `userId` is of type number | TC001 (Step 8) | ✓ Covered |

All 13 acceptance criteria are covered by the single positive test case, per the "ONE positive test case only" requirement.

---

## Notes

- API test using Playwright's `request` fixture — no browser page interaction is required, and no UI locators are involved (so locator auto-healing is not applicable to this story).
- Executed with the Chrome-only strategy (`--project=chromium`, `channel: chrome`).
- Every action and assertion is wrapped in `test.step()` with plain-English titles so the HTML report reads clearly for non-technical stakeholders.
- Request/response metadata is attached via `test.info().attach()` using the `api-request-*` / `api-response-*` attachment names that `reporters/final-html-reporter.cjs` consumes, so the final report exposes clickable Request Body / Response Body views.
- Test data is embedded inline (`TEST_DATA_STRATEGY=inline`) — no Excel workbook is created, read, or modified.
- **Known API limitation:** JSONPlaceholder does not persist created posts. The returned `id` is always `101` and a follow-up `GET /posts/101` returns `404`. The plan therefore asserts `id` is a number rather than hardcoding `101` or verifying persistence.
