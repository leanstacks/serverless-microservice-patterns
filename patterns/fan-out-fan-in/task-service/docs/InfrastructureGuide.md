# Infrastructure Guide

This guide provides a concise overview of the AWS CDK infrastructure for the project. It is intended for software and DevOps engineers deploying and maintaining the project on AWS.

---

## Stacks Overview

The infrastructure is organized into two main AWS CDK stacks:

| Stack Name Pattern        | Purpose                                             |
| ------------------------- | --------------------------------------------------- |
| `{app-name}-data-{env}`   | Manages DynamoDB tables, S3 buckets, and SQS queues |
| `{app-name}-lambda-{env}` | Manages Lambda functions and API Gateway resources  |

---

## Data Stack

**Purpose:** Manages DynamoDB tables, S3 buckets, SNS topics, and SQS queues for data storage and event-driven processing.

**Key Resources:**

| Resource       | Name Pattern                          | Key Properties                                                                                                                        |
| -------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| DynamoDB Table | `{app-name}-task-{env}`               | Partition Key: `pk` (String), On-demand billing, SSE encryption, PITR (prd only), Removal Policy: `RETAIN` (prd), `DESTROY` (dev/qat) |
| DynamoDB Table | `{app-name}-task-file-{env}`          | Partition Key: `pk`, Sort Key: `sk` (Strings), On-demand billing, SSE encryption, Tracks batch processing progress                    |
| S3 Bucket      | `{app-name}-task-uploads-{env}`       | CSV file uploads, Versioned (prd only), Auto-delete objects (dev/qat), SSL enforcement                                                |
| SQS Queue      | `{app-name}-create-task-queue-{env}`  | Fan-out queue for decomposed task creation messages, 4-day retention, 60-second visibility timeout                                    |
| SQS Queue      | `{app-name}-task-upload-{env}`        | S3 event notifications trigger processing, 4-day retention, 300-second visibility timeout                                             |
| SQS Queue      | `{app-name}-task-file-complete-{env}` | Aggregation queue for batch completion events, 4-day retention, 60-second visibility timeout                                          |
| SNS Topic      | `{app-name}-task-topic-{env}`         | Publishes task events for subscription-based processing, Filtered subscriptions for completion events                                 |

**Outputs:**

| Output Name                | Export Name Pattern                             | Description                     |
| -------------------------- | ----------------------------------------------- | ------------------------------- |
| `TaskTableName`            | `{app-name}-task-table-name-{env}`              | Task table name                 |
| `TaskTableArn`             | `{app-name}-task-table-arn-{env}`               | Task table ARN                  |
| `TaskFileTableName`        | `{app-name}-task-file-table-name-{env}`         | TaskFile table name             |
| `TaskFileTableArn`         | `{app-name}-task-file-table-arn-{env}`          | TaskFile table ARN              |
| `TaskUploadsBucketName`    | `{app-name}-task-uploads-bucket-name-{env}`     | Task uploads S3 bucket name     |
| `TaskUploadsBucketArn`     | `{app-name}-task-uploads-bucket-arn-{env}`      | Task uploads S3 bucket ARN      |
| `CreateTaskQueueUrl`       | `{app-name}-create-task-queue-url-{env}`        | Create Task SQS queue URL       |
| `CreateTaskQueueArn`       | `{app-name}-create-task-queue-arn-{env}`        | Create Task SQS queue ARN       |
| `TaskUploadQueueUrl`       | `{app-name}-task-upload-queue-url-{env}`        | Task Upload SQS queue URL       |
| `TaskUploadQueueArn`       | `{app-name}-task-upload-queue-arn-{env}`        | Task Upload SQS queue ARN       |
| `TaskFileCompleteQueueUrl` | `{app-name}-task-file-complete-queue-url-{env}` | TaskFile Complete SQS queue URL |
| `TaskFileCompleteQueueArn` | `{app-name}-task-file-complete-queue-arn-{env}` | TaskFile Complete SQS queue ARN |
| `TaskTopicArn`             | `{app-name}-task-topic-arn-{env}`               | Task SNS topic ARN              |

---

## Lambda Stack

**Purpose:** Manages Lambda functions and API Gateway resources.

**Key Resources:**

| Resource        | Name Pattern                                    | Purpose/Notes                                                               |
| --------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| API Gateway     | `{app-name}-api-{env}`                          | REST API endpoint for task operations and CSV uploads                       |
| Lambda Function | `{app-name}-list-tasks-{env}`                   | API: List all tasks (DynamoDB Scan)                                         |
| Lambda Function | `{app-name}-get-task-{env}`                     | API: Get a task by ID (DynamoDB GetItem)                                    |
| Lambda Function | `{app-name}-create-task-{env}`                  | API: Create a single task (DynamoDB PutItem)                                |
| Lambda Function | `{app-name}-update-task-{env}`                  | API: Update a task (DynamoDB UpdateItem)                                    |
| Lambda Function | `{app-name}-delete-task-{env}`                  | API: Delete a task (DynamoDB DeleteItem)                                    |
| Lambda Function | `{app-name}-upload-task-subscriber-{env}`       | SQS Worker: Reads CSV from S3 and fans out task messages                    |
| Lambda Function | `{app-name}-create-task-subscriber-{env}`       | SQS Worker: Creates tasks from queued messages                              |
| Lambda Function | `{app-name}-complete-taskfile-subscriber-{env}` | SQS Worker: Aggregates completion events and updates batch status           |
| IAM Role        | `{app-name}-lambda-role-{env}`                  | Execution role for Lambda functions with DynamoDB, SQS, SNS, S3 permissions |

**Event Sources:**

| Lambda Function                | Event Source          | Trigger                                                     |
| ------------------------------ | --------------------- | ----------------------------------------------------------- |
| `upload-task-subscriber`       | SQS Task Upload Queue | S3 object upload events (via S3 → SQS notifications)        |
| `create-task-subscriber`       | SQS Create Task Queue | Messages from upload-task-subscriber (fan-out)              |
| `complete-taskfile-subscriber` | SQS TaskFile Complete | SNS task events filtered for `taskfile_processing_complete` |

**Outputs:**

| Output Name                             | Export Name Pattern                                  | Description                                      |
| --------------------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| `ListTasksFunctionArn`                  | `{app-name}-list-tasks-function-arn-{env}`           | List Tasks Lambda function ARN                   |
| `GetTaskFunctionArn`                    | `{app-name}-get-task-function-arn-{env}`             | Get Task Lambda function ARN                     |
| `CreateTaskFunctionArn`                 | `{app-name}-create-task-function-arn-{env}`          | Create Task Lambda function ARN                  |
| `UpdateTaskFunctionArn`                 | `{app-name}-update-task-function-arn-{env}`          | Update Task Lambda function ARN                  |
| `DeleteTaskFunctionArn`                 | `{app-name}-delete-task-function-arn-{env}`          | Delete Task Lambda function ARN                  |
| `UploadTaskSubscriberFunctionArn`       | `{app-name}-upload-task-subscriber-arn-{env}`        | Upload Task Subscriber Lambda function ARN       |
| `CreateTaskSubscriberFunctionArn`       | `{app-name}-create-task-subscriber-arn-{env}`        | Create Task Subscriber Lambda function ARN       |
| `CompleteTaskFileSubscriberFunctionArn` | `{app-name}-complete-task-file-subscriber-arn-{env}` | Complete TaskFile Subscriber Lambda function ARN |
| `ApiUrl`                                | `{app-name}-tasks-api-url-{env}`                     | REST API endpoint URL                            |
| `ApiId`                                 | `{app-name}-tasks-api-id-{env}`                      | API Gateway REST API ID                          |

---

## Fan Out / Fan In Architecture

The infrastructure implements the Fan Out / Fan In pattern through coordinated messaging:

### Fan Out Phase

1. **CSV Upload**: Files uploaded to S3 trigger `ObjectCreated` events
2. **Event Routing**: S3 notifications automatically publish events to the Task Upload Queue
3. **File Processing**: The Upload Task Subscriber Lambda reads the CSV file and:
   - Creates a TaskFile record with `NEW` status
   - Parses CSV rows and creates individual task creation messages
   - Publishes each row as a message to the Create Task Queue
   - Returns immediately (no waiting for task creation)

### Parallel Processing Phase

4. **Message Decomposition**: Each CSV row becomes an independent SQS message in the Create Task Queue
5. **Worker Concurrency**: Multiple Create Task Subscriber Lambdas process messages in parallel:
   - Batch size: 10 messages per invocation
   - Max concurrency: 5 concurrent Lambdas
   - Each processes one task creation message
6. **Progress Tracking**: As tasks are created, the TaskFile record is updated with:
   - `processedCount`: Number of successfully created tasks
   - `unprocessedCount`: Number of remaining tasks
   - Status remains `IN_PROGRESS`

### Fan In Phase (Aggregation)

7. **Completion Signaling**: When all tasks are processed, the Create Task Subscriber publishes a `taskfile_processing_complete` event to the Task SNS Topic
8. **Event Filtering**: The TaskFile Complete Queue has a subscription filter that captures only `taskfile_processing_complete` events
9. **Completion Handler**: The Complete TaskFile Subscriber Lambda:
   - Processes the aggregated completion event
   - Updates the TaskFile record status to `COMPLETED`
   - Marks the batch processing as finished

### Message Flow Diagram

```
S3 Upload → S3 Events → Task Upload Queue → Upload Task Subscriber
                                                    ↓
                                        Create TaskFile (NEW)
                                        Parse CSV & Fan Out
                                                    ↓
                                        Create Task Queue
                                                    ↓
              ┌─────────────────┬──────────────┬──────────────┐
              ↓                 ↓              ↓              ↓
        Create Task          Create Task    Create Task    Create Task
        Subscriber 1         Subscriber 2   Subscriber 3   Subscriber 4
        (Create Task)        (Create Task)  (Create Task)  (Create Task)
              │                 │              │              │
              └─────────────────┴──────────────┴──────────────┘
                                        ↓
                        Update TaskFile (IN_PROGRESS)
                        Publish Completion Event
                                        ↓
                            Task SNS Topic
                                        ↓
                    TaskFile Complete Queue
                    (Event filtering applied)
                                        ↓
                    Complete TaskFile Subscriber
                    (Aggregation)
                                        ↓
                    Update TaskFile (COMPLETED)
```

---

## Resource Tagging

All resources are tagged for cost allocation and management:

| Tag     | Source         | Example Value                     |
| ------- | -------------- | --------------------------------- |
| `App`   | `CDK_APP_NAME` | `smp-fan-out-fan-in-task-service` |
| `Env`   | `CDK_ENV`      | `dev`, `qat`, `prd`               |
| `OU`    | `CDK_OU`       | `leanstacks`                      |
| `Owner` | `CDK_OWNER`    | `platform-team`                   |

---

## Configuration & DevOps

- For environment variables, configuration, and validation, see the [Configuration Guide](./ConfigurationGuide.md).
- For CI/CD, GitHub Actions, and DevOps automation, see the [DevOps Guide](./DevOpsGuide.md).

---

## Best Practices

### Security

1. **Never commit secrets**: Use `.env` for local configuration only
2. **Use AWS Secrets Manager**: Store sensitive values in AWS Secrets Manager or SSM Parameter Store
3. **Least privilege**: Grant only necessary IAM permissions
4. **Enable encryption**: All data at rest should be encrypted
5. **Separate accounts**: Use different AWS accounts for each environment

### Development

1. **Test before deploying**: Always run `npm test` before deployment
2. **Review diffs**: Use `npm run diff` to review changes before applying
3. **Use descriptive names**: Follow naming conventions for resources
4. **Document changes**: Update README when adding new stacks or resources
5. **Type safety**: Leverage TypeScript for compile-time error detection

### Operations

1. **Tag everything**: Ensure all resources have proper tags
2. **Monitor costs**: Use cost allocation tags to track spending
3. **Backup production**: Enable point-in-time recovery for critical databases
4. **Retain production resources**: Use `RETAIN` removal policy for production
5. **Version control**: Commit infrastructure changes to source control

---

## Troubleshooting

### Configuration Validation Errors

**Problem:** `CDK configuration validation failed`

**Solutions:**

1. Verify `.env` file exists in the infrastructure directory
2. Check that `CDK_ENV` is set to a valid value (`dev`, `qat`, `prd`)
3. Ensure all required variables are set

### TypeScript Compilation Errors

**Problem:** Build fails with TypeScript errors

**Solutions:**

1. Ensure dependencies are installed: `npm install`
2. Verify Node.js version: `node --version` (should be v24+)
3. Check for syntax errors in TypeScript files
4. Clean and rebuild: `npm run clean && npm run build`

### Deployment Failures

**Problem:** Stack deployment fails

**Solutions:**

1. Verify AWS credentials: `aws sts get-caller-identity`
2. Check account and region: Ensure `CDK_ACCOUNT` and `CDK_REGION` match your AWS profile
3. Confirm IAM permissions: Verify you have necessary permissions
4. Review CloudFormation events in AWS Console for detailed error messages
5. Check for resource naming conflicts

### CDK Bootstrap Issues

**Problem:** `This stack requires bootstrap stack version X`

**Solution:**

```bash
cdk bootstrap aws://ACCOUNT-ID/REGION --force
```

### Node Version Warnings

**Problem:** Warning about untested Node.js version

**Solution:**

```bash
export JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1
```

Or use a supported Node.js version (22.x or 20.x).

---

## Further Reading

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [Project Configuration Guide](./ConfigurationGuide.md)
- [Project DevOps Guide](./DevOpsGuide.md)
