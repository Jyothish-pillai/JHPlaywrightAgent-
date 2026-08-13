FR-008:  Get Dashboard Application Portal Link
Business Use Case
Generates a direct link to the Alloy dashboard for a specific journey application. This provides a convenient way for support staff or administrators to quickly access the Alloy dashboard for manual review or troubleshooting of a journey application.
Requirement
The system shall implement GET /alloy-journey/applications/{journeyApplicationUuid}/portal-link preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
GET	/alloy-journey/applications/{journeyApplicationUuid}/portal-link	Generates the Alloy dashboard URL for a locally known Journey application. The service looks up the stored Journey token and Journey application token, converts the configured Alloy Journeys API host to the dashboard host, and returns the URL string to callers.	Yes	service, jhid

Business Logic Steps
1.  Receive the local journey application UUID.
2.  Look up the stored Journey token and Journey application token for that UUID.
3.  Read the Alloy Journeys base URL from Vault-backed configuration.
4.  Convert the Alloy API/sandbox host into the dashboard application host.
5.  Build and return the dashboard URL string inside RestResponse<String>.

Request Schema
Field	Type	Required	Description
journeyApplicationUuid	UUID	Yes	The unique identifier of the journey application.

Response Schema  —  RestResponse<String> wrapper
Field	Type	Description
response	String	A URL that links to the Alloy dashboard for the specified application.

Acceptance Criteria
Type	Criterion
Functional	Given a valid `journeyApplicationUuid`, the system retrieves the application details from the local database, constructs a URL using the base URL from Vault and the application tokens, and returns the URL as a string.
Authorization	The caller must have one of the following roles: 'service', 'jhid'.
Contract	Successful responses are wrapped as RestResponse and returned via foldResponse; preserve helper-driven source behavior. Observed source success behavior includes HTTP 200.
Data Validation	Typed path binding enforces UUID path formats for route parameters; invalid UUID path values are rejected by framework binding.
Error Handling	GET /alloy-journey/applications/{journeyApplicationUuid}/portal-link preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics.

FR-009:  Add Person
Business Use Case
Adds a new person entity to an existing journey application and re-evaluates it. This is used for step-up authentication or collecting additional information, where a new person (e.g., a beneficial owner) needs to be added to an in-progress application.
Requirement
The system shall implement PUT /alloy-journey/applications/{journeyApplicationUuid}/add-person preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
PUT	/alloy-journey/applications/{journeyApplicationUuid}/add-person	Adds person information to an existing Journey application using Alloy Journeys rerun/update behavior. The service uses the existing local Journey application mapping, sends the person payload to Alloy Journeys, receives the refreshed Journey application reference, updates the locally stored application token, and returns the updated Journey application details to the caller.	Yes	service, jhid

Business Logic Steps
1.  Receive a local Journey application UUID and JourneysAddPersonRequest containing person entities.
2.  Look up the stored Journey application mapping.
3.  Send the new person entities to Alloy Journeys using the rerun/update behavior.
4.  Parse the new Journey application token returned by Alloy Journeys.
5.  Fetch the refreshed Journey application details, update the stored local application token, and return RestResponse<DtoJourneysApplication>.

Request Schema
Field	Type	Required	Description
journeyApplicationUuid	UUID	Yes	The unique identifier of the journey application to update.
request	JourneysAddPersonRequest	Yes	The request body containing the person entities to add.
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
response	DtoJourneysApplication	The updated state of the journey application after adding the new entity.
  ↳ applicationUuid	UUID	The local unique identifier for this journey application instance.
  ↳ journeyApplicationToken	String	The new token for this application, provided by Alloy after the update.
  ↳ journeyApplicationStatus	String	The current status of the journey application.
  ↳ entities	List<JourneyApplicationEntity>	The updated list of entities within this journey application.

Acceptance Criteria
Type	Criterion
Functional	Given a valid `journeyApplicationUuid` and person data, the system calls Alloy's rerun endpoint, receives a new application token, updates the local database with the new token, fetches the new application state from Alloy, and returns it.
Authorization	The caller must have one of the following roles: 'service', 'jhid'.
Contract	Successful responses are wrapped as RestResponse and returned via foldResponse; preserve helper-driven source behavior. Observed source success behavior includes HTTP 200.
Data Validation	Spring/Jackson binding rejects malformed JSON and type-mismatched request payloads before business logic executes. Typed path binding enforces UUID path formats for route parameters; invalid UUID path values are rejected by framework binding.
Error Handling	PUT /alloy-journey/applications/{journeyApplicationUuid}/add-person preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics.

FR-010:  Add Business
Business Use Case
Adds a new business entity to an existing journey application and re-evaluates it. This is used for step-up authentication or collecting additional information, where a new business entity needs to be added to an in-progress application.
Requirement
The system shall implement PUT /alloy-journey/applications/{journeyApplicationUuid}/add-business preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
PUT	/alloy-journey/applications/{journeyApplicationUuid}/add-business	Adds business information to an existing Journey application using Alloy Journeys rerun/update behavior. The service uses the existing local Journey application mapping, sends the business payload to Alloy Journeys, receives the refreshed Journey application reference, updates the locally stored application token, and returns the updated Journey application details to the caller.	Yes	service, jhid

Business Logic Steps
1.  Receive a local Journey application UUID and JourneysAddBusinessRequest containing business entities.
2.  Look up the stored Journey application mapping.
3.  Send the new business entities to Alloy Journeys using the rerun/update behavior.
4.  Parse the new Journey application token returned by Alloy Journeys.
5.  Fetch the refreshed Journey application details, update the stored local application token, and return RestResponse<DtoJourneysApplication>.

Request Schema
Field	Type	Required	Description
journeyApplicationUuid	UUID	Yes	The unique identifier of the journey application to update.
request	JourneysAddBusinessRequest	Yes	The request body containing the business entities to add.
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
response	DtoJourneysApplication	The updated state of the journey application after adding the new entity.
  ↳ applicationUuid	UUID	The local unique identifier for this journey application instance.
  ↳ journeyApplicationToken	String	The new token for this application, provided by Alloy after the update.
  ↳ journeyApplicationStatus	String	The current status of the journey application.
  ↳ entities	List<JourneyApplicationEntity>	The updated list of entities within this journey application.

Acceptance Criteria
Type	Criterion
Functional	Given a valid `journeyApplicationUuid` and business data, the system calls Alloy's rerun endpoint, receives a new application token, updates the local database with the new token, fetches the new application state from Alloy, and returns it.
Authorization	The caller must have one of the following roles: 'service', 'jhid'.
Contract	Successful responses are wrapped as RestResponse and returned via foldResponse; preserve helper-driven source behavior. Observed source success behavior includes HTTP 200.
Data Validation	Spring/Jackson binding rejects malformed JSON and type-mismatched request payloads before business logic executes. Typed path binding enforces UUID path formats for route parameters; invalid UUID path values are rejected by framework binding.
Error Handling	PUT /alloy-journey/applications/{journeyApplicationUuid}/add-business preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics.

FR-011:  Rerun Journey
Business Use Case
Triggers a re-evaluation of an existing journey application without adding new entities. This is used to re-process an application, for example, after underlying data has been corrected or when a manual trigger is required to re-evaluate against the latest workflow rules.
Requirement
The system shall implement POST /alloy-journey/applications/{journeyApplicationUuid}/rerun preserving the request schema, response schema, HTTP status codes, and business behaviour of the legacy Kotlin service.
Linked API Specification
Method	Endpoint	Business Purpose	Auth Required	Roles
POST	/alloy-journey/applications/{journeyApplicationUuid}/rerun	Triggers a re-evaluation of an existing journey application without adding new entities. This is used to re-process an application, for example, after underlying data has been corrected or when a manual trigger is required to re-evaluate against the latest workflow rules.	Yes	service, jhid

Business Logic Steps
1.  Load the local JourneyApplication mapping by applicationUuid.
2.  POST {} to the Alloy Journeys rerun endpoint.
3.  Parse the new journey_application_token, update alloy_journey_applications, and return DtoJourneyRerun.

Request Schema
Field	Type	Required	Description
journeyApplicationUuid	UUID	Yes	The unique identifier of the journey application to rerun.

Response Schema  —  RestResponse<DtoJourneyRerun> wrapper
Field	Type	Description
response	DtoJourneyRerun	The result of the rerun operation, containing the new application token.
  ↳ journeyApplicationToken	String	The new token for the journey application after being re-run.

Acceptance Criteria
Type	Criterion
Functional	Given a valid `journeyApplicationUuid`, the system calls the external Alloy rerun endpoint, receives a new application token, updates the `alloy_journey_applications` table with the new token, and returns the new token.
Authorization	The caller must have one of the following roles: 'service', 'jhid'.
Contract	Successful responses are wrapped as RestResponse and returned via foldResponse; preserve helper-driven source behavior. Observed source success behavior includes HTTP 200.
Data Validation	Typed path binding enforces UUID path formats for route parameters; invalid UUID path values are rejected by framework binding.
Error Handling	POST /alloy-journey/applications/{journeyApplicationUuid}/rerun preserves error behavior parity with the source Kotlin service, including status behavior and error payload semantics.