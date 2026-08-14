# Test Plan: Retrieve a Post by ID

## Test Summary

This test plan covers automated testing of the JSONPlaceholder API's POST endpoint used to retrieve a specific post by its ID.

**Application:** JSONPlaceholder
**Functionality:** APITests
**Story:** retrieve_post_by_id
**Test Environment:** QA
**Browser:** N/A (API Testing)

---

## API Endpoint Details

**Base URL:** https://jsonplaceholder.typicode.com
**Endpoint:** /posts/1
**Method:** GET
**Content-Type:** application/json

---

## Test Cases

### TC001: Successfully Retrieve Post by ID with All Validations

**Objective:** Verify that the API successfully retrieves a post with ID 1 and returns all required fields with correct data types and values.

**Test Steps:**

1. Make a GET request to `https://jsonplaceholder.typicode.com/posts/1`
2. Verify HTTP status code is `200`
3. Verify response `Content-Type` header contains `application/json`
4. Verify response contains an `id` field with value `1`
5. Verify response contains a `userId` field that is a number
6. Verify response contains a non-empty `title` field that is a string
7. Verify response contains a non-empty `body` field that is a string

**Expected Results:**

- HTTP Status: 200 OK
- Response headers include `Content-Type: application/json`
- Response body is valid JSON with structure:
  ```json
  {
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
    "body": "quia et suscipit..."
  }
  ```
- All fields are present and of the correct data type
- Both `title` and `body` fields contain non-empty string values

**Test Data:**

- Post ID: `1`
- Expected User ID: `1` (number)
- Expected ID: `1` (number)

**Assertions Required (Minimum 5):**

1. Status code equals 200
2. Content-Type header contains application/json
3. Response.id equals 1
4. Response.userId is a number
5. Response.title is non-empty string
6. Response.body is non-empty string

**Pass Criteria:**

- All assertions pass without errors
- Response time is acceptable (< 5 seconds)
- No network errors or timeouts

---

## Coverage Summary

| Acceptance Criterion | Test Case | Status |
|---|---|---|
| HTTP status 200 | TC001 | ✓ Covered |
| Content-Type contains application/json | TC001 | ✓ Covered |
| Response contains `id` field | TC001 | ✓ Covered |
| `id` field equals 1 | TC001 | ✓ Covered |
| Response contains `userId` field | TC001 | ✓ Covered |
| `userId` is a number | TC001 | ✓ Covered |
| Response contains non-empty `title` | TC001 | ✓ Covered |
| Response contains non-empty `body` | TC001 | ✓ Covered |
| `title` is a string | TC001 | ✓ Covered |
| `body` is a string | TC001 | ✓ Covered |

---

## Notes

- This is an API test using Playwright's request fixture
- No browser interaction required
- Test will use TypeScript with Playwright Test framework
- All assertions must be meaningful and not just check status code
- Test data is embedded inline (TEST_DATA_STRATEGY=inline)
