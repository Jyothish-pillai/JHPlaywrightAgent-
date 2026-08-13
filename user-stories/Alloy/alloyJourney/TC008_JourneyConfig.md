FR-004:  Get Journey Config For Application
Business Use Case
Retrieves the journey configuration associated with a specific journey application. This allows services to look up the static configuration of a journey based on a running instance of that journey (an application).
Requirement
The system shall implement GET /alloy-journey/applications/{applicationUuid}/config preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
GET	/alloy-journey/applications/{applicationUuid}/config	Retrieves the journey configuration associated with a specific journey application. This allows services to look up the static configuration of a journey based on a running instance of that journey (an application).	Yes	service, jhid

Business Logic Steps
1.  Call JourneysConfigManager.getConfigByApplicationUuid(applicationUuid).
2.  Join alloy_journeys and alloy_journey_applications on journey_token.
3.  Return the matching DTOJourneyConfig? wrapped with asRestResponse() without an external Alloy call.

Request Schema
Field	Type	Required	Description
applicationUuid	UUID	Yes	The unique identifier of the journey application.

Response Schema  —  RestResponse<DTOJourneyConfig> wrapper
Field	Type	Description
response	DTOJourneyConfig	The journey configuration details.
  ↳ journeyUuid	UUID	The unique identifier for the journey configuration.
  ↳ journeyToken	String	The token provided by Alloy for this journey.
  ↳ journeyName	String	A human-readable name for the journey.
  ↳ stepUpKey	String	A key used for step-up authentication processes, if applicable.

Acceptance Criteria
Type	Criterion
Functional	Given a valid `applicationUuid` that exists in the `alloy_journey_applications` table and is linked to a configuration in `alloy_journeys`, the system returns the corresponding journey configuration.
Authorization	The caller must have one of the following roles: 'service', 'jhid'.
Contract	Successful responses are wrapped as RestResponse and returned via asRestResponse; preserve helper-driven source behavior. Observed source success behavior includes HTTP 200.
Data Validation	Typed path binding enforces UUID path formats for route parameters; invalid UUID path values are rejected by framework binding.
Error Handling	GET /alloy-journey/applications/{applicationUuid}/config preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics.

FR-005:  Start Person Journey
Business Use Case
Starts a new Alloy journey for one or more person entities. This is the entry point for initiating a verification or onboarding process for an individual within the Alloy platform.
Requirement
The system shall implement POST /alloy-journey/{journeyConfigUuid}/start-person preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
POST	/alloy-journey/{journeyConfigUuid}/start-person	Starts a new Alloy journey for one or more person entities. This is the entry point for initiating a verification or onboarding process for an individual within the Alloy platform.	Yes	service, jhid

Business Logic Steps
1.  Read the Alloy Journeys base URL from Vault.
2.  Resolve the local journey token from alloy_journeys using the requested journey UUID.
3.  POST the start-person payload to /journeys/{journeyToken}/applications.
4.  Insert the returned journey_application_token into alloy_journey_applications and return DtoJourneysApplication with the local applicationUuid.

Request Schema
Field	Type	Required	Description
journeyConfigUuid	UUID	Yes	The unique identifier of the journey configuration to use.
request	JourneysStartPersonRequest	Yes	The request body containing the person entities to include in the journey.
  ↳ do_await_additional_entities	Boolean		
  ↳ entities	List<Person>		
    ↳ external_entity_id	String		
    ↳ entity_type	String		
    ↳ branch_name	String		
    ↳ data	PersonData		
      ↳ name_first	String		
      ↳ name_middle	String		
      ↳ name_last	String		
      ↳ birth_date	String		
      ↳ document_ssn	String		
      ↳ email_address	String		
      ↳ phone_number	String		
      ↳ ip_address_v4	String		
      ↳ addresses	List<Address>		
        ↳ type	String		
        ↳ line_1	String		
        ↳ line_2	String		
        ↳ city	String		
        ↳ state	String		
        ↳ postal_code	String		
        ↳ country_code	String		

Response Schema  —  RestResponse<DtoJourneysApplication> wrapper
Field	Type	Description
response	DtoJourneysApplication	The newly created journey application details.
  ↳ applicationUuid	UUID	The local unique identifier for this journey application instance.
  ↳ journeyApplicationToken	String	The token for this application, provided by Alloy.
  ↳ journeyApplicationStatus	String	The current status of the journey application (e.g., 'pending', 'completed').
  ↳ entities	List<JourneyApplicationEntity>	A list of entities within this journey application and their statuses.

Acceptance Criteria
Type	Criterion
Functional	Given a valid `journeyConfigUuid` and a request body with person entities, the system successfully calls the external Alloy API to start a journey, creates a new record in the `alloy_journey_applications` table, and returns the application details.
Authorization	The caller must have one of the following roles: 'service', 'jhid'.
Contract	Successful responses are wrapped as RestResponse and returned via foldResponse; preserve helper-driven source behavior. Observed source success behavior includes HTTP 200.
Data Validation	Spring/Jackson binding rejects malformed JSON and type-mismatched request payloads before business logic executes. Typed path binding enforces UUID path formats for route parameters; invalid UUID path values are rejected by framework binding.
Error Handling	POST /alloy-journey/{journeyConfigUuid}/start-person preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics.

FR-006:  Start Business Journey
Business Use Case
Starts a new Alloy journey for one or more business entities. This is the entry point for initiating a verification or onboarding process for a business within the Alloy platform.
Requirement
The system shall implement POST /alloy-journey/{journeyConfigUuid}/start-business preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
POST	/alloy-journey/{journeyConfigUuid}/start-business	Starts a new Alloy journey for one or more business entities. This is the entry point for initiating a verification or onboarding process for a business within the Alloy platform.	Yes	service, jhid

Business Logic Steps
1.  Read the Alloy Journeys base URL from Vault.
2.  Resolve the local journey token from alloy_journeys using the requested journey UUID.
3.  POST the start-business payload to /journeys/{journeyToken}/applications.
4.  Insert the returned journey_application_token into alloy_journey_applications and return DtoJourneysApplication with the local applicationUuid.

Request Schema
Field	Type	Required	Description
journeyConfigUuid	UUID	Yes	The unique identifier of the journey configuration to use.
request	JourneysStartBusinessRequest	Yes	The request body containing the business entities to include in the journey.
  ↳ do_await_additional_entities	Boolean		
  ↳ entities	List<Business>		
    ↳ external_entity_id	String		
    ↳ entity_type	String		
    ↳ branch_name	String		
    ↳ data	BusinessData		
      ↳ business_name	String		
      ↳ business_federal_ein	String		
      ↳ business_phone_number	String		
      ↳ business_url	String		
      ↳ business_type	String		
      ↳ addresses	List<Address>		
        ↳ type	String		
        ↳ line_1	String		
        ↳ line_2	String		
        ↳ city	String		
        ↳ state	String		
        ↳ postal_code	String		
        ↳ country_code	String		
      ↳ representatives	List<BusinessRepresentative>		
        ↳ name_first	String		
        ↳ name_middle	String		
        ↳ name_last	String		
        ↳ type	String		
        ↳ birth_date	String		
        ↳ document_ssn	String		
        ↳ email_address	String		
        ↳ phone_number	String		
        ↳ ownership_percentage	Int		
        ↳ addresses	List<Address>		

Response Schema  —  RestResponse<DtoJourneysApplication> wrapper
Field	Type	Description
response	DtoJourneysApplication	The newly created journey application details.
  ↳ applicationUuid	UUID	The local unique identifier for this journey application instance.
  ↳ journeyApplicationToken	String	The token for this application, provided by Alloy.
  ↳ journeyApplicationStatus	String	The current status of the journey application (e.g., 'pending', 'completed').
  ↳ entities	List<JourneyApplicationEntity>	A list of entities within this journey application and their statuses.

Acceptance Criteria
Type	Criterion
Functional	Given a valid `journeyConfigUuid` and a request body with business entities, the system successfully calls the external Alloy API to start a journey, creates a new record in the `alloy_journey_applications` table, and returns the application details.
Authorization	The caller must have one of the following roles: 'service', 'jhid'.
Contract	Successful responses are wrapped as RestResponse and returned via foldResponse; preserve helper-driven source behavior. Observed source success behavior includes HTTP 200.
Data Validation	Spring/Jackson binding rejects malformed JSON and type-mismatched request payloads before business logic executes. Typed path binding enforces UUID path formats for route parameters; invalid UUID path values are rejected by framework binding.
Error Handling	POST /alloy-journey/{journeyConfigUuid}/start-business preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics.

FR-007:  Get Journey
Business Use Case
Retrieves the current state and details of an existing journey application from Alloy. This endpoint allows for polling or fetching the latest status of an ongoing or completed journey application to make business decisions.
Requirement
The system shall implement GET /alloy-journey/applications/{journeyApplicationUuid} preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
GET	/alloy-journey/applications/{journeyApplicationUuid}	Retrieves the current state and details of an existing journey application from Alloy. This endpoint allows for polling or fetching the latest status of an ongoing or completed journey application to make business decisions.	Yes	service, jhid

Business Logic Steps
1.  Load the local JourneyApplication mapping by applicationUuid.
2.  Return JOURNEY_APPLICATION_NOT_FOUND when no local mapping exists.
3.  Use the stored journeyToken and journeyApplicationToken to fetch the downstream application from Alloy Journeys.
4.  Map the response payload to DtoJourneysApplication and return foldResponse().

Request Schema
Field	Type	Required	Description
journeyApplicationUuid	UUID	Yes	The unique identifier of the journey application to retrieve.

Response Schema  —  RestResponse<DtoJourneysApplication> wrapper
Field	Type	Description
response	DtoJourneysApplication	The current state of the journey application.
  ↳ applicationUuid	UUID	The local unique identifier for this journey application instance.
  ↳ journeyApplicationToken	String	The token for this application, provided by Alloy.
  ↳ journeyApplicationStatus	String	The current status of the journey application (e.g., 'pending', 'completed').
  ↳ entities	List<JourneyApplicationEntity>	A list of entities within this journey application and their statuses.

Acceptance Criteria
Type	Criterion
Functional	Given a valid `journeyApplicationUuid`, the system retrieves the corresponding journey and application tokens from the local database, calls the external Alloy API, and returns the mapped application details.
Authorization	The caller must have one of the following roles: 'service', 'jhid'.
Contract	Successful responses are wrapped as RestResponse and returned via foldResponse; preserve helper-driven source behavior. Observed source success behavior includes HTTP 200.
Data Validation	Typed path binding enforces UUID path formats for route parameters; invalid UUID path values are rejected by framework binding.
Error Handling	GET /alloy-journey/applications/{journeyApplicationUuid} preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics. Missing journey-application scenarios are surfaced with JOURNEY_APPLICATION_NOT_FOUND not-found behavior.

