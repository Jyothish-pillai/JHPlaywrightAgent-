http://172.25.1.45:32122


FR-015:  Update Journey Config
Business Use Case
Updates an existing Alloy journey configuration. This allows for modifying the details of an existing journey, such as its name or token.
Requirement
The system shall implement PUT /alloy-journey/config/{journeyUuid} preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
PUT	/alloy-journey/config/{journeyUuid}	Updates an existing Alloy journey configuration. This allows for modifying the details of an existing journey, such as its name or token.	Yes	admin, jhid

Business Logic Steps
1.  Validate that the route journeyUuid exists in alloy_journeys.
2.  Reject mismatched route/body journeyUuid values with ALLOY_JOURNEY_UUID_MISMATCH.
3.  Convert DTOJourneyConfig to JourneyConfig and update the persisted record.

Request Schema
Field	Type	Required	Description
journeyUuid	UUID	Yes	The unique identifier of the journey configuration to update.
dtoJourneyConfig	DTOJourneyConfig	Yes	The updated configuration details for the journey. The 'journeyUuid' in this object must match the 'journeyUuid' in the path.
  ↳ journeyUuid	UUID		
  ↳ journeyToken	String		
  ↳ journeyName	String		
  ↳ stepUpKey	String		

Response Schema  —  RestResponse<DTOJourneyConfig?> wrapper
Field	Type	Description
data	DTOJourneyConfig?	The updated journey configuration.
  ↳ journeyUuid	UUID	
  ↳ journeyToken	String	
  ↳ journeyName	String	
  ↳ stepUpKey	String	

Acceptance Criteria
Type	Criterion
Functional	Given a valid and existing 'journeyUuid' and a valid 'DTOJourneyConfig' body, the system updates the corresponding journey configuration in the database and returns the updated object.
Authorization	The caller must have either the 'admin' or 'jhid' role.
Contract	Successful responses use RestResponse<DTOJourneyConfig?> wrapper behavior from source evidence. Observed source success behavior includes HTTP 200.
Data Validation	Path binding validates journeyUuid as a UUID. Spring/Jackson/Kotlin binding handles malformed JSON, type mismatches, and missing non-null DTOJourneyConfig constructor values. JourneysPathValidationService validates that the path journeyUuid exists before update runs. JourneysConfigManager rejects route/body journeyUuid mismatches with ALLOY_JOURNEY_UUID_MISMATCH.
Error Handling	PUT /alloy-journey/config/{journeyUuid} preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics. Error responses are mediated through foldResponse/foldToRestResponse/asRestResponse RestResponse wrappers; preserve helper-driven error mapping behavior. Gateway and manager failure paths use RestError mappings; preserve RestError-compatible error payload behavior. UUID-path resource checks via path-validation services return not-found responses when referenced journey resources are absent.