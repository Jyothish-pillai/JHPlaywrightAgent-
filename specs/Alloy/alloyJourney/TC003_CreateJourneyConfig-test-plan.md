# Test Plan: TC003_CreateJourneyConfig

## Story
- Source: user-stories/Alloy/alloyJourney/TC003_CreateJourneyConfig.md
- Endpoint: POST /alloy-journey/config
- Base URL: http://172.25.1.45:32122

## Live Observation Notes
- Planner agent was invoked for this story.
- In this runtime, direct MCP browser planner tools were not exposed, so the plan is generated from the story contract and existing Alloy API behavior in this repo.
- Validation during execution is covered by the generated Playwright test to confirm runtime behavior.

## Acceptance Criteria Coverage
- Functional: create journey config and return DTO with server-generated journeyUuid.
- Authorization: only admin or jhid can create.
- Contract: response uses wrapped response format and expected success code behavior.
- Validation: malformed JSON and invalid payloads are rejected.
- Error handling: preserve helper-driven error response semantics and avoid unhandled failures.

## Scenarios

### TC003-S01 Authorized Create Config (Happy Path)
Preconditions:
1. Valid authorized session for role admin or jhid.

Steps:
1. Submit POST /alloy-journey/config with dtoJourneyConfig containing journeyToken, journeyName, and stepUpKey.
2. Capture HTTP status and response body.
3. Validate response wrapper and data content.

Expected:
1. HTTP 200.
2. Response includes data.journeyUuid.
3. data.journeyToken and data.journeyName match request.

### TC003-S02 Unauthorized Create Attempt
Preconditions:
1. No auth or invalid auth.

Steps:
1. Submit same valid payload without valid authorization.
2. Capture status/body.

Expected:
1. Request denied (401 or 403).
2. Error response is wrapped/structured, not an unhandled server crash.

### TC003-S03 Malformed JSON Rejected
Preconditions:
1. None.

Steps:
1. Send malformed JSON with Content-Type application/json.
2. Capture status/body.

Expected:
1. Client error (4xx), typically 400.
2. No 5xx crash.

### TC003-S04 Missing dtoJourneyConfig Rejected
Preconditions:
1. Authorized or unauthorized context accepted for this validation.

Steps:
1. Send POST with empty object payload.
2. Capture status/body.

Expected:
1. Validation or authorization failure (4xx).
2. No 5xx crash.

## Output Artifact Paths
- Plan: specs/Alloy/alloyJourney/TC003_CreateJourneyConfig-test-plan.md
- Test: tests/Alloy/alloyJourney/TC003_CreateJourneyConfig.spec.ts
- Execution report: final-reports/TC003_CreateJourneyConfig-<timestamp>.html (via custom reporter)
