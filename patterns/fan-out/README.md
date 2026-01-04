# Pattern: Fan Out

This project provides a solid foundation for implementing Serverless Microservice Patterns with AWS Lambda functions using Node.js and TypeScript. The project uses the AWS CDK for infrastructure as code, Jest for testing, and modern development tooling.

## Fan Out Pattern

There are many Serverless Microservice Patterns which may be implemented with AWS Lambda functions. This project illustrates the "Fan Out" pattern. The Fan Out pattern breaks a large job into a collection of smaller jobs. This is particularly useful for batch processing. Lambda functions are limited to 15 minutes of total execution time and the Fan Out pattern allows applications to overcome this limitation by decomposing work into smaller units.

![Design diagram](../../docs/img/diagram-fan-out.png "Fan Out")

### Key Characteristics

The Fan Out pattern is characterized by:

- **Task Decomposition**: Breaking a single large workload into multiple smaller, independent tasks
- **Message Queue Decoupling**: Using a message queue (SQS) to decouple the producer (upload/orchestration function) from consumers (worker functions)
- **Parallel Execution**: Multiple worker Lambda functions processing tasks concurrently from the message queue
- **Asynchronous Processing**: The initial upload function returns quickly after queuing work, rather than waiting for completion

### When to Use

The Fan Out pattern is ideal for scenarios such as:

- **Batch Processing**: Processing large CSV or batch files without timeout concerns
- **Data Transformation**: Converting, validating, or enriching data across multiple records
- **Notification Delivery**: Sending notifications to thousands of users or devices
- **Image Processing**: Resizing and optimizing images from a batch upload
- **Report Generation**: Processing large datasets to generate reports or analytics
- **ETL Operations**: Extract, transform, and load operations on large datasets
- **Distributed Workloads**: Any workload that can be parallelized across independent units

### Key Benefits

1. **Overcomes Time Limits**: Process jobs larger than the 15-minute Lambda execution limit
2. **Horizontal Scalability**: Add more worker functions to process work faster without architectural changes
3. **Resilience**: Message queue retries ensure failed tasks are automatically reprocessed
4. **Cost Efficiency**: Pay only for execution time used; idle workers consume no resources
5. **Decoupling**: Producer and consumer functions are independent, enabling flexible scaling and failure handling
6. **Observable**: Monitor queue depth, worker performance, and failure rates independently
7. **Flexible Rate Control**: SQS allows you to control the rate of task processing through concurrency settings

## What's inside

This example demonstrates the Fan Out pattern these microservices.

### Task Service

The **Task Service** is a complete microservice that provides task management functionality. It exposes functions to:

- Create new tasks
- Retrieve a specific task
- List all tasks
- Update existing tasks
- Delete tasks
- Upload a CSV file containing multiple tasks

The Task Service functions interact with a DynamoDB table to persist task data and uses an SQS queue to implement the fan-out pattern for batch task creation.

### The Fan Out Pattern in Action

The fan-out pattern is demonstrated when uploading a CSV file containing multiple task records:

1. **CSV Upload**: A user invokes the Upload CSV Lambda function with a file containing multiple task records.

2. **Fan Out**: Instead of processing all records sequentially in a single Lambda function (which could exceed the 15-minute execution timeout), the Upload CSV function reads each record from the CSV file and publishes a message to an SQS queue for each task to be created.

3. **Parallel Processing**: The SQS queue decouples the upload process from task creation. The Create Task Subscriber Lambda function listens to the queue and processes messages in parallel, creating one task per message in the DynamoDB table.

This pattern allows the application to:

- Process large batch files without hitting Lambda execution time limits
- Scale horizontally by processing multiple tasks concurrently
- Handle failures gracefully through SQS message retention and retry mechanisms
- Decouple the upload process from task creation for better system resilience

## Getting started

### Deploy the Task Service

Follow the instructions in the [Task Service documentation](./task-service/README.md) to deploy the Task Service to AWS.

### Using the application

#### Testing the Fan Out Pattern

To test the fan-out pattern implementation, follow these steps:

1. **Deploy the Task Service** using the instructions above.

2. **Prepare a CSV File**

   - Use the [sample.csv](./sample.csv) file included in this project as a template
   - Or create your own CSV file with the following columns:
     - `title` (required): Task title
     - `detail` (optional): Task description or details
     - `dueAt` (optional): Due date in ISO 8601 format (e.g., `2026-01-01T00:00:00.000Z`)
     - `isComplete` (optional): Boolean indicating if task is complete (default: `false`)

3. **Invoke the Upload CSV API**

   - Using an API client like Postman or curl, upload your CSV file to the Upload CSV Lambda function endpoint
   - The function will parse the CSV, fan out each record as an SQS message, and return immediately

4. **Monitor Task Creation**
   - The Create Task Subscriber Lambda function will process messages from the SQS queue asynchronously
   - Monitor the SQS queue to watch tasks being processed
   - Query the Task Service's list tasks endpoint to verify tasks have been created in DynamoDB

#### API Endpoints

The Task Service provides the following REST API endpoints:

- `POST /tasks` - Create a single task
- `GET /tasks` - List all tasks
- `GET /tasks/{id}` - Get a specific task
- `PUT /tasks/{id}` - Update a task
- `DELETE /tasks/{id}` - Delete a task
- `POST /tasks/upload` - Upload and process a CSV file (demonstrates fan-out pattern)

## Further Reading

- [Task Service Documentation](./task-service/README.md)
- [Back to all Serverless Microservice Patterns](../../README.md)
