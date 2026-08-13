launchpadBaseUrl : http://172.25.1.45:31335
oaAlloyBaseUrl : http://172.25.1.45:32122

FR-018:  Process Journeys Webhook
Business Use Case
Receives and processes webhook notifications from the Alloy service regarding journey status updates. It validates the request's authenticity before forwarding the data to a downstream system for further processing. This endpoint is critical for receiving real-time updates about customer identity verification and journey progression from the Alloy service.
Requirement
The system shall implement POST /webhook/journeys preserving the request schema, response schema, HTTP status codes, and business behavior of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
POST	/webhook/journeys	Receives and processes webhook notifications from the Alloy service regarding journey status updates. It validates the request's authenticity before forwarding the data to a downstream system for further processing. This endpoint is critical for receiving real-time updates about customer identity verification and journey progression from the Alloy service.	No	public

Business Logic Steps
1.  Accept the external /institution/{institutionId}/webhook/journeys ingress, which InstitutionIdFilter rewrites internally to /webhook/journeys.
2.  Pass the raw body and Authorization header to JourneysWebhookManager.
3.  Validate the webhook payload with the shared-secret HMAC and return HTTP 400 for invalid JSON, missing secret, or bad signature.
4.  Convert the payload to DtoJourneysWebhook, call Leaf, and surface the Leaf response status so Alloy can retry when appropriate.

Request Schema
Field	Type	Required	Description
webhookDataString	String	Yes	The raw JSON payload from the Alloy webhook, which is parsed into a JourneysWebhook object.

Response Schema  —  RestResponse<Unit> wrapper
Field	Type	Description
response	Unit	A standard API response wrapper. On success, the body is minimal and indicates acknowledgment of the webhook. On failure, it contains a RestError object with details about the failure.

Acceptance Criteria
Type	Criterion
Functional	Upon receiving a valid and authentic webhook notification from Alloy, the system forwards the payload to the internal Leaf service for processing and returns an HTTP 200 OK status to Alloy.
Authorization	The request must include an 'Authorization' header containing a valid HmacSHA256 signature of the request body. Requests with missing or invalid signatures are rejected with an HTTP 400 Bad Request.
Contract	Successful responses use RestResponse<Unit> wrapper behavior and preserve current HTTP 200 acknowledgement semantics. Observed source success behavior includes HTTP 200.
Data Validation	Webhook payload is processed from the raw request body string and Authorization signature inside manager logic. Malformed payloads, missing webhook secret configuration, or invalid signatures return HTTP 400 behavior.
Error Handling	POST /webhook/journeys preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics. Error responses are returned in RestResponse wrappers; preserve wrapped error payload behavior. Gateway and manager failure paths use RestError mappings; preserve RestError-compatible error payload behavior. Webhook parse failures, missing client-secret configuration, and invalid signature checks return HTTP 400 behavior. Downstream Leaf webhook failures propagate upstream status behavior to support retry semantics.

