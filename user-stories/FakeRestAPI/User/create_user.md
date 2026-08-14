# Create a New User with Valid Data

## User Story

As an API user, I want to create a new user with valid username and password so that the user is successfully created.

## API Details

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Method         | `POST`                                               |
| Base URL       | `https://fakerestapi.azurewebsites.net`              |
| Endpoint       | `/api/v1/Users`                                      |
| Full URL       | `https://fakerestapi.azurewebsites.net/api/v1/Users` |
| Authentication | Not required                                         |
| Content-Type   | `application/json`                                   |
| Accept         | `application/json`                                   |

## Request Headers

```text
Content-Type: application/json
Accept: application/json
```

## Request Body

```json
{
  "id": 0,
  "userName": "testuser",
  "password": "Test@123"
}
```

## Acceptance Criteria

1. API should accept a `POST` request to `/api/v1/Users`.
2. Request should contain valid JSON.
3. Request should contain `id`, `userName`, and `password`.
4. API should return a successful HTTP status code.
5. Response should have `application/json` content type.
6. Response should contain the `id` field.
7. Response `id` should be an integer.
8. Response should contain the `userName` field.
9. Response `userName` should match the request.
10. Response should contain the `password` field.
11. Response `password` should match the request.
12. Response should follow the expected user schema.

### Assertions

1. Verify the status code is successful.
2. Verify `Content-Type` is `application/json`.
3. Verify the response contains `id`.
4. Verify `id` is an integer.
5. Verify the response contains `userName`.
6. Verify `userName` is `testuser`.
7. Verify the response contains `password`.
8. Verify `password` is `Test@123`.

