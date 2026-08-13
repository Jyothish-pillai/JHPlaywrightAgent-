# Test Plan: TC007_AlloyCIP - Run and Update Alloy CIP APIs

## Source
- User story: user-stories/Alloy/alloyJourney/TC007_AlloyCIP.md
- Base URL: http://172.25.1.45:32122

## Routes
- POST /workspace/{workspaceUUID}/enrollment/{enrollmentId}/applicant/{applicantId}/cip/{cipId}/alloy
- PUT /workspace/{workspaceUUID}/enrollment/{enrollmentId}/applicant/{applicantId}/cip/{cipId}/alloy

## Scope
- Functional behavior for run endpoint and update placeholder endpoint
- Authorization behavior for service and jhid roles
- RestResponse wrapper contract behavior
- Path binding and payload validation
- Error handling parity behavior

## Strategy
- Execution model: Playwright API tests on Chrome project
- Data strategy: inline
- Environment tolerance: accept controlled auth/validation status variants, always fail on unhandled 5xx

## Scenarios

### TC007-S01 POST run with valid path and body
1. Send POST with valid path params and AlloyRunRequest-like body.
2. Verify status class is controlled (success/auth/validation) and response is structured.

### TC007-S02 POST authorization behavior
1. Send POST with available token.
2. Send POST without token.
3. Verify authorized call is controlled and missing token is denied.

### TC007-S03 POST malformed/type-mismatch payload validation
1. Send malformed JSON body.
2. Send body with type mismatches.
3. Verify controlled 4xx/auth outcomes and non-5xx.

### TC007-S04 POST path validation
1. Send POST with invalid workspace UUID format.
2. Verify controlled path/auth failure and non-5xx.

### TC007-S05 PUT placeholder behavior
1. Send PUT with valid path and no body.
2. Verify controlled status and structured wrapper payload.

### TC007-S06 PUT authorization behavior
1. Send PUT with available token.
2. Send PUT without token.
3. Verify missing token denied and no unhandled 5xx.

### TC007-S07 PUT path validation
1. Send PUT with invalid path identifiers.
2. Verify controlled 4xx/auth outcomes and non-5xx.

### TC007-S08 PUT body-handling parity
1. Send PUT with unexpected JSON body.
2. Verify controlled behavior and structured payload, no 5xx.

## Expected Artifacts
- Plan: specs/Alloy/alloyJourney/TC007_AlloyCIP-test-plan.md
- Test: tests/Alloy/alloyJourney/TC007_AlloyCIP.spec.ts
- Report: final-reports/TC007_AlloyCIP-<timestamp>.html
