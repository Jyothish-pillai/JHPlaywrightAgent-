# Test Plan: Create a New User with Valid Data

## Test Summary

This test plan covers automated testing of the FakeRestAPI `POST /api/v1/Users` endpoint used to create a new user with a valid username and password.

**Application:** FakeRestAPI
**Functionality:** User
**Story:** create_user
**Test Environment:** QA
**Browser:** N/A (API Testing — executed under the Chrome-only `chromium` project)
**Test Data Strategy:** inline (all data embedded in the spec file)
**Run Timestamp:** 20260814_110338

---

## API Endpoint Details

**Base URL:** https://fakerestapi.azurewebsites.net
**Endpoint:** /api/v1/Users
**Full URL:** https://fakerestapi.azurewebsites.net/api/v1/Users
**Method:** POST
**Authentication:** Not required
**Request Content-Type:** application/json
**Accept:** application/json

**Request Body:**

```json
{
  "id": 0,
  "userName": "testuser",
  "password": "Test@123"
}
```

---

## Live Observations (captured from the live endpoint before writing this plan)

Three real `POST` requests were issued against the live endpoint, plus one read-back `GET`. Everything below was directly observed, not assumed.

| Observation | Actual value seen |
|---|---|
| Status line | `HTTP/1.1 200 OK` — **not** `201 Created` |
| `Content-Type` | `application/json; charset=utf-8; v=1.0` |
| `Server` | `Kestrel` |
| `api-supported-versions` | `1.0` |
| `Transfer-Encoding` | `chunked` (no `Content-Length` header) |
| `Location` header | **Absent** — the endpoint does not return one |
| Response body | `{"id":0,"userName":"testuser","password":"Test@123"}` |
| Response time | Sub-second (< 1s) |
| Read-back `GET /api/v1/Users/0` | `404 Not Found` |
| Repeat POST with `"id": 999` | Response body echoed `{"id":999,...}` |

**Key behaviours observed:**

1. The endpoint returns **`200 OK`**, not `201 Created`. Acceptance Criterion 4 says "a successful HTTP status code" — the plan therefore asserts the actually-observed `200`.
2. The response **echoes the entire request payload verbatim**, including `id`. The server does **not** assign an id: posting `"id": 0` returns `0`, posting `"id": 999` returns `999`. Asserting `id === 0` is therefore a valid assertion against observed echo behaviour, not a mock-only literal.
3. `id` is returned as a JSON **number**, `userName` and `password` as JSON **strings**.
4. The `Content-Type` carries **two** suffixes — `charset=utf-8` and `v=1.0`. Assertions must use `toContain('application/json')`, never strict equality.
5. There is **no `Location` header** and no `Content-Length` (the response is chunked), so no assertions are planned against either.
6. The API is a **mock and does not persist** created users — a follow-up `GET /api/v1/Users/0` returns `404`. **No read-back verification step is included** in this plan.
7. The response object contains **exactly three keys**: `id`, `userName`, `password`. No `createdAt`, `_links`, or wrapper envelope.

---

## Test Cases

### TC001: Successfully Create a User with All Validations

**Objective:** Verify that the API accepts a valid user payload, returns a successful HTTP status, and returns the created user details with correct field values, data types, and schema shape.

**Preconditions:**

- Network access to `https://fakerestapi.azurewebsites.net` is available.
- No authentication or credentials are required.

**Test Steps:**

| # | Test Step | Expected Result (as observed) |
|---|---|---|
| 1 | Send a `POST` request to `https://fakerestapi.azurewebsites.net/api/v1/Users` with headers `Content-Type: application/json` and `Accept: application/json` and the request body above | Request is dispatched to the expected URL; a response object is returned |
| 2 | Validate the HTTP status code is successful | Status is `200`; the response is reported as OK |
| 3 | Validate the `Content-Type` response header | Header contains `application/json` (full observed value: `application/json; charset=utf-8; v=1.0`) |
| 4 | Parse the response body as JSON | Body parses into a valid JSON object |
| 5 | Validate the `id` field is present and an integer | `id` property exists, is of type `number`, and is an integer |
| 6 | Validate the `id` value echoes the submitted id | `id` equals `0`, the value submitted in the request |
| 7 | Validate the `userName` field | `userName` exists, is of type `string`, and equals `testuser` |
| 8 | Validate the `password` field | `password` exists, is of type `string`, and equals `Test@123` |
| 9 | Validate the response follows the expected user schema | Response contains exactly the keys `id`, `userName`, `password` — no missing and no unexpected fields |

**Expected Results:**

- HTTP Status: `200 OK`
- Response headers include `Content-Type: application/json; charset=utf-8; v=1.0`
- Response body is valid JSON with structure:
  ```json
  {
    "id": 0,
    "userName": "testuser",
    "password": "Test@123"
  }
  ```
- All submitted values are echoed back unchanged
- The `id` is returned as an integer

**Test Data (inline, embedded in the spec):**

| Key | Value | Type |
|---|---|---|
| `BASE_URL` | `https://fakerestapi.azurewebsites.net` | string |
| `USERS_ENDPOINT` | `/api/v1/Users` | string |
| `REQUEST_USER_ID` | `0` | number |
| `REQUEST_USER_NAME` | `testuser` | string |
| `REQUEST_PASSWORD` | `Test@123` | string |
| `EXPECTED_STATUS` | `200` | number |
| `EXPECTED_CONTENT_TYPE` | `application/json` | string |
| `EXPECTED_RESPONSE_KEYS` | `['id', 'userName', 'password']` | string[] |

**Assertions Required (minimum 5 — 8 planned, matching the story's Assertions list):**

1. Status code equals `200` and the response is OK
2. `Content-Type` header contains `application/json`
3. Response body parses as a JSON object and contains `id`
4. `response.id` is of type `number` and is an integer
5. Response contains `userName`, and `userName` equals `testuser`
6. Response contains `password`, and `password` equals `Test@123`
7. `response.id` echoes the submitted value `0`
8. Response keys are exactly `id`, `userName`, `password` (schema conformance)

**Pass Criteria:**

- All assertions pass without errors
- Response time is acceptable (< 5 seconds)
- No network errors or timeouts

---

## Coverage Summary

| Acceptance Criterion | Test Case | Status |
|---|---|---|
| 1. API accepts `POST` to `/api/v1/Users` | TC001 (Step 1) | ✓ Covered |
| 2. Request contains valid JSON | TC001 (Step 1) | ✓ Covered |
| 3. Request contains `id`, `userName`, `password` | TC001 (Step 1) | ✓ Covered |
| 4. API returns a successful HTTP status code | TC001 (Step 2) | ✓ Covered |
| 5. Response has `application/json` content type | TC001 (Step 3) | ✓ Covered |
| 6. Response contains the `id` field | TC001 (Step 5) | ✓ Covered |
| 7. Response `id` is an integer | TC001 (Step 5) | ✓ Covered |
| 8. Response contains the `userName` field | TC001 (Step 7) | ✓ Covered |
| 9. Response `userName` matches the request | TC001 (Step 7) | ✓ Covered |
| 10. Response contains the `password` field | TC001 (Step 8) | ✓ Covered |
| 11. Response `password` matches the request | TC001 (Step 8) | ✓ Covered |
| 12. Response follows the expected user schema | TC001 (Step 9) | ✓ Covered |

All 12 acceptance criteria are covered by the single positive test case, per the "ONE positive test case only" requirement.

---

## Notes

- API test using Playwright's `request` fixture — no browser page interaction is required, and no UI locators are involved, so locator auto-healing is not applicable to this story. Healing for this story targets transport and contract drift (status, content-type, schema).
- Every HTTP call goes through `callApi()` from `tests/support/api-evidence.ts`, satisfying the API Test Evidence Capture Contract (Execute → Capture → Validate). The spec makes no direct `request.*` calls and no manual `attach()` calls.
- Executed with the Chrome-only strategy (`--project=chromium`, `channel: chrome`).
- Every action and assertion is wrapped in `test.step()` with plain-English titles so the HTML report reads clearly for non-technical stakeholders.
- Test data is embedded inline (`TEST_DATA_STRATEGY=inline`) — no Excel workbook is created, read, or modified.
- **Known API limitation:** FakeRestAPI does not persist created users. The response is a verbatim echo of the request and a follow-up `GET /api/v1/Users/0` returns `404`. The plan therefore includes no persistence/read-back step.
- **Deviation from the story text:** the story's Request/Response section implies a created resource; the live endpoint returns `200` rather than `201` and assigns no id. The plan asserts what was actually observed.
