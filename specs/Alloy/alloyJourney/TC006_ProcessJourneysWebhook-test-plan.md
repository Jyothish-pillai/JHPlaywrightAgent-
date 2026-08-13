# Test Plan: TC006_ProcessJourneysWebhook - Process Journeys Webhook

## Source
- User story: user-stories/Alloy/alloyJourney/TC006_ProcessJourneysWebhook.md
- OA Alloy base URL: http://172.25.1.45:32122
- Endpoint: POST /webhook/journeys
- External ingress note: /institution/{institutionId}/webhook/journeys internally rewrites to /webhook/journeys

## Scope
- Functional webhook acknowledgment behavior
- Signature validation behavior (Authorization HmacSHA256)
- Validation failures (malformed JSON, invalid signature, missing secret)
- Error handling and downstream failure propagation semantics
- RestResponse<Unit> wrapper behavior

## Strategy
- Execution model: Playwright API tests (Chrome project)
- Data strategy: inline raw JSON bodies and inline headers
- Environment-tolerant assertions where secret configuration/token inputs may vary

## Scenarios

### TC006-S01 Valid signed webhook acknowledgment
1. Build valid raw JSON payload.
2. Compute valid HmacSHA256 signature from payload using runtime secret.
3. POST /webhook/journeys with Authorization header.
4. Verify 200 + wrapped success response.

### TC006-S02 External ingress path rewrite parity
1. Send equivalent signed payload to /institution/{institutionId}/webhook/journeys.
2. Verify behavior parity with direct /webhook/journeys endpoint.

### TC006-S03 Missing Authorization signature rejected
1. Send valid raw payload without Authorization header.
2. Verify 400 + wrapped error behavior.

### TC006-S04 Invalid signature rejected
1. Send valid raw payload with intentionally bad signature.
2. Verify 400 + wrapped error behavior.

### TC006-S05 Malformed JSON rejected
1. Send malformed JSON payload.
2. Verify 400 + wrapped error behavior and non-5xx.

### TC006-S06 Missing secret configuration behavior
1. In environment without secret, send signed-like request.
2. Verify controlled 400 + wrapped error behavior.

### TC006-S07 Downstream failure status propagation
1. Send payload variant that triggers downstream Leaf failure (environment dependent).
2. Verify upstream status class propagates as expected and remains wrapped.

## Expected Artifacts
- Plan: specs/Alloy/alloyJourney/TC006_ProcessJourneysWebhook-test-plan.md
- Test: tests/Alloy/alloyJourney/TC006_ProcessJourneysWebhook.spec.ts
- Final report: final-reports/TC006_ProcessJourneysWebhook-<timestamp>.html
