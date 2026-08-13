# TC009_Webhook - Test Plan
**Test Case:** TC009_Webhook  
**Component:** Alloy - alloyJourney  
**Framework:** Playwright API Automation (Node.js, TypeScript)  
**Test Type:** API Integration Testing  
**Date Created:** 2026-08-12  
**Status:** Draft

---

## Overview

### Purpose
Validate API endpoints for Alloy Journey application management, including portal link generation, adding person/business entities, and re-running journey applications with proper authorization, error handling, and response contract validation.

### Scope
Four API endpoints implementing FR-008 through FR-011:
- **FR-008:** Get Dashboard Application Portal Link
- **FR-009:** Add Person to Journey Application
- **FR-010:** Add Business to Journey Application
- **FR-011:** Rerun Journey Application

### Test Environment
- **Base URL:** http://172.25.1.45:32122 (OA_ALLOY_BASE_URL)
- **Auth Type:** Bearer Token (3 token environments):
  - `ALLOY_SERVICE_BEARER_TOKEN` (service role)
  - `ALLOY_JHID_BEARER_TOKEN` (jhid role)
  - `ALLOY_BEARER_TOKEN` (fallback/primary)
- **Framework:** Playwright Test with TypeScript
- **Response Wrapper:** All endpoints return RestResponse<T> wrapper

---

## Endpoints

### Endpoint 1: Get Dashboard Application Portal Link (FR-008)
| Property | Value |
|----------|-------|
| **Method** | GET |
| **Path** | `/alloy-journey/applications/{journeyApplicationUuid}/portal-link` |
| **Auth Required** | Yes |
| **Authorized Roles** | service, jhid |
| **Response** | RestResponse<String> containing dashboard URL |
| **Expected Status (Success)** | 200 OK |

**Business Logic:**
1. Validates path parameter UUID
2. Looks up stored Journey token and Journey application token
3. Reads Alloy Journeys base URL from Vault configuration
4. Converts API/sandbox host to dashboard host
5. Returns constructed dashboard URL string

### Endpoint 2: Add Person (FR-009)
| Property | Value |
|----------|-------|
| **Method** | PUT |
| **Path** | `/alloy-journey/applications/{journeyApplicationUuid}/add-person` |
| **Auth Required** | Yes |
| **Authorized Roles** | service, jhid |
| **Request Body** | JourneysAddPersonRequest with person entities list |
| **Response** | RestResponse<DtoJourneysApplication> |
| **Expected Status (Success)** | 200 OK |

**Business Logic:**
1. Validates path parameter UUID
2. Validates request payload JSON structure
3. Looks up stored Journey application mapping
4. Sends person entities to Alloy Journeys rerun endpoint
5. Parses new Journey application token
6. Updates locally stored application token
7. Fetches and returns refreshed Journey application details

**Request Payload Structure:**
```json
{
  "entities": [
    {
      "external_entity_id": "string",
      "entity_type": "string",
      "branch_name": "string",
      "data": {
        "name_first": "string",
        "name_middle": "string",
        "name_last": "string",
        "birth_date": "string (YYYY-MM-DD)",
        "document_ssn": "string",
        "email_address": "string",
        "phone_number": "string",
        "ip_address_v4": "string",
        "addresses": [
          {
            "type": "string",
            "line_1": "string",
            "line_2": "string",
            "city": "string",
            "state": "string",
            "postal_code": "string",
            "country_code": "string"
          }
        ]
      }
    }
  ]
}
```

### Endpoint 3: Add Business (FR-010)
| Property | Value |
|----------|-------|
| **Method** | PUT |
| **Path** | `/alloy-journey/applications/{journeyApplicationUuid}/add-business` |
| **Auth Required** | Yes |
| **Authorized Roles** | service, jhid |
| **Request Body** | JourneysAddBusinessRequest with business entities list |
| **Response** | RestResponse<DtoJourneysApplication> |
| **Expected Status (Success)** | 200 OK |

**Business Logic:**
1. Validates path parameter UUID
2. Validates request payload JSON structure
3. Looks up stored Journey application mapping
4. Sends business entities to Alloy Journeys rerun endpoint
5. Parses new Journey application token
6. Updates locally stored application token
7. Fetches and returns refreshed Journey application details

**Request Payload Structure:**
```json
{
  "entities": [
    {
      "external_entity_id": "string",
      "entity_type": "string",
      "branch_name": "string",
      "data": {
        "business_name": "string",
        "business_federal_ein": "string",
        "business_phone_number": "string",
        "business_url": "string",
        "business_type": "string",
        "addresses": [
          {
            "type": "string",
            "line_1": "string",
            "line_2": "string",
            "city": "string",
            "state": "string",
            "postal_code": "string",
            "country_code": "string"
          }
        ],
        "representatives": [
          {
            "name_first": "string",
            "name_middle": "string",
            "name_last": "string",
            "type": "string",
            "birth_date": "string",
            "document_ssn": "string",
            "email_address": "string",
            "phone_number": "string",
            "ownership_percentage": 0,
            "addresses": []
          }
        ]
      }
    }
  ]
}
```

### Endpoint 4: Rerun Journey (FR-011)
| Property | Value |
|----------|-------|
| **Method** | POST |
| **Path** | `/alloy-journey/applications/{journeyApplicationUuid}/rerun` |
| **Auth Required** | Yes |
| **Authorized Roles** | service, jhid |
| **Request Body** | Empty {} |
| **Response** | RestResponse<DtoJourneyRerun> |
| **Expected Status (Success)** | 200 OK |

**Business Logic:**
1. Validates path parameter UUID
2. Loads JourneyApplication mapping by applicationUuid
3. POSTs empty body {} to Alloy Journeys rerun endpoint
4. Parses new journey_application_token
5. Updates alloy_journey_applications table
6. Returns DtoJourneyRerun with new token

---

## Test Scenarios

### FR-008: Get Dashboard Application Portal Link

#### TC009-S01: Retrieve Portal Link - Valid UUID with Service Role
- **Objective:** Verify successful portal link generation for valid application UUID using service role
- **Setup:** Create or identify a known valid journeyApplicationUuid in the database
- **Steps:**
  1. Call GET `/alloy-journey/applications/{validUuid}/portal-link`
  2. Include Authorization header: `Bearer {ALLOY_SERVICE_BEARER_TOKEN}`
- **Expected Result:**
  - Status: 200 OK
  - Response wraps URL string in RestResponse<String>
  - Response.response contains valid URL starting with http/https
  - Response.response includes dashboard base URL (not API base URL)
- **Assertions:**
  ```typescript
  expect(response.status).toBe(200);
  expect(response.body.response).toBeDefined();
  expect(response.body.response).toMatch(/^https?:\/\//);
  expect(response.body.response).toContain('dashboard');
  ```

#### TC009-S02: Retrieve Portal Link - Valid UUID with JHID Role
- **Objective:** Verify successful portal link generation using jhid role
- **Steps:**
  1. Call GET `/alloy-journey/applications/{validUuid}/portal-link`
  2. Include Authorization header: `Bearer {ALLOY_JHID_BEARER_TOKEN}`
- **Expected Result:**
  - Status: 200 OK
  - Response contains valid portal link
  - Link format consistent with S01
- **Assertions:**
  ```typescript
  expect(response.status).toBe(200);
  expect(response.body.response).toBeDefined();
  expect(response.body.response).toMatch(/^https?:\/\//);
  ```

#### TC009-S03: Retrieve Portal Link - Invalid UUID Format
- **Objective:** Verify proper validation of malformed UUID path parameter
- **Steps:**
  1. Call GET `/alloy-journey/applications/not-a-uuid/portal-link`
  2. Include valid Authorization header
- **Expected Result:**
  - Status: 400 Bad Request
  - Error response indicates path parameter validation failure
- **Assertions:**
  ```typescript
  expect(response.status).toBe(400);
  expect(response.body.error || response.body.message).toBeDefined();
  ```

#### TC009-S04: Retrieve Portal Link - Non-Existent UUID (Valid Format)
- **Objective:** Verify handling of valid UUID format that doesn't exist in database
- **Steps:**
  1. Generate valid UUID: `550e8400-e29b-41d4-a716-446655440000`
  2. Call GET `/alloy-journey/applications/{generatedUuid}/portal-link`
  3. Include valid Authorization header
- **Expected Result:**
  - Status: 404 Not Found
  - Error response indicates application not found
- **Assertions:**
  ```typescript
  expect(response.status).toBe(404);
  expect(response.body.error || response.body.message).toContain('not found');
  ```

#### TC009-S05: Retrieve Portal Link - Missing Authorization Header
- **Objective:** Verify endpoint requires authentication
- **Steps:**
  1. Call GET `/alloy-journey/applications/{validUuid}/portal-link`
  2. Omit Authorization header
- **Expected Result:**
  - Status: 401 Unauthorized
  - Response indicates missing or invalid token
- **Assertions:**
  ```typescript
  expect(response.status).toBe(401);
  ```

#### TC009-S06: Retrieve Portal Link - Invalid Bearer Token
- **Objective:** Verify endpoint rejects invalid/expired token
- **Steps:**
  1. Call GET `/alloy-journey/applications/{validUuid}/portal-link`
  2. Include Authorization header: `Bearer invalid_token_string`
- **Expected Result:**
  - Status: 401 Unauthorized
- **Assertions:**
  ```typescript
  expect(response.status).toBe(401);
  ```

#### TC009-S07: Retrieve Portal Link - Insufficient Role
- **Objective:** Verify endpoint validates authorized roles (requires actual unauthorized token)
- **Steps:**
  1. Use a token with role other than 'service' or 'jhid' (if available in test environment)
  2. Call GET `/alloy-journey/applications/{validUuid}/portal-link`
- **Expected Result:**
  - Status: 403 Forbidden
- **Assertions:**
  ```typescript
  expect(response.status).toBe(403);
  ```

---

### FR-009: Add Person

#### TC009-S08: Add Person - Valid Request with Service Role
- **Objective:** Verify successful addition of person entity to journey application
- **Setup:** 
  - Create or identify known valid journeyApplicationUuid
  - Prepare valid person entity payload
- **Steps:**
  1. Prepare request body with valid person entity:
     ```json
     {
       "entities": [{
         "external_entity_id": "person_001",
         "entity_type": "person",
         "branch_name": "primary",
         "data": {
           "name_first": "John",
           "name_middle": "M",
           "name_last": "Doe",
           "birth_date": "1990-01-15",
           "document_ssn": "123-45-6789",
           "email_address": "john.doe@example.com",
           "phone_number": "555-1234",
           "ip_address_v4": "192.168.1.1",
           "addresses": [{
             "type": "residential",
             "line_1": "123 Main St",
             "city": "Boston",
             "state": "MA",
             "postal_code": "02101",
             "country_code": "US"
           }]
         }
       }]
     }
     ```
  2. Call PUT `/alloy-journey/applications/{validUuid}/add-person`
  3. Include Content-Type: application/json and valid Authorization
- **Expected Result:**
  - Status: 200 OK
  - Response contains updated DtoJourneysApplication
  - Updated applicationUuid matches request UUID
  - journeyApplicationToken is new/updated
  - entities list includes new person
- **Assertions:**
  ```typescript
  expect(response.status).toBe(200);
  expect(response.body.response).toBeDefined();
  expect(response.body.response.applicationUuid).toBe(validUuid);
  expect(response.body.response.journeyApplicationToken).toBeDefined();
  expect(response.body.response.entities).toBeDefined();
  expect(response.body.response.entities.length).toBeGreaterThan(0);
  ```

#### TC009-S09: Add Person - Valid Request with JHID Role
- **Objective:** Verify successful addition of person using jhid role
- **Steps:**
  1. Prepare same valid person entity payload as S08
  2. Call PUT `/alloy-journey/applications/{validUuid}/add-person`
  3. Use `ALLOY_JHID_BEARER_TOKEN` for authorization
- **Expected Result:**
  - Status: 200 OK
  - Response structure and validation consistent with S08
- **Assertions:**
  ```typescript
  expect(response.status).toBe(200);
  expect(response.body.response.journeyApplicationToken).toBeDefined();
  ```

#### TC009-S10: Add Person - Invalid UUID Path Parameter
- **Objective:** Verify UUID path parameter validation rejects malformed UUIDs
- **Steps:**
  1. Prepare valid person entity payload
  2. Call PUT `/alloy-journey/applications/invalid-uuid/add-person` with payload
- **Expected Result:**
  - Status: 400 Bad Request
  - Error response from framework binding validation
- **Assertions:**
  ```typescript
  expect(response.status).toBe(400);
  ```

#### TC009-S11: Add Person - Non-Existent Application UUID
- **Objective:** Verify handling of valid UUID format that doesn't exist
- **Steps:**
  1. Generate valid UUID: `550e8400-e29b-41d4-a716-446655440111`
  2. Prepare valid person payload
  3. Call PUT `/alloy-journey/applications/{generatedUuid}/add-person`
- **Expected Result:**
  - Status: 404 Not Found
- **Assertions:**
  ```typescript
  expect(response.status).toBe(404);
  ```

#### TC009-S12: Add Person - Missing Authorization Header
- **Objective:** Verify authentication is required
- **Steps:**
  1. Prepare valid person payload
  2. Call PUT `/alloy-journey/applications/{validUuid}/add-person` without Authorization
- **Expected Result:**
  - Status: 401 Unauthorized
- **Assertions:**
  ```typescript
  expect(response.status).toBe(401);
  ```

#### TC009-S13: Add Person - Invalid Bearer Token
- **Objective:** Verify invalid token is rejected
- **Steps:**
  1. Prepare valid person payload
  2. Call PUT with Authorization: `Bearer invalid_token`
- **Expected Result:**
  - Status: 401 Unauthorized
- **Assertions:**
  ```typescript
  expect(response.status).toBe(401);
  ```

#### TC009-S14: Add Person - Malformed JSON Request Body
- **Objective:** Verify Spring/Jackson binding rejects invalid JSON
- **Steps:**
  1. Send malformed JSON: `{invalid json content}`
  2. Call PUT `/alloy-journey/applications/{validUuid}/add-person`
- **Expected Result:**
  - Status: 400 Bad Request
  - Error indicates JSON parsing failure
- **Assertions:**
  ```typescript
  expect(response.status).toBe(400);
  expect(response.body.error || response.body.message).toBeDefined();
  ```

#### TC009-S15: Add Person - Missing Required Fields in Payload
- **Objective:** Verify validation of required person data fields
- **Steps:**
  1. Prepare payload missing required fields (e.g., omit name_first):
     ```json
     {
       "entities": [{
         "external_entity_id": "person_002",
         "entity_type": "person",
         "data": {
           "name_last": "Doe"
         }
       }]
     }
     ```
  2. Call PUT endpoint
- **Expected Result:**
  - Status: 400 Bad Request or semantic error from Alloy Journeys API
- **Assertions:**
  ```typescript
  expect(response.status).toBeGreaterThanOrEqual(400);
  ```

#### TC009-S16: Add Person - Empty Entities List
- **Objective:** Verify handling of empty entity array
- **Steps:**
  1. Prepare payload with empty entities: `{"entities": []}`
  2. Call PUT endpoint
- **Expected Result:**
  - Status: 400 Bad Request or 200 with no changes (implementation-dependent)
- **Assertions:**
  ```typescript
  expect([400, 200]).toContain(response.status);
  ```

#### TC009-S17: Add Person - Type Mismatch in Payload
- **Objective:** Verify Jackson binding rejects type mismatches
- **Steps:**
  1. Send payload with ownership_percentage as string instead of integer:
     ```json
     {
       "entities": [{
         "data": {
           "birth_date": "1990-01-15",
           "document_ssn": 12345
         }
       }]
     }
     ```
  2. Call PUT endpoint
- **Expected Result:**
  - Status: 400 Bad Request
- **Assertions:**
  ```typescript
  expect(response.status).toBe(400);
  ```

#### TC009-S18: Add Person - Multiple Entity Objects
- **Objective:** Verify processing of multiple person entities in single request
- **Steps:**
  1. Prepare payload with 2-3 person entities
  2. Call PUT endpoint
- **Expected Result:**
  - Status: 200 OK
  - All entities are processed and included in response
- **Assertions:**
  ```typescript
  expect(response.status).toBe(200);
  expect(response.body.response.entities.length).toBeGreaterThanOrEqual(expectedCount);
  ```

---

### FR-010: Add Business

#### TC009-S19: Add Business - Valid Request with Service Role
- **Objective:** Verify successful addition of business entity to journey application
- **Setup:**
  - Create or identify known valid journeyApplicationUuid
  - Prepare valid business entity payload
- **Steps:**
  1. Prepare request body with valid business entity:
     ```json
     {
       "entities": [{
         "external_entity_id": "business_001",
         "entity_type": "business",
         "branch_name": "primary",
         "data": {
           "business_name": "Acme Corp",
           "business_federal_ein": "12-3456789",
           "business_phone_number": "555-5678",
           "business_url": "https://acme.com",
           "business_type": "LLC",
           "addresses": [{
             "type": "principal",
             "line_1": "456 Business Ave",
             "city": "New York",
             "state": "NY",
             "postal_code": "10001",
             "country_code": "US"
           }],
           "representatives": [{
             "name_first": "Jane",
             "name_last": "Smith",
             "type": "owner",
             "ownership_percentage": 100
           }]
         }
       }]
     }
     ```
  2. Call PUT `/alloy-journey/applications/{validUuid}/add-business`
  3. Include Content-Type: application/json and valid Authorization
- **Expected Result:**
  - Status: 200 OK
  - Response contains updated DtoJourneysApplication
  - Updated applicationUuid matches request UUID
  - journeyApplicationToken is new/updated
  - entities list includes new business
- **Assertions:**
  ```typescript
  expect(response.status).toBe(200);
  expect(response.body.response).toBeDefined();
  expect(response.body.response.applicationUuid).toBe(validUuid);
  expect(response.body.response.journeyApplicationToken).toBeDefined();
  expect(response.body.response.entities).toBeDefined();
  ```

#### TC009-S20: Add Business - Valid Request with JHID Role
- **Objective:** Verify successful addition of business using jhid role
- **Steps:**
  1. Prepare same valid business entity payload as S19
  2. Call PUT endpoint with `ALLOY_JHID_BEARER_TOKEN`
- **Expected Result:**
  - Status: 200 OK
  - Response consistent with S19
- **Assertions:**
  ```typescript
  expect(response.status).toBe(200);
  expect(response.body.response.journeyApplicationToken).toBeDefined();
  ```

#### TC009-S21: Add Business - Invalid UUID Path Parameter
- **Objective:** Verify UUID validation for malformed path parameter
- **Steps:**
  1. Prepare valid business payload
  2. Call PUT `/alloy-journey/applications/bad-uuid/add-business`
- **Expected Result:**
  - Status: 400 Bad Request
- **Assertions:**
  ```typescript
  expect(response.status).toBe(400);
  ```

#### TC009-S22: Add Business - Non-Existent Application UUID
- **Objective:** Verify handling of valid UUID format not in database
- **Steps:**
  1. Generate valid UUID: `550e8400-e29b-41d4-a716-446655440222`
  2. Prepare valid business payload
  3. Call PUT endpoint
- **Expected Result:**
  - Status: 404 Not Found
- **Assertions:**
  ```typescript
  expect(response.status).toBe(404);
  ```

#### TC009-S23: Add Business - Missing Authorization Header
- **Objective:** Verify authentication is required
- **Steps:**
  1. Prepare valid business payload
  2. Call PUT endpoint without Authorization header
- **Expected Result:**
  - Status: 401 Unauthorized
- **Assertions:**
  ```typescript
  expect(response.status).toBe(401);
  ```

#### TC009-S24: Add Business - Invalid Bearer Token
- **Objective:** Verify invalid token is rejected
- **Steps:**
  1. Prepare valid business payload
  2. Call PUT with Authorization: `Bearer expired_or_invalid`
- **Expected Result:**
  - Status: 401 Unauthorized
- **Assertions:**
  ```typescript
  expect(response.status).toBe(401);
  ```

#### TC009-S25: Add Business - Malformed JSON Request Body
- **Objective:** Verify Spring/Jackson binding rejects invalid JSON
- **Steps:**
  1. Send malformed JSON
  2. Call PUT endpoint
- **Expected Result:**
  - Status: 400 Bad Request
- **Assertions:**
  ```typescript
  expect(response.status).toBe(400);
  ```

#### TC009-S26: Add Business - Missing Required Business Data Fields
- **Objective:** Verify validation of required business fields
- **Steps:**
  1. Prepare payload missing business_name:
     ```json
     {
       "entities": [{
         "external_entity_id": "business_002",
         "entity_type": "business",
         "data": {
           "business_federal_ein": "12-3456789"
         }
       }]
     }
     ```
  2. Call PUT endpoint
- **Expected Result:**
  - Status: 400 Bad Request or error from Alloy Journeys
- **Assertions:**
  ```typescript
  expect(response.status).toBeGreaterThanOrEqual(400);
  ```

#### TC009-S27: Add Business - Empty Entities List
- **Objective:** Verify handling of empty entity array
- **Steps:**
  1. Prepare payload: `{"entities": []}`
  2. Call PUT endpoint
- **Expected Result:**
  - Status: 400 Bad Request or 200 with no changes
- **Assertions:**
  ```typescript
  expect([400, 200]).toContain(response.status);
  ```

#### TC009-S28: Add Business - Invalid Representative Ownership Percentage
- **Objective:** Verify validation of numeric fields
- **Steps:**
  1. Prepare payload with ownership_percentage as string: `"ownership_percentage": "100"`
  2. Call PUT endpoint
- **Expected Result:**
  - Status: 400 Bad Request (type mismatch)
- **Assertions:**
  ```typescript
  expect(response.status).toBe(400);
  ```

#### TC009-S29: Add Business - Multiple Business Entities
- **Objective:** Verify processing of multiple business entities
- **Steps:**
  1. Prepare payload with 2 business entities
  2. Call PUT endpoint
- **Expected Result:**
  - Status: 200 OK
  - All entities processed
- **Assertions:**
  ```typescript
  expect(response.status).toBe(200);
  expect(response.body.response.entities.length).toBeGreaterThanOrEqual(expectedCount);
  ```

#### TC009-S30: Add Business - Mixed Entities (Person and Business)
- **Objective:** Verify endpoint rejects mixed entity types (if not supported)
- **Steps:**
  1. Prepare payload with both person and business entities
  2. Call PUT `/add-business` endpoint
- **Expected Result:**
  - Status: 400 Bad Request or processed only as business (implementation-dependent)
- **Assertions:**
  ```typescript
  expect([400, 200]).toContain(response.status);
  ```

---

### FR-011: Rerun Journey

#### TC009-S31: Rerun Journey - Valid Request with Service Role
- **Objective:** Verify successful rerun of journey application
- **Setup:** Identify known valid journeyApplicationUuid
- **Steps:**
  1. Call POST `/alloy-journey/applications/{validUuid}/rerun`
  2. Send empty body: `{}`
  3. Include Authorization: `Bearer {ALLOY_SERVICE_BEARER_TOKEN}`
- **Expected Result:**
  - Status: 200 OK
  - Response contains DtoJourneyRerun with journeyApplicationToken
  - New token differs from previous token (if verifiable)
- **Assertions:**
  ```typescript
  expect(response.status).toBe(200);
  expect(response.body.response).toBeDefined();
  expect(response.body.response.journeyApplicationToken).toBeDefined();
  expect(response.body.response.journeyApplicationToken).toMatch(/^[a-zA-Z0-9_-]+$/);
  ```

#### TC009-S32: Rerun Journey - Valid Request with JHID Role
- **Objective:** Verify successful rerun using jhid role
- **Steps:**
  1. Call POST endpoint with `ALLOY_JHID_BEARER_TOKEN`
  2. Send empty body
- **Expected Result:**
  - Status: 200 OK
  - New journeyApplicationToken returned
- **Assertions:**
  ```typescript
  expect(response.status).toBe(200);
  expect(response.body.response.journeyApplicationToken).toBeDefined();
  ```

#### TC009-S33: Rerun Journey - Invalid UUID Path Parameter
- **Objective:** Verify UUID path parameter validation
- **Steps:**
  1. Call POST `/alloy-journey/applications/not-a-uuid/rerun`
  2. Send empty body
- **Expected Result:**
  - Status: 400 Bad Request
- **Assertions:**
  ```typescript
  expect(response.status).toBe(400);
  ```

#### TC009-S34: Rerun Journey - Non-Existent Application UUID
- **Objective:** Verify handling of valid UUID not in database
- **Steps:**
  1. Generate valid UUID: `550e8400-e29b-41d4-a716-446655440333`
  2. Call POST endpoint
- **Expected Result:**
  - Status: 404 Not Found
- **Assertions:**
  ```typescript
  expect(response.status).toBe(404);
  ```

#### TC009-S35: Rerun Journey - Missing Authorization Header
- **Objective:** Verify authentication is required
- **Steps:**
  1. Call POST endpoint without Authorization header
- **Expected Result:**
  - Status: 401 Unauthorized
- **Assertions:**
  ```typescript
  expect(response.status).toBe(401);
  ```

#### TC009-S36: Rerun Journey - Invalid Bearer Token
- **Objective:** Verify invalid token is rejected
- **Steps:**
  1. Call POST with Authorization: `Bearer invalid_token`
- **Expected Result:**
  - Status: 401 Unauthorized
- **Assertions:**
  ```typescript
  expect(response.status).toBe(401);
  ```

#### TC009-S37: Rerun Journey - Non-Empty Request Body
- **Objective:** Verify endpoint handles non-empty body (should ignore or reject)
- **Steps:**
  1. Send payload with data: `{"someField": "someValue"}`
  2. Call POST endpoint
- **Expected Result:**
  - Status: 200 OK (ignores body) or 400 Bad Request (strict validation)
- **Assertions:**
  ```typescript
  expect([200, 400]).toContain(response.status);
  ```

#### TC009-S38: Rerun Journey - Malformed JSON in Body
- **Objective:** Verify handling of malformed JSON
- **Steps:**
  1. Send malformed JSON body
  2. Call POST endpoint
- **Expected Result:**
  - Status: 400 Bad Request or 200 (if body ignored)
- **Assertions:**
  ```typescript
  expect([200, 400]).toContain(response.status);
  ```

#### TC009-S39: Rerun Journey - Token Update Verification
- **Objective:** Verify local database is updated with new token
- **Setup:** Record original token before rerun
- **Steps:**
  1. Query database for current journeyApplicationToken for {validUuid}
  2. Call POST `/rerun` endpoint
  3. Query database again for updated token
- **Expected Result:**
  - Returned token from API matches new database token
  - New token differs from original token
- **Assertions:**
  ```typescript
  expect(response.body.response.journeyApplicationToken).not.toBe(originalToken);
  // Verify in database if access available
  ```

---

### Cross-Endpoint Scenarios

#### TC009-S40: Consistency - Token Updates After Add Person/Business
- **Objective:** Verify token updates persist across endpoints
- **Setup:** Identify valid application UUID
- **Steps:**
  1. Call GET `/portal-link` and note response (or retrieve token from database)
  2. Call PUT `/add-person` with valid person data
  3. Call GET `/portal-link` again
  4. Compare if operations are consistent
- **Expected Result:**
  - Both endpoints complete successfully
  - Data is consistent across calls
- **Assertions:**
  ```typescript
  expect(addPersonResponse.status).toBe(200);
  expect(portalLinkResponse.status).toBe(200);
  ```

#### TC009-S41: Consistency - Sequential Add Operations
- **Objective:** Verify adding person followed by business succeeds
- **Setup:** Valid application UUID
- **Steps:**
  1. Call PUT `/add-person` with person data
  2. Immediately call PUT `/add-business` with business data
- **Expected Result:**
  - Both succeed
  - Final state includes both entities
- **Assertions:**
  ```typescript
  expect(personResponse.status).toBe(200);
  expect(businessResponse.status).toBe(200);
  expect(businessResponse.body.response.entities.length).toBeGreaterThanOrEqual(2);
  ```

#### TC009-S42: Consistency - Rerun After Add Operations
- **Objective:** Verify rerun processes recently added entities
- **Setup:** Valid application UUID
- **Steps:**
  1. Call PUT `/add-person`
  2. Call POST `/rerun`
- **Expected Result:**
  - Both succeed
  - New token returned from rerun
- **Assertions:**
  ```typescript
  expect(personResponse.status).toBe(200);
  expect(rerunResponse.status).toBe(200);
  expect(rerunResponse.body.response.journeyApplicationToken).toBeDefined();
  ```

#### TC009-S43: Authorization Consistency
- **Objective:** Verify all endpoints enforce same role requirements
- **Setup:** Identify tokens for service, jhid, and other roles (if available)
- **Steps:**
  1. Test each endpoint with service token
  2. Test each endpoint with jhid token
  3. Test each endpoint with unauthorized token (if available)
- **Expected Result:**
  - service and jhid tokens grant access to all endpoints
  - Unauthorized tokens are rejected consistently
- **Assertions:**
  ```typescript
  for (const endpoint of [portalLink, addPerson, addBusiness, rerun]) {
    expect(endpoint(serviceToken).status).toBe(200);
    expect(endpoint(jhidToken).status).toBe(200);
    expect(endpoint(invalidToken).status).toBe(401);
  }
  ```

#### TC009-S44: Error Handling Consistency
- **Objective:** Verify all endpoints handle invalid UUIDs consistently
- **Setup:** Invalid UUID string
- **Steps:**
  1. Call each endpoint with invalid UUID
  2. Document response format and status
- **Expected Result:**
  - All endpoints return 400 Bad Request
  - Error response format is consistent
- **Assertions:**
  ```typescript
  for (const endpoint of [portalLink, addPerson, addBusiness, rerun]) {
    const result = endpoint(invalidUuid);
    expect(result.status).toBe(400);
    expect(result.body.error || result.body.message).toBeDefined();
  }
  ```

#### TC009-S45: Response Contract Validation - Portal Link
- **Objective:** Verify RestResponse<String> wrapper structure
- **Steps:**
  1. Call GET `/portal-link` successfully
  2. Validate response structure
- **Expected Result:**
  - Response has `response` field containing string URL
  - No unexpected fields in response
  - Response is valid JSON
- **Assertions:**
  ```typescript
  expect(response.body).toHaveProperty('response');
  expect(typeof response.body.response).toBe('string');
  expect(response.body.response).toMatch(/^https?:\/\//);
  ```

#### TC009-S46: Response Contract Validation - Add Person/Business
- **Objective:** Verify RestResponse<DtoJourneysApplication> structure
- **Steps:**
  1. Call PUT `/add-person` or `/add-business` successfully
  2. Validate response structure
- **Expected Result:**
  - Response has `response` field containing DtoJourneysApplication
  - DtoJourneysApplication has required fields: applicationUuid, journeyApplicationToken, journeyApplicationStatus, entities
  - All fields are properly typed
- **Assertions:**
  ```typescript
  expect(response.body).toHaveProperty('response');
  expect(response.body.response).toHaveProperty('applicationUuid');
  expect(response.body.response).toHaveProperty('journeyApplicationToken');
  expect(response.body.response).toHaveProperty('journeyApplicationStatus');
  expect(response.body.response).toHaveProperty('entities');
  expect(Array.isArray(response.body.response.entities)).toBe(true);
  ```

#### TC009-S47: Response Contract Validation - Rerun
- **Objective:** Verify RestResponse<DtoJourneyRerun> structure
- **Steps:**
  1. Call POST `/rerun` successfully
  2. Validate response structure
- **Expected Result:**
  - Response has `response` field containing DtoJourneyRerun
  - DtoJourneyRerun has journeyApplicationToken field
  - Token is string type
- **Assertions:**
  ```typescript
  expect(response.body).toHaveProperty('response');
  expect(response.body.response).toHaveProperty('journeyApplicationToken');
  expect(typeof response.body.response.journeyApplicationToken).toBe('string');
  ```

#### TC009-S48: Idempotency - Rerun Journey
- **Objective:** Verify rerun can be called multiple times
- **Setup:** Valid application UUID
- **Steps:**
  1. Call POST `/rerun`
  2. Record returned token
  3. Call POST `/rerun` again
  4. Record new token
- **Expected Result:**
  - First rerun: 200 OK
  - Second rerun: 200 OK
  - Both return valid tokens (may differ)
- **Assertions:**
  ```typescript
  expect(firstRerun.status).toBe(200);
  expect(secondRerun.status).toBe(200);
  expect(firstRerun.body.response.journeyApplicationToken).toBeDefined();
  expect(secondRerun.body.response.journeyApplicationToken).toBeDefined();
  ```

#### TC009-S49: Pagination/Limits - Add Person Multiple Entities
- **Objective:** Verify handling of large entity arrays
- **Setup:** Valid application UUID
- **Steps:**
  1. Prepare payload with 10+ person entities
  2. Call PUT `/add-person`
- **Expected Result:**
  - Request succeeds or returns appropriate error
  - System handles bulk operations
- **Assertions:**
  ```typescript
  expect([200, 400, 413]).toContain(response.status);
  ```

#### TC009-S50: Content-Type Validation
- **Objective:** Verify endpoints validate Content-Type header
- **Setup:** Valid request payload
- **Steps:**
  1. Call PUT `/add-person` with Content-Type: text/plain (instead of application/json)
  2. Send valid JSON body
- **Expected Result:**
  - Status: 400 Bad Request or 415 Unsupported Media Type
- **Assertions:**
  ```typescript
  expect([400, 415]).toContain(response.status);
  ```

---

## Acceptance Criteria

### Functional
- [ ] All four endpoints (FR-008, FR-009, FR-010, FR-011) are successfully implemented and operational
- [ ] GET `/portal-link` returns valid dashboard URL for known applications
- [ ] PUT `/add-person` adds person entities and returns updated application state
- [ ] PUT `/add-business` adds business entities and returns updated application state
- [ ] POST `/rerun` triggers re-evaluation and returns new application token
- [ ] Database is updated with new tokens after add and rerun operations

### Authorization & Security
- [ ] All endpoints require Bearer token authentication (401 when missing or invalid)
- [ ] All endpoints enforce role-based access control (service, jhid roles)
- [ ] Invalid or expired tokens are rejected consistently
- [ ] Service and jhid roles have equivalent permissions on all endpoints

### Request Validation
- [ ] Path parameter UUIDs are validated (400 for malformed, 404 for non-existent)
- [ ] JSON payloads are parsed and validated by Spring/Jackson
- [ ] Malformed JSON is rejected with 400 Bad Request
- [ ] Required fields in request bodies are enforced
- [ ] Type mismatches in payload fields are rejected
- [ ] Invalid address, person, and business field values are handled appropriately

### Response Contract
- [ ] All responses use RestResponse<T> wrapper pattern
- [ ] GET `/portal-link` returns RestResponse<String>
- [ ] PUT `/add-person` and `/add-business` return RestResponse<DtoJourneysApplication>
- [ ] POST `/rerun` returns RestResponse<DtoJourneyRerun>
- [ ] Response objects contain all documented fields with correct types
- [ ] No unexpected fields appear in responses

### Error Handling
- [ ] 400 Bad Request for malformed requests (invalid JSON, bad UUIDs, type mismatches)
- [ ] 401 Unauthorized for missing or invalid authentication
- [ ] 403 Forbidden for insufficient permissions (if applicable in test environment)
- [ ] 404 Not Found for non-existent application UUIDs
- [ ] Error responses include descriptive messages
- [ ] HTTP status codes align with legacy Kotlin service behavior

### Integration & Consistency
- [ ] Token updates persist across sequential endpoint calls
- [ ] Add operations (person/business) are processed by Alloy Journeys API correctly
- [ ] Rerun operation processes updated entity data
- [ ] Multiple entities can be added in single request
- [ ] Endpoints maintain data consistency with external Alloy Journeys API

---

## Test Data Requirements

### Preconditions
- **Valid Bearer Tokens:**
  - `ALLOY_SERVICE_BEARER_TOKEN` (or fallback `ALLOY_BEARER_TOKEN`)
  - `ALLOY_JHID_BEARER_TOKEN`
- **Valid Application UUIDs:** At least 2-3 known application UUIDs in database with existing journey tokens
- **External API Access:** Connectivity to Alloy Journeys API at configured host
- **Database Access:** Ability to query `alloy_journey_applications` table for verification (optional)

### Test Data Payloads
See individual scenario sections for detailed request/response examples.

---

## Execution Strategy

### Test Execution Order
1. **Phase 1 - Authentication & Authorization** (TC009-S01, S02, S05, S06, S07, S12, S13, S23, S24, S35, S36, S43)
   - Verify authentication requirements and role-based access
2. **Phase 2 - Path Parameter Validation** (TC009-S03, S04, S10, S11, S21, S22, S33, S34, S44)
   - Verify UUID format validation
3. **Phase 3 - Functional Happy Path** (TC009-S01, S08, S19, S31)
   - Verify core functionality works
4. **Phase 4 - Request Payload Validation** (TC009-S14, S15, S16, S25, S26, S27, S28, S49, S50)
   - Verify input validation and error handling
5. **Phase 5 - Response Contract Validation** (TC009-S45, S46, S47)
   - Verify response structure and format
6. **Phase 6 - Cross-Endpoint Consistency** (TC009-S40, S41, S42, S43, S44)
   - Verify integration between endpoints
7. **Phase 7 - Edge Cases & Idempotency** (TC009-S48, S49)
   - Verify robustness and idempotent behavior

### Parallel Execution
- Tests within the same phase can run in parallel (e.g., all auth tests together)
- Ensure test data isolation to prevent interference
- Use unique external_entity_id values to avoid conflicts

### Dependencies
- Phase 1 must complete before Phase 3 (need working auth first)
- Phase 2 can run independently
- Phase 6 tests should run serially or with careful isolation

---

## Environment Configuration

### Required Environment Variables
```bash
OA_ALLOY_BASE_URL=http://172.25.1.45:32122
ALLOY_SERVICE_BEARER_TOKEN=<token>
ALLOY_JHID_BEARER_TOKEN=<token>
ALLOY_BEARER_TOKEN=<token> (fallback)
```

### Playwright Configuration
- Browser: Chromium (for API testing, context not required but can use API Context)
- Timeout: 30000ms (default) for API calls
- Retries: 0 (API tests should not retry)
- Reporter: Line + HTML (final-html-reporter.cjs)

### Base URL Mapping
```typescript
const baseURL = process.env.OA_ALLOY_BASE_URL || 'http://172.25.1.45:32122';
```

---

## Notes & Considerations

### Known Issues & Workarounds
- **Playwright HTML Reporter Auto-Opens:** Set `CI=1` or `PLAYWRIGHT_HTML_OPEN=never` environment variable before running tests (see user memory debugging.md for details)
- **Bearer Token Refresh:** Tokens may expire during long test runs; implement token refresh mechanism if needed

### Alloy Journeys API Integration
- External Alloy Journeys API calls happen during add-person, add-business, and rerun operations
- These calls should be mocked in unit tests but verified in integration tests
- Response parsing depends on Alloy API contract (token extraction, application state retrieval)

### Database State Management
- Tests should ideally run in isolation or use transaction rollback
- Consider using a test application UUID that exists in staging/test database
- Verify token updates in database after successful API calls (if access available)

### Token & Authorization Strategy
- Service and jhid roles should have equivalent access to all endpoints
- Test both tokens explicitly to verify parity
- If possible, test with token that has neither role to verify 403 Forbidden

### Concurrency & Race Conditions
- Multiple sequential add operations on same application should be handled correctly
- Verify token is updated after each operation
- Rerun immediately after add operation should include added entities

### Performance Considerations
- Add operations trigger external API calls (may be slower)
- Rerun operation should be fast (simple POST to Alloy)
- Portal link generation should be fast (lookup + string building)
- Set reasonable timeouts for each operation

### Future Test Enhancements
- Implement chaos engineering tests (network delays, timeouts, 5xx errors from Alloy)
- Add performance baselines (response time assertions)
- Implement load testing for concurrent add operations
- Mock Alloy Journeys API responses for faster test execution
- Add database state verification assertions

### Test Maintenance
- Monitor Alloy Journeys API contract changes
- Update test data when API response schema changes
- Review error handling changes in legacy Kotlin service
- Track framework binding validation error message changes

---

## Test Specification Metadata

| Attribute | Value |
|-----------|-------|
| **Test Plan Version** | 1.0 |
| **Created** | 2026-08-12 |
| **Last Updated** | 2026-08-12 |
| **Status** | Draft - Ready for Implementation |
| **Test Type** | API Integration |
| **Framework** | Playwright Test + TypeScript |
| **Endpoints Covered** | 4 (FR-008, FR-009, FR-010, FR-011) |
| **Scenarios** | 50 |
| **Estimated Execution Time** | 30-45 minutes (sequential execution) |
| **Dependencies** | Alloy Journeys API, Test Database with valid application UUIDs |
| **Owner** | QA Automation Team |
| **Next Steps** | Implement test suite, Execute Phase 1 tests, Validate auth/role behavior |
