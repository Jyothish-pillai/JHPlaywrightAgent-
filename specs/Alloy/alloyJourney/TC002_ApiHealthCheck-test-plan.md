# Test Plan: TC002_ApiHealthCheck - Verify Alloy Service Health Endpoint

**Application:** Alloy  
**Application URL:** http://172.25.1.45:32122/  
**Test Scope:** Root service health endpoint reachability and exact response validation  
**Execution Mode:** Chrome only  
**Test Data Strategy:** inline  
**Timestamp:** 20260804_095327  

## Test Environment

- **Application Base URL:** http://172.25.1.45:32122/
- **Endpoint Path:** /
- **Request Method:** GET
- **Execution Model:** Playwright API test using request context
- **Test Browser:** Chrome (Chromium)
- **Environment:** Network-accessible Alloy service endpoint

## Test Data

| Field | Value |
|---|---|
| Base URL | http://172.25.1.45:32122/ |
| Endpoint Path | / |
| Full Endpoint URL | http://172.25.1.45:32122/ |
| HTTP Method | GET |
| Request Body | None |
| Additional Test Data | None |
| Expected HTTP Status | 200 |
| Expected success | true |
| Expected resultCode | OK |
| Expected message | empty string |
| Expected errors | [] |
| Expected warnings | [] |
| Expected infos | [] |
| Expected payload | Welcome to the Alloy Service! |

## Preconditions

- The Alloy service is running and reachable at http://172.25.1.45:32122/
- The test runner has network access to the target host and port
- Chrome/Chromium is the active execution project in the framework
- No authentication is required for the root endpoint
- No request payload, seeded data, or external fixture data is required

---

## Test Scenarios

### TC002 - Verify Service Health Endpoint Returns Expected Success Payload

**Test Case ID:** TC-OA-API-002  
**Objective:** Verify that the root Alloy service endpoint is reachable through a GET request and returns the exact expected JSON payload.

#### Steps

1. **Initialize API test context**
   - Start the Chrome-only Playwright test run
   - Use the Playwright request fixture for API execution
   - Expected Result: The request context is ready to send HTTP requests

2. **Send GET request to the root endpoint**
   - Send a GET request to http://172.25.1.45:32122/
   - Do not include a request body
   - Expected Result: The request completes without transport or timeout errors

3. **Verify HTTP response status**
   - Check the HTTP response status code
   - Expected Result: Status code is 200

4. **Verify response body content**
   - Parse the response as JSON
   - Verify the response body exactly matches the expected payload below
   - Expected Result: The response object matches all expected fields and values exactly

```json
{
  "success": true,
  "resultCode": "OK",
  "message": "",
  "errors": [],
  "warnings": [],
  "infos": [],
  "payload": "Welcome to the Alloy Service!"
}
```

#### Expected Results

- The endpoint is reachable at http://172.25.1.45:32122/
- The GET request succeeds without a request body
- The response status is 200
- The response body exactly matches the expected contract
- No authentication challenge or external test data dependency occurs

---

## Test Execution Notes

- This scenario is automated as an API test in `tests/Alloy/alloyJourney/TC002_ApiHealthCheck.spec.ts`
- Chrome-only remains the framework execution strategy, even though the validation is performed through the Playwright request fixture
- Inline constants should be used for the endpoint URL and expected response object
- Assertions should use strict equality for scalar values and deep equality for the full JSON object
- Test steps should be wrapped in `test.step()` blocks for clearer reporting

## Assertion Strategy / Notes

- Primary assertion: response status equals 200
- Primary contract assertion: parsed JSON deep-equals the expected object
- Failure conditions: connectivity failure, non-200 status, invalid JSON, or any contract mismatch

## Notes

- The live endpoint was observed through the local Playwright MCP flow during this run
- The observed root response was a JSON success envelope with payload `Welcome to the Alloy Service!`