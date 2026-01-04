# Pattern: The Internal Handoff

This project provides a solid foundation for implementing Serverless Microservice Patterns with AWS Lambda functions using Node.js and TypeScript. The project uses the AWS CDK for infrastructure as code, Jest for testing, and modern development tooling.

## Internal Handoff Pattern

There are many Serverless Microservice Patterns which may be implemented with AWS Lambda functions. This project illustrates the "Internal Handoff" pattern. The Internal Handoff pattern enables _asynchronous_, service-to-service communication using Lambda-to-Lambda invocations. Rather than blocking and waiting for a response, the calling service hands off work to another service and continues execution immediately. The Lambda functions are invoked asynchronously via the AWS SDK via Lambda-to-Lambda invocations using an `InvocationType` of `Event`.

An asynchronously invoked Lambda function will automatically retry failed invocations. Ensure the function's logic is idempotent and can handle the same event delivered multiple times. Attach a SQS Queue, a dead letter queue, to the Lambda function to capture failed events so that they may be replayed later.

Some may say that calling a Lambda function from a Lambda function is an anti-pattern, but I do not share that opinion. There are many valid scenarios where one microservice needs to call another microservice. One of the _core principles of microservices_ is **single responsibility** or **high cohesion**. This means that a microservice has _one_ responsibility, _one_ business or functional domain. It does one thing and does it well. Therefore it makes perfect sense that one Lambda microservice may need to synchronously call another Lambda microservice, especially when each has a specific purpose.

That said, implement this pattern carefully and on an as-needed basis. Consider if a different pattern is a better fit for the use-case such as "Notifier", "Publish Subscribe", or "Queue-Based Load Leveling".

![Design diagram](../../docs/img/diagram-internal-handoff.png "Internal Handoff")

### Key Characteristics

The Internal Handoff pattern is characterized by:

- **Asynchronous Service-to-Service Communication**: Lambda functions invoke other Lambda functions using the AWS SDK with `InvocationType` set to `Event`
- **Fire-and-Forget Invocation**: The calling service does not wait for the called service to complete; it returns immediately
- **No API Gateway**: Services are not exposed through API Gateway; they are only accessible internally via AWS SDK calls
- **Automatic Retry Mechanism**: Lambda automatically retries failed invocations based on configured retry policies
- **Dead Letter Queue Support**: Failed events that exhaust retries are captured in an SQS Dead Letter Queue for later inspection and replay
- **Idempotent Processing**: Called services must handle the possibility of receiving the same event multiple times

### When to Use

The Internal Handoff pattern is ideal for scenarios such as:

- **Event-Driven Workflows**: One service triggers work in another service without waiting for completion
- **Notification Delivery**: Trigger notifications asynchronously when certain events occur
- **Audit Logging**: Send audit events to a logging service without impacting primary service performance
- **Background Tasks**: Offload heavy processing to dedicated services while maintaining responsiveness
- **Secondary Operations**: Execute optional operations that don't impact the primary business logic
- **Service Chaining**: Multiple services coordinate through asynchronous handoffs in sequence
- **Decoupled Microservices**: Services need independence without tight synchronous coupling

### Key Benefits

1. **Non-Blocking Execution**: Calling service responds immediately without waiting for downstream service completion
2. **Improved Performance**: Reduces caller latency by eliminating wait time for called service
3. **Service Independence**: Services are completely decoupled; called service failures don't block the caller
4. **Built-in Resilience**: Automatic retries and Dead Letter Queue handling ensure no work is lost
5. **Scalability**: Called service can scale independently; bursts don't impact caller
6. **Idempotency Support**: Framework enables handling of duplicate events gracefully
7. **Operational Visibility**: Clear separation of concerns with explicit service-to-service handoffs

## What's inside

This example demonstrates the Internal Handoff pattern with two microservices:

### Task Service

The **Task Service** is a complete microservice that provides task management functionality. This service is shared across multiple patterns and is the same Task Service used in the "Simple Web Service" pattern. It exposes functions to:

- Create new tasks
- Retrieve a specific task
- List all tasks
- Update existing tasks
- Delete tasks

The Task Service functions interact with a DynamoDB table to persist task data.

### Notification Service

The **Notification Service** is a dedicated microservice responsible for sending notifications. This service follows the single responsibility principle by focusing exclusively on notification delivery. It exposes a single function to:

- Send notifications (email, SMS, push notifications, etc.)

The Notification Service is designed to be invoked asynchronously by other microservices. It receives notification requests, processes them, and handles delivery to external notification providers. By separating notification logic into its own microservice, the application achieves better modularity, independent scalability, and easier testing and maintenance.

In this pattern, the Task Service invokes the Notification Service asynchronously when certain task events occur, such as task creation or completion. This decouples task management logic from notification delivery, allowing each service to evolve independently.

### The Internal Handoff Pattern in Action

The Internal Handoff pattern demonstrates how microservices can coordinate through asynchronous Lambda-to-Lambda invocations:

1. **Task Creation**: A client creates a new task via the Task Service's `create-task` function.

2. **Service Handoff**: After successfully creating the task in DynamoDB, the Task Service asynchronously invokes the Notification Service using the AWS SDK with `InvocationType: 'Event'`.

3. **Asynchronous Notification**: The Notification Service receives the handoff event and sends a notification (e.g., "New task created") without blocking the Task Service's response.

4. **Resilience**: If the Notification Service fails, AWS Lambda automatically retries the invocation (based on configured retry policy). Failed invocations that exhaust retries are sent to a Dead Letter Queue (SQS) for later analysis and replay.

**Key Benefits of This Pattern:**

- **Decoupling**: Services remain independent; the Task Service doesn't wait for notification delivery.
- **Performance**: The Task Service responds to clients immediately without waiting for notification processing.
- **Scalability**: Each service scales independently based on its specific workload.
- **Resilience**: Built-in retry mechanism and Dead Letter Queue ensure no notifications are lost.
- **Single Responsibility**: Each microservice has one well-defined purpose.

## Getting started

### Deploy the Notification Service

Follow the instructions in the [Notification Service documentation](./notification-service/README.md) to deploy the Notification Service to AWS.

### Deploy the Task Service

Follow the instructions in the [Task Service documentation](./task-service/README.md) to deploy the Task Service to AWS.

### Using the application

Once both services are deployed, you can interact with the application through the Task Service's API endpoints:

#### Create a Task

Send a POST request to the Task Service's `create-task` endpoint:

```bash
curl -X POST https://{api-gateway-url}/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement feature X"
  }'
```

The Task Service will:

1. Validate and store the task in DynamoDB
2. Return a success response to the client immediately
3. Asynchronously invoke the Notification Service to send a "task created" notification

#### Retrieve a Task

```bash
curl https://{api-gateway-url}/tasks/{taskId}
```

#### List All Tasks

```bash
curl https://{api-gateway-url}/tasks
```

#### Update a Task

```bash
curl -X PUT https://{api-gateway-url}/tasks/{taskId} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated title",
    "status": "completed"
  }'
```

#### Delete a Task

```bash
curl -X DELETE https://{api-gateway-url}/tasks/{taskId}
```

**Monitoring and Troubleshooting:**

- Check CloudWatch Logs for both services to verify execution.
- Inspect the SQS Dead Letter Queue to identify and replay failed notification requests.
- Monitor Lambda metrics (duration, errors, throttling) in CloudWatch to optimize performance.
- Review X-Ray service maps to visualize the interaction between services.

## Further Reading

- [Task Service Documentation](./task-service/README.md)
- [Notification Service Documentation](./notification-service//README.md)
- [Back to all Serverless Microservice Patterns](../../README.md)
