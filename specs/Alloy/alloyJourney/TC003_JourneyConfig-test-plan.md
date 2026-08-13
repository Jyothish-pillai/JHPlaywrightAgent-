# Test Plan: TC003_JourneyConfig - Alloy Journey Configuration APIs

## Source
- User story: user-stories/Alloy/alloyJourney/TC003_JourneyConfig.md
- Base URL: http://172.25.1.45:32122

## Scope
- POST /alloy-journey/config
- GET /alloy-journey/config/{journeyUuid}
- GET /alloy-journey/config
- PUT /alloy-journey/config/{journeyUuid}
- DELETE /alloy-journey/config/{journeyUuid}
- GET /alloy-journey/{journeyUuid}/schema

## Strategy
- Test data strategy: inline
- Execution: Chrome-only Playwright API tests
- Auth handling: validate authorized and unauthorized behavior; tolerate 401 vs 403 variance

## Scenarios

### TC003-S01 Create Journey Config
1. Send POST with valid dtoJourneyConfig.
2. Verify either 200 success contract or 401/403 auth denial.
3. If 200, verify returned data includes server-generated journeyUuid and echoed fields.

### TC003-S02 Create with Malformed JSON
1. Send POST with malformed JSON body.
2. Verify 4xx-class rejection (or auth denial first), never 5xx.

### TC003-S03 Get All Journey Configs
1. Send GET /alloy-journey/config.
2. Verify either 200 list wrapper or 401/403.
3. If 200, verify data payload is array-like.

### TC003-S04 Get Config by UUID
1. Create config (if authorized) and capture journeyUuid.
2. Send GET by journeyUuid.
3. Verify either 200 with matching UUID or mapped not-found/auth denial.

### TC003-S05 Update Config
1. Create config (if authorized).
2. Send PUT with matching route/body journeyUuid and updated fields.
3. Verify either 200 with updated fields or mapped auth/not-found behavior.

### TC003-S06 Update Config UUID Mismatch
1. Send PUT with different route/body UUID values.
2. Verify rejection (4xx/auth), never unhandled 5xx.

### TC003-S07 Delete Config
1. Create config (if authorized).
2. Send DELETE by journeyUuid.
3. Verify either 200 success or mapped auth/not-found behavior.

### TC003-S08 Get Required Fields Schema
1. Create config (if authorized).
2. Send GET /alloy-journey/{journeyUuid}/schema.
3. Verify either 200 with array payload or mapped auth/not-found behavior.

## Expected Artifacts
- Plan: specs/Alloy/alloyJourney/TC003_JourneyConfig-test-plan.md
- Test: tests/Alloy/alloyJourney/TC003_JourneyConfig.spec.ts
- Final report: final-reports/TC003_JourneyConfig-<timestamp>.html
