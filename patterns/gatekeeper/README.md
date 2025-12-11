# Pattern: The Gatekeeper

This project provides a solid foundation for implementing Serverless Microservice Patterns with AWS Lambda functions using Node.js and TypeScript. The project uses the AWS CDK for infrastructure as code, Jest for testing, and modern development tooling.

There are many Serverless Microservice Patterns which may be implemented with AWS Lambda functions. This project illustrates the "Gatekeeper" pattern. The Gatekeeper builds on the "Simple Web Service", adding an Authorization microservice to authenticate and authorize API requests. In the Gatekeeper pattern, an API Gateway Token Authorizer intercepts all incoming requests and delegates the authorization decision to the Auth Service. Only requests with valid authorization tokens are permitted to reach the Task Service endpoints.

This pattern demonstrates how to implement a centralized authorization layer that protects multiple backend services. The Token Authorizer acts as a gatekeeper, validating tokens and determining which requests are allowed to proceed to the protected resources.

![Design diagram](../../docs/img/gatekeeper.png "The Gatekeeper Pattern")

## What's inside

### Task Service

The **Task Service** is a complete microservice that provides task management functionality. This service is shared across multiple patterns and is the same Task Service used in the "Simple Web Service" pattern. It exposes functions to:

- Create new tasks
- Retrieve a specific task
- List all tasks
- Update existing tasks
- Delete tasks

The Task Service functions interact with a DynamoDB table to persist task data.

### Auth Service

The **Auth Service** is a specialized microservice that secures access to the Task Service API using token-based authorization. This service implements an API Gateway Token Authorizer that validates incoming requests before they reach the Task Service. It provides:

- **Token Validation** - Validates authorization tokens from API requests
- **Token-Based Authorization** - Implements a custom token validation logic to authenticate requests
- **IAM Policy Generation** - Generates AWS IAM policies to allow or deny access to protected resources
- **Context Passing** - Passes validated user context to downstream services for per-request authorization decisions

The Auth Service leverages AWS API Gateway's token authorizer capability to act as a gatekeeper, allowing only authenticated requests to reach the Task Service endpoints.

### The Gatekeeper Pattern in Action

The key demonstration of the Gatekeeper pattern occurs when an API request is made to the Task Service. Before the request reaches the Task Service Lambda functions, API Gateway invokes the Auth Service's Token Authorizer. The authorizer validates the authorization token provided in the request header and generates an IAM policy. If the token is valid, the policy allows access to the Task Service resources. If the token is invalid, the policy denies access and the request is rejected.

This pattern ensures that all requests to protected resources are authenticated before they reach the backend services, providing a centralized security layer across your microservice architecture while maintaining the single responsibility principle of each service.

## Getting started

### Deploy the Auth Service

Follow the instructions in the [Auth documentation](./auth-service/README.md) to deploy the Auth Service to AWS.

### Deploy the Task Service

Follow the instructions in the [Task Service documentation](./task-service/README.md) to deploy the Task Service to AWS.

### Using the application

Using an API client such as Postman, interact with the Task Service API endpoints. Include a valid authorization token in the `Authorization` header of each request. Requests without a valid token will be denied by the Auth Service Token Authorizer.

For this demonstration, the a "valid" token is any value supplied in _Bearer token_ format in the `Authorization` header. For example, `Authorization: Bearer this-is-my-token`. If you would like to see the API Gateway deny a request, you may omit the token such as `Authorization: Bearer` or you may omit the `Authorization` header altogether.

In a real application, your Auth Service would integrate with an auth provider such as AWS Cognito or it would verify and decode JSON Web Tokens (JWTs).

## Further Reading

- [Task Service Documentation](./task-service/README.md)
- [Auth Service Documentation](./auth-service//README.md)
- [Back to all Serverless Microservice Patterns](../../README.md)
