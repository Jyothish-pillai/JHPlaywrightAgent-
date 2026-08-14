# API User Story – Retrieve a Post by ID

## User Story

**As an API consumer,**
I want to retrieve a specific post using its post ID,
so that I can verify that the API returns the correct post details and response metadata.

## Endpoint

**Method:** `GET`

**URL:** `https://jsonplaceholder.typicode.com/posts/1`

## Acceptance Criteria

1. The API should return HTTP status `200`.
2. The response `Content-Type` should contain `application/json`.
3. The response should contain an `id` field.
4. The `id` field should be equal to `1`.
5. The response should contain a `userId` field.
6. The `userId` field should be a number.
7. The response should contain a non-empty `title`.
8. The response should contain a non-empty `body`.
9. The `title` field should be a string.
10. The `body` field should be a string.

## Automation Requirements

Generate a Playwright TypeScript API test using the `request` fixture.

The test must contain **at least 5 meaningful assertions** covering status code, headers, response structure, field existence, field values, and data types.

Do not validate only the HTTP status code.
