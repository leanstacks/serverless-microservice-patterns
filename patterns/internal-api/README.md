# Pattern: The Internal API

This project provides a solid foundation for implementing Serverless Microservice Patterns with AWS Lambda functions using Node.js and TypeScript. The project uses the AWS CDK for infrastructure as code, Jest for testing, and modern development tooling.

There are many Serverless Microservice Patterns which may be implemented with AWS Lambda functions. This project illustrates the "Internal API" pattern. The Internal API is basically the same as the "Simple Web Service", but there is no API Gateway to expose the service to the Internet. The "Internal API" is one or more Lambda functions which, together, comprise a serverless microservice. The Lambda functions are invoked synchronously via the AWS SDK via Lambda-to-Lambda invocations using an `InvocationType` of `RequestResponse`.

Some may say that calling a Lambda function from a Lambda function is an anti-pattern, but I do not share that opinion. There are many valid scenarios where one microservice needs to call another microservice synchronously. One of the _core principles of microservices_ is **single responsibility** or **high cohesion**. This means that a microservice has _one_ responsibility, _one_ business or functional domain. It does one thing and does it well. Therefore it makes perfect sense that one Lambda microservice may need to synchronously call another Lambda microservice, especially when each has a specific purpose.

That said, implement this pattern carefully and on an as-needed basis. It is important to remember that the calling service will block and wait for the called service to return. This increases the exeuction time of the calling service and therefore the cost. Consider if an event-driven, asynchronous pattern is a better fit for the use-case.

![Design diagram](../../docs/img/diagram-internal-api.png "Simple Web Service")

## What's inside

This example demonstrates the Internal API pattern with two microservices:

### Task Service

The **Task Service** is a complete microservice that provides task management functionality. This service is shared across multiple patterns and is the same Task Service used in the "Simple Web Service" pattern. It exposes functions to:

- Create new tasks
- Retrieve a specific task
- List all tasks
- Update existing tasks
- Delete tasks

The Task Service functions interact with a DynamoDB table to persist task data.

### Daily Planner Service

The **Daily Planner Service** is a specialized microservice that provides daily planning functionality. It demonstrates the Internal API pattern by synchronously invoking the Task Service's **List Tasks** function using the AWS SDK with an `InvocationType` of `RequestResponse`.

#### The Internal API Pattern in Action

The key demonstration of the Internal API pattern occurs in the Daily Planner service. When the Daily Planner Lambda function executes, it makes a direct, synchronous call to the List Tasks Lambda function from the Task Service. This Lambda-to-Lambda invocation is the core of the Internal API pattern and showcases how one microservice can depend on another microservice by directly invoking its Lambda functions.

This pattern allows the Daily Planner service to retrieve task data without duplicating the Task Service's logic, maintaining the principle of single responsibility while demonstrating service-to-service communication within a serverless architecture.

## Getting started

### Deploy the Task Service

Follow the instructions in the [Task Service documentation](./task-service/README.md) to deploy the Task Service to AWS.

### Deploy the Planner Service

Follow the instructions in the [Planner Service documentation](./planner-service/README.md) to deploy the Planner Service to AWS.

### Using the application

Using an API client such as Postman, interact with the Task Service API endpoints. Create one or more tasks that may be fetched by the Planner Service.

Next, invoke the daily planner API endpoint. The planner service will invoke the _list tasks_ function and return those tasks in the API response.

## Further Reading

- [Task Service Documentation](./task-service/README.md)
- [Planner Service Documentation](./planner-service//README.md)
- [Back to all Serverless Microservice Patterns](../../README.md)
