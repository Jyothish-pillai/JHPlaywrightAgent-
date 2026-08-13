# Test Plan: TC005_UpdateJourneyConfig - Update Journey Config API

## Source
- User story: user-stories/Alloy/alloyJourney/TC005_UpdateJourneyConfig.md
- Base URL: http://172.25.1.45:32122
- Endpoint: PUT /alloy-journey/config/{journeyUuid}

## Scope
- Functional update success path
- Authorization (admin/jhid) behavior
- Route/body UUID mismatch validation
- Malformed JSON and type-mismatch validation
- Invalid UUID path and non-existent UUID path behavior
- Error-mapping parity behavior

## Strategy
- Execution: Playwright API tests in Chrome project
- Test data strategy: inline
- Scenario independence: each test sets up only required data

## Scenarios

### TC005-S01 Update succeeds with valid existing UUID and valid payload
1. Create a baseline journey config (setup).
2. Update same journeyUuid with changed token/name/key.
3. Verify 200 and RestResponse-wrapped updated DTO.

### TC005-S02 Authorization role behavior for update
1. Send valid update request with available authorized token.
2. Verify 200 for valid role or controlled 401/403 when token unavailable/invalid.

### TC005-S03 Route/body UUID mismatch is rejected
1. Send PUT where path UUID differs from body dtoJourneyConfig.journeyUuid.
2. Verify mapped 4xx rejection and non-5xx behavior.

### TC005-S04 Malformed JSON and type mismatch are rejected
1. Send malformed JSON payload.
2. Send payload with wrong field types.
3. Verify 4xx class response and non-5xx behavior.

### TC005-S05 Invalid UUID format path is rejected
1. Send PUT with invalid path UUID format.
2. Verify path-binding 4xx rejection and non-5xx behavior.

### TC005-S06 Non-existent UUID path returns mapped not-found/auth behavior
1. Send PUT with well-formed but random UUID and matching body UUID.
2. Verify mapped 404/auth denial and non-5xx behavior.

### TC005-S07 Error mapping parity sweep
1. Validate unauthorized, mismatch, and invalid-path failures produce structured error payloads.
2. Verify no raw stack trace/unhandled response shape.

## Expected Artifacts
- Plan: specs/Alloy/alloyJourney/TC005_UpdateJourneyConfig-test-plan.md
- Test: tests/Alloy/alloyJourney/TC005_UpdateJourneyConfig.spec.ts
- Report: final-reports/TC005_UpdateJourneyConfig-<timestamp>.html
