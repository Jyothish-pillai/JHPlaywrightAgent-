launchpadBaseUrl : http://172.25.1.45:31335
oaAlloyBaseUrl : http://172.25.1.45:32122

# Authenticate using launchpad : 
POST http://<launchpadBaseUrl>/authenticate
Content-Type: application/json
Request body:
{
  "login": "sa",
  "password": "Password",
  "deviceGuid": "BootstrapGUID",
  "latitude": 0.0,
  "longitude": 0.0,
  "locationAccuracyMeters": 1.0
}
# Build The BOLTS Authorization Header
Use the apitoken from Launchpad in this header for oa-alloy API calls:
Authorization: BOLTS apitoken="<apitoken>", gps="0;0;1", deviceguid="BootstrapGUID", login="sa"
Content-Type: application/json

FR-014:  Get All Journey Configs
GET http://<oaAlloyBaseUrl>/alloy-journey/config

Business Use Case
Retrieves a list of all existing Alloy journey configurations. This provides a complete overview of all configured journeys in the system.
Requirement
The system shall implement GET /alloy-journey/config preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
GET	/alloy-journey/config	Retrieves a list of all existing Alloy journey configurations. This provides a complete overview of all configured journeys in the system.	Yes	admin, jhid

Business Logic Steps
1.  Read all Journey configuration rows from alloy_journeys.
2.  Convert the local JourneyConfig records to DTOJourneyConfig values.
3.  Return the complete list in RestResponse<List<DTOJourneyConfig?>>.
4.  Do not describe pagination, sorting, or visibility rules because the current endpoint has no page, size, sort, or visibility parameters.

Response Schema  —  RestResponse<List<DTOJourneyConfig?>> wrapper
Field	Type	Description
data	List<DTOJourneyConfig?>	A list of all journey configurations. Per the source code, individual items in the list may be null.
  ↳ journeyUuid	UUID	
  ↳ journeyToken	String	
  ↳ journeyName	String	
  ↳ stepUpKey	String	

Acceptance Criteria
Type	Criterion
Functional	The system retrieves all journey configurations from the database and returns them as a list of 'DTOJourneyConfig' objects.
Authorization	The caller must have either the 'admin' or 'jhid' role.
Contract	Successful responses use RestResponse<List<DTOJourneyConfig?> wrapper behavior from source evidence. Observed source success behavior includes HTTP 200.
Data Validation	GET /alloy-journey/config accepts no request body in the current service contract; preserve existing route and wrapper behavior.
Error Handling	GET /alloy-journey/config preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics. Error responses are mediated through foldResponse/foldToRestResponse/asRestResponse RestResponse wrappers; preserve helper-driven error mapping behavior.
Actual Responses needs to be validated against Expected Responses