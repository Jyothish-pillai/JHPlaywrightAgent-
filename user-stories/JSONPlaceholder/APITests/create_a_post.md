API User Story – Create a Post
User Story

As an API consumer,
I want to create a new post using the Posts API,
so that I can verify that the API accepts the request payload and returns the created post details.

Endpoint

Method: POST

URL: https://jsonplaceholder.typicode.com/posts

Request Headers
Content-Type: application/json
Request Body
{
  "title": "API Testing Post",
  "body": "This post was created for API automation testing.",
  "userId": 1
}
Acceptance Criteria
The API should return HTTP status 201 Created.
The response Content-Type should contain application/json.
The response should contain an id field.
The id field should be of type number.
The response should contain a title field.
The title field should equal API Testing Post.
The title field should be of type string.
The response should contain a body field.
The body field should equal This post was created for API automation testing..
The body field should be of type string.
The response should contain a userId field.
The userId field should equal 1.
The userId field should be of type number.

Expected Results – Create a Post
The API should return HTTP status 201 Created.
The response Content-Type should contain application/json.
The response should contain an id field, and its value should be a number.
The title field should equal API Testing Post.
The body field should equal This post was created for API automation testing..