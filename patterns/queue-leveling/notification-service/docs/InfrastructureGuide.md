# Infrastructure Guide

This guide provides a concise overview of the AWS CDK infrastructure for the project. It is intended for software and DevOps engineers deploying and maintaining the project on AWS.

---

## Stacks Overview

The infrastructure is organized into two AWS CDK stacks:

| Stack Name Pattern        | Purpose                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `{app-name}-sqs-{env}`    | Manages SQS queues for event consumption from SNS topics        |
| `{app-name}-lambda-{env}` | Manages Lambda functions, event sources, and CloudWatch logging |

---

## SQS Stack

**Purpose:** Manages SQS queues for consuming events from SNS topics using pub-sub pattern.

**Key Resources:**

| Resource           | Name Pattern                        | Key Properties                                                                                                    |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Notification Queue | `{app-name}-notification-{env}`     | Standard queue, 4-day retention, 1-minute visibility timeout, Removal Policy: `RETAIN` (prd), `DESTROY` (dev/qat) |
| Notification DLQ   | `{app-name}-notification-dlq-{env}` | Standard queue, 14-day retention, Removal Policy: `RETAIN` (prd), `DESTROY` (dev/qat), Max receive count: 3       |
| SNS Subscription   | Auto-generated                      | Subscribes to Task SNS topic, raw message delivery enabled, filter policy for `task_created` events               |

**Key Behaviors:**

- Queue automatically redrives failed messages to DLQ after 3 failed receive attempts
- SNS-to-SQS subscription filters incoming events to only `task_created` event type

**SQS Stack Outputs:**

| Output Name               | Export Name Pattern                       | Description                                     |
| ------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `NotificationQueueArn`    | `{app-name}-notification-queue-arn-{env}` | ARN of the notification queue                   |
| `NotificationQueueUrl`    | `{app-name}-notification-queue-url-{env}` | URL of the notification queue                   |
| `NotificationQueueDLQArn` | `{app-name}-notification-dlq-arn-{env}`   | ARN of the notification queue Dead Letter Queue |
| `NotificationQueueDLQUrl` | `{app-name}-notification-dlq-url-{env}`   | URL of the notification queue Dead Letter Queue |

---

## Lambda Stack

**Purpose:** Manages the Lambda function for processing notification events and CloudWatch logging.

**Key Resources:**

| Resource             | Name Pattern                                     | Key Properties                                                                                                                                   |
| -------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lambda Function      | `{app-name}-send-notification-{env}`             | Runtime: Node.js 24.x, Memory: 256 MB, Timeout: 15s, Batch size: 10, Batch window: 30s                                                           |
| CloudWatch Log Group | `/aws/lambda/{app-name}-send-notification-{env}` | JSON logging format, System/App log level: INFO, Retention: 1 month (prd), 1 week (dev/qat), Removal Policy: `RETAIN` (prd), `DESTROY` (dev/qat) |

**Key Behaviors:**

- Lambda subscribes to Notification Queue with SQS event source
- Filters messages to only process `task_created` events
- Reports batch item failures to enable partial successful processing
- Uses bundling with minification and source maps for optimized code

**Lambda Stack Outputs:**

| Output Name                    | Export Name Pattern                                | Description                                   |
| ------------------------------ | -------------------------------------------------- | --------------------------------------------- |
| `SendNotificationFunctionArn`  | `{app-name}-send-notification-function-arn-{env}`  | ARN of the send notification Lambda function  |
| `SendNotificationFunctionName` | `{app-name}-send-notification-function-name-{env}` | Name of the send notification Lambda function |

---

## Stack Dependencies

The Lambda Stack depends on the SQS Stack to ensure proper resource creation order:

1. SQS Stack creates the notification queue and DLQ
2. SNS topic subscription is configured in the SQS Stack
3. Lambda Stack creates the Lambda function and subscribes it to the notification queue

---

## Resource Tagging

All resources are tagged for cost allocation and management:

| Tag     | Source         | Example Value                             |
| ------- | -------------- | ----------------------------------------- |
| `App`   | `CDK_APP_NAME` | `smp-queue-leveling-notification-service` |
| `Env`   | `CDK_ENV`      | `dev`, `qat`, `prd`                       |
| `OU`    | `CDK_OU`       | `leanstacks`                              |
| `Owner` | `CDK_OWNER`    | `platform-team`                           |

---

## Configuration & DevOps

- For environment variables, configuration, and validation, see the [Configuration Guide](./ConfigurationGuide.md).

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
