# Test Plan: TC008_JourneyConfig - Alloy Journey Configuration APIs

## Source
- User story: user-stories/Alloy/alloyJourney/TC008_JourneyConfig.md
- Base URL: http://172.25.1.45:32122

## Endpoints Covered
- FR-004: GET /alloy-journey/applications/{applicationUuid}/config
- FR-005: POST /alloy-journey/{journeyConfigUuid}/start-person
- FR-006: POST /alloy-journey/{journeyConfigUuid}/start-business
- FR-007: GET /alloy-journey/applications/{journeyApplicationUuid}

## Scope
- Functional happy-path behavior for all four endpoints
- Authorization behavior (service/jhid roles, missing auth)
- RestResponse wrapper contract consistency
- Path UUID validation and non-existent record handling
- Payload validation for POST endpoints (malformed JSON, type mismatch, missing fields)
- E2E flow scenarios (create journey → retrieve config → poll status)

## Strategy
- Execution: Playwright API tests on Chrome
- Data strategy: inline (test UUIDs, person/business payloads generated in-test)
- Environment tolerance: accept controlled 4xx/auth outcomes, always reject unhandled 5xx

## Core Test Scenarios

### GET /alloy-journey/applications/{applicationUuid}/config
1. Retrieve config with service/jhid role
2. Reject missing auth or invalid UUID
3. Handle not-found application UUID

### POST /alloy-journey/{journeyConfigUuid}/start-person
1. Start person journey with valid payload
2. Reject malformed JSON and type mismatches
3. Handle missing required fields or invalid config UUID

### POST /alloy-journey/{journeyConfigUuid}/start-business
1. Start business journey with valid payload
2. Reject malformed JSON and type mismatches
3. Handle missing required fields or invalid config UUID

### GET /alloy-journey/applications/{journeyApplicationUuid}
1. Retrieve journey status with service/jhid role
2. Handle not-found or invalid UUID
3. Support polling behavior with status transitions

### E2E Flows
1. Get config → start person journey → poll status
2. Get config → start business journey → poll status

## Expected Artifacts
- Plan: specs/Alloy/alloyJourney/TC008_JourneyConfig-test-plan.md
- Test: tests/Alloy/alloyJourney/TC008_JourneyConfig.spec.ts
- Report: final-reports/TC008_JourneyConfig-<timestamp>.html
