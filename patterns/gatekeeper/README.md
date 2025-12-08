# Pattern: The Gatekeeper

This project provides a solid foundation for implementing Serverless Microservice Patterns with AWS Lambda functions using Node.js and TypeScript. The project uses the AWS CDK for infrastructure as code, Jest for testing, and modern development tooling.

There are many Serverless Microservice Patterns which may be implemented with AWS Lambda functions. This project illustrates the "Gatekeeper" pattern. The Gatekeeper builds on the "Simple Web Service", adding an Authorization microservice to authenticate and authorize API requests.

![Design diagram](../../docs/img/gatekeeper.png "The Gatekeeper Pattern")

## What's inside

This example demonstrates the Gatekeeper pattern with two microservices:

### Task Service

The **Task Service** is a complete microservice that provides task management functionality. This service is shared across multiple patterns and is the same Task Service used in the "Simple Web Service" pattern. It exposes functions to:

- Create new tasks
- Retrieve a specific task
- List all tasks
- Update existing tasks
- Delete tasks

The Task Service functions interact with a DynamoDB table to persist task data.

### Auth Service

The **Auth Service** is a specialized microservice that secures access to the API.

#### The Gatekeeper Pattern in Action

## Getting started

### Deploy the Auth Service

Follow the instructions in the [Auth documentation](./auth-service/README.md) to deploy the Auth Service to AWS.

### Deploy the Task Service

Follow the instructions in the [Task Service documentation](./task-service/README.md) to deploy the Task Service to AWS.

### Using the application

Using an API client such as Postman, interact with the Task Service API endpoints.

## Further Reading

- [Task Service Documentation](./task-service/README.md)
- [Auth Service Documentation](./auth-service//README.md)
- [Back to all Serverless Microservice Patterns](../../README.md)
