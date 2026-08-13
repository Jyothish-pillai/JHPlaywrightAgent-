# Test Plan: TC004_GetAllJourneyConfigs - Get All Alloy Journey Configs

## Source
- User story: user-stories/Alloy/alloyJourney/TC004_GetAllJourneyConfigs.md
- Base URL: http://172.25.1.45:32122
- Endpoint under test: GET /alloy-journey/config

## Scope
- Functional retrieval of all journey configs
- Authorization for admin/jhid roles
- RestResponse list wrapper contract behavior
- GET body handling parity (no business body contract)
- Error-handling parity semantics

## Strategy
- Execution model: Playwright API tests (Chrome project)
- Data strategy: inline
- Runtime auth: bearer token from env (ALLOY_BEARER_TOKEN, optional ALLOY_ADMIN_BEARER_TOKEN, ALLOY_JHID_BEARER_TOKEN)

## Scenarios

### TC004-S01 Admin/JHID retrieves all journey configs
1. Send GET /alloy-journey/config using available authorized token.
2. Validate status 200 on authorized environments; otherwise allow controlled auth denial.
3. Validate wrapper body shape and data list semantics when status is 200.

### TC004-S02 Unauthenticated request is denied
1. Send GET /alloy-journey/config with no Authorization header.
2. Validate 401/403 and non-5xx behavior.
3. Validate error payload is structured (object/string JSON), not transport failure.

### TC004-S03 Invalid role/token is denied
1. Send GET /alloy-journey/config with an invalid bearer token.
2. Validate 401/403 and non-5xx behavior.

### TC004-S04 GET with request body preserves controlled behavior
1. Send baseline GET with auth header (if available).
2. Send GET with unexpected JSON body.
3. Validate either parity success behavior or controlled 4xx/auth denial, never 5xx.

### TC004-S05 Contract consistency check
1. For successful response, verify wrapper has data and list-like payload.
2. For denied/error response, verify mapped structured payload and no unhandled 5xx.

## Expected Artifacts
- Plan: specs/Alloy/alloyJourney/TC004_GetAllJourneyConfigs-test-plan.md
- Test: tests/Alloy/alloyJourney/TC004_GetAllJourneyConfigs.spec.ts
- Report: final-reports/TC004_GetAllJourneyConfigs-<timestamp>.html
