# Pattern: Queue-Based Load Leveling

This project provides a solid foundation for implementing Serverless Microservice Patterns with AWS Lambda functions using Node.js and TypeScript. The project uses the AWS CDK for infrastructure as code, Jest for testing, and modern development tooling.

There are many Serverless Microservice Patterns which may be implemented with AWS Lambda functions. This project illustrates the "Queue-Based Load Leveling" pattern. This pattern uses a message queue as a buffer for microservice requests, smoothing out load spikes by controlling the rate at which the microservice processes messages. This prevents system overload, increases availability, and improves scalability by protecting downstream systems. Producers may send requests quickly while the queue buffers the work and consumers pull messages at a managable pace. This pattern is ideal for unpredictable workloads where immediate, synchronous responses are not important.

The SQS queue has a well-known API avaialble via the AWS SDK. The microservice defines its API as the message body and message attributes. Any microservice may publish messages to the queue to have their requests processed by the microservice. When repeated failures occur, messages are moved to a Dead Letter Queue, DLQ, for review and potential replay. Ensure the subscribing function's logic is idempotent and can safely process the same event delivered multiple times.

The Queue-Based Load Leveling pattern is one of the essential patterns in a loosely coupled architecture. Services do not need to know the implementation details of other services, only the format of published messages.

![Design diagram](../../docs/img/diagram-queue-leveling.png "Queue-based Load Leveling")

## What's inside

This example demonstrates the Queue-Based Load Leveling pattern with two microservices:

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

The Notification Service is designed as an event consumer in the Pub/Sub pattern. It subscribes to the Task Service's SNS topic through its own SQS queue, allowing it to receive task events asynchronously. The Notification Service uses subscription message filtering to consume only relevant events (e.g., "task created"). This ensures the service only processes events it cares about while remaining independent from other event consumers.

By separating notification logic into its own microservice, the application achieves better modularity, independent scalability, and easier testing and maintenance. The decoupling provided by SNS/SQS allows the Task Service and Notification Service to evolve independently without direct dependencies.

### The Queue-Based Load Leveling Pattern in Action

The Publish Subscribe pattern demonstrates how microservices can coordinate through asynchronous event publishing and subscription:

1. **Event Publication**: A client creates a new task via the Task Service's `create-task` function. After successfully storing the task in DynamoDB, the Task Service publishes a "task created" event to an SNS topic.

2. **Event Subscription**: The Notification Service subscribes to the Task Service's SNS topic through its own SQS queue. The subscription includes a message filter that ensures only "task created" events are delivered to the queue.

3. **Asynchronous Processing**: The Notification Service Lambda function is automatically triggered by messages in its SQS queue. It receives the task created event and sends a notification (e.g., "New task created") without blocking the Task Service's response.

4. **Resilience and Recovery**: If the Notification Service fails to process a message, it remains in the SQS queue and is automatically retried based on the configured visibility timeout. If failures persist after the maximum number of retries, the message is moved to a Dead Letter Queue (DLQ) for later analysis and potential replay.

**Key Benefits of This Pattern:**

- **Loose Coupling**: The Task Service doesn't know about the Notification Service; it only publishes to an SNS topic. Other services can subscribe to the same topic independently.
- **Scalability**: Multiple independent consumers can subscribe to the same SNS topic, each with their own SQS queue and Lambda function.
- **Resilience**: SNS/SQS provides built-in message durability, automatic retries, and Dead Letter Queue support for failed messages.
- **Selectivity**: Subscription message filtering allows consumers to process only events relevant to them, reducing unnecessary processing.
- **Performance**: The Task Service responds to clients immediately without waiting for event consumers to process notifications.
- **Single Responsibility**: Each microservice has one well-defined purpose and evolves independently.

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
2. Publish a "task created" event to the Task Service SNS topic
3. Return a success response to the client immediately
4. The Notification Service's SQS queue receives the event (via the SNS subscription with filtering)
5. The Notification Service Lambda processes the event asynchronously and sends a notification

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
