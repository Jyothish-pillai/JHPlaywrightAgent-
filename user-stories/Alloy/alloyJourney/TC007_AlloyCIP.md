launchpadBaseUrl : http://172.25.1.45:31335
oaAlloyBaseUrl : http://172.25.1.45:32122

FR-001:  Run Alloy Service
Business Use Case
The endpoint builds an AlloyRequest from route identifiers and run context, then delegates execution to AlloyCipManager.run. The manager retrieves Alloy parameters, resolves required values through tag-resolution flows, validates required tags, and applies feature-flag gating before evaluation. Execution honors LaunchDarkly gating behavior where configured for blocking decisions. Evaluation output is mapped into AlloyCipResponse and returned through the service response-wrapper pipeline. AlloyRunRequest carries run-context inputs for evaluation orchestration; it is not the full applicant master record payload.
Requirement
The system shall implement POST /workspace/{workspaceUUID}/enrollment/{enrollmentId}/applicant/{applicantId}/cip/{cipId}/alloy preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
POST	/workspace/{workspaceUUID}/enrollment/{enrollmentId}/applicant/{applicantId}/cip/{cipId}/alloy	Runs a Classic Alloy CIP evaluation for the route applicant/context. The service builds an AlloyRequest from the path identifiers and AlloyRunRequest, retrieves Alloy parameters, resolves required values through Leaf/boltsbranch tag flows, validates required tags, submits the evaluation to Alloy, optionally polls pending evaluations when the LaunchDarkly blocking flag is enabled, and returns AlloyCipResponse in a RestResponse wrapper. The current service does not persist a local CIP/evaluation link in oa-alloy	Yes	service, jhid

Business Logic Steps
1.  Select the Classic Alloy WebClient gateway using applicant type and the ALLOY_STAGING flag.
2.  Read Classic Alloy Basic Auth credentials from service properties and call Alloy /v1/parameters.
3.  Resolve Alloy parameters into AlloyTag values using Leaf / boltsbranch clients and request-scoped caches.
4.  Validate the resolved tag set so required missing values raise MissingTagValue while optional null tags are skipped.
5.  Read the oa-alloy-block-on-pending-webhook LaunchDarkly flag, post the evaluation to Alloy /v1/evaluations, and poll GET /v1/evaluations/{evaluationToken} while Alloy reports pending when blocking is enabled.

Request Schema
Field	Type	Required	Description
workspaceUUID	UUID	Yes	The unique identifier for the workspace.
enrollmentId	Int	Yes	The unique identifier for the enrollment.
applicantId	Int	Yes	The unique identifier for the applicant.
cipId	Int	Yes	The unique identifier for the CIP process.
evaluationRequest	AlloyRunRequest	Yes	AlloyRunRequest carries run context (userIpAddressV4, userIpAddressV6, applicantType); applicant/business/contact data is resolved by the service from Leaf/boltsbranch based on required Alloy parameters.
  ↳ userIpAddressV4	String		
  ↳ userIpAddressV6	String		
  ↳ applicantType	ApplicantType		

Response Schema  —  RestResponse<AlloyCipResponse> wrapper
Field	Type	Description
body	AlloyCipResponse	The response from the Alloy CIP evaluation.
  ↳ result	String	The overall result of the evaluation (e.g., 'Approved', 'Denied').
  ↳ score	Double	The risk score assigned by the evaluation.
  ↳ rawResponse	String	The complete, raw JSON response from the underlying Alloy service.
  ↳ servicesRun	List<String>	A list of the specific verification services that were executed.
  ↳ evaluationToken	String	A unique token identifying this specific evaluation.
  ↳ entityToken	String	A unique token identifying the entity (applicant) that was evaluated.

Acceptance Criteria
Type	Criterion
Functional	Upon successful execution, the system determines the correct Alloy API endpoint (sandbox or production) and credentials based on service properties. It queries the Alloy '/v1/parameters' endpoint to get a list of required and optional data points. It then resolves these data points by fetching applicant information from various internal microservices. The collected data is sent to Alloy's '/v1/evaluations' endpoint. If a feature flag is enabled and Alloy returns a pending status (202), the service will poll the '/v1/evaluations/{evaluationToken}' endpoint until a final result is obtained. The final evaluation data is then mapped to an AlloyCipResponse and returned.
Authorization	The caller must be authenticated and possess either the 'service' or 'jhid' role.
Contract	Successful responses use RestResponse<AlloyCipResponse> wrapper behavior from source evidence. Observed source success behavior includes HTTP 200.
Data Validation	Spring/Jackson binding rejects malformed JSON and type-mismatched AlloyRunRequest payloads before business logic executes. Path binding validates workspaceUUID as UUID and enrollmentId/applicantId/cipId as Int values. Applicant/business/contact validation is primarily enforced through Alloy parameter and tag resolution flow rather than a local applicant DTO validator.
Error Handling	POST /workspace/{workspaceUUID}/enrollment/{enrollmentId}/applicant/{applicantId}/cip/{cipId}/alloy preserves Classic CIP error behavior parity with the source Kotlin service, including helper-driven RestResponse error wrapper semantics from foldResponse/foldToRestResponse/asRestResponse. Missing required Alloy tag values, Alloy gateway failures, Leaf/boltsbranch lookup failures, and LaunchDarkly-gated pending evaluation behavior should preserve the source status and payload mapping evidenced by the current service.


FR-002:  Update Alloy Service
Business Use Case
This endpoint exists to preserve the current source route during modernization. The current Kotlin service does not implement a functional CIP update flow: callers do not send a request body, no corrected applicant data or questionnaire answers are submitted, and no downstream Alloy re-evaluation is performed. The route delegates to AlloyCipManager.update and returns the current placeholder AlloyCipResponse payload.
Requirement
The system shall implement PUT /workspace/{workspaceUUID}/enrollment/{enrollmentId}/applicant/{applicantId}/cip/{cipId}/alloy preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
PUT	/workspace/{workspaceUUID}/enrollment/{enrollmentId}/applicant/{applicantId}/cip/{cipId}/alloy	Exposes the existing Alloy CIP update route for source-contract parity. The current implementation is a placeholder/TODO, accepts no request body, performs no downstream Alloy update, and returns the current placeholder AlloyCipResponse behavior.	Yes	service, jhid

Business Logic Steps
1. Accept the exposed Alloy CIP update request through the current PUT route.
2. Delegate to AlloyCipManager.update as the current placeholder/TODO hook.
3. Accept no request body and perform no downstream Alloy update, rerun, or evaluation in the current implementation.
4. Return the current placeholder AlloyCipResponse behavior through the standard RestResponse wrapper.
5. Preserve the route for source-contract parity until an explicit target-state CIP update behavior is approved.


Request Schema
Field	Type	Required	Description
workspaceUUID	UUID	Yes	The unique identifier for the workspace.
enrollmentId	Int	Yes	The unique identifier for the enrollment.
applicantId	Int	Yes	The unique identifier for the applicant.
cipId	Int	Yes	The unique identifier for the CIP process.

Response Schema  —  RestResponse<AlloyCipResponse> wrapper
Field	Type	Description
body	AlloyCipResponse	A placeholder response. All fields will be null in the current implementation.
  ↳ result	String	The overall result of the evaluation. Currently returns null.
  ↳ score	Double	The risk score assigned by the evaluation. Currently returns null.
  ↳ rawResponse	String	The complete, raw JSON response from the underlying Alloy service. Currently returns null.
  ↳ servicesRun	List<String>	A list of the specific verification services that were executed. Currently returns null.
  ↳ evaluationToken	String	A unique token identifying this specific evaluation. Currently returns null.
  ↳ entityToken	String	A unique token identifying the entity (applicant) that was evaluated. Currently returns null.

Acceptance Criteria
Type	Criterion
Functional	The current implementation is a placeholder (stub) marked with 'todo'. It accepts the request and immediately returns a RestResponse containing an AlloyCipResponse object where all fields are null. It does not perform any logic or interact with any other services.
Authorization	The caller must be authenticated and possess either the 'service' or 'jhid' role.
Contract	Successful responses use RestResponse<AlloyCipResponse> wrapper behavior from source evidence. Observed source success behavior includes HTTP 200.
Data Validation	Path binding validates workspaceUUID as UUID and enrollmentId/applicantId/cipId as Int values. This endpoint accepts no request body in the current service contract.
Error Handling	PUT /workspace/{workspaceUUID}/enrollment/{enrollmentId}/applicant/{applicantId}/cip/{cipId}/alloy preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics. Error responses are returned in RestResponse wrappers; preserve wrapped error payload behavior.

