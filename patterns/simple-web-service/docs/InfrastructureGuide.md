# Infrastructure Guide

This guide provides a concise overview of the AWS CDK infrastructure for the project. It is intended for software and DevOps engineers deploying and maintaining the project on AWS.

---

## Stacks Overview

The infrastructure is organized into two main AWS CDK stacks:

| Stack Name Pattern        | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `{app-name}-data-{env}`   | Manages DynamoDB tables and data resources |
| `{app-name}-lambda-{env}` | Manages Lambda functions and API Gateway   |

---

## Data Stack

**Purpose:** Manages DynamoDB tables and data-related resources.

**Key Resources:**

| Resource       | Name Pattern            | Key Properties                                                                                                                        |
| -------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| DynamoDB Table | `{app-name}-task-{env}` | Partition Key: `pk` (String), On-demand billing, SSE encryption, PITR (prd only), Removal Policy: `RETAIN` (prd), `DESTROY` (dev/qat) |

**Outputs:**

| Output Name     | Export Name Pattern                | Description                           |
| --------------- | ---------------------------------- | ------------------------------------- |
| `TaskTableName` | `{app-name}-task-table-name-{env}` | Table name (exported as stack output) |
| `TaskTableArn`  | `{app-name}-task-table-arn-{env}`  | Table ARN (exported as stack output)  |

---

## Lambda Stack

**Purpose:** Manages Lambda functions, API Gateway, and application runtime resources.

**Key Resources:**

| Resource        | Name Pattern                   | Purpose/Notes                        |
| --------------- | ------------------------------ | ------------------------------------ |
| Lambda Function | `{app-name}-list-tasks-{env}`  | List all tasks (DynamoDB Scan)       |
| Lambda Function | `{app-name}-get-task-{env}`    | Get a task by ID (DynamoDB GetItem)  |
| Lambda Function | `{app-name}-create-task-{env}` | Create a new task (DynamoDB PutItem) |
| Lambda Function | `{app-name}-update-task-{env}` | Update a task (DynamoDB UpdateItem)  |
| Lambda Function | `{app-name}-delete-task-{env}` | Delete a task (DynamoDB DeleteItem)  |
| API Gateway     | `{app-name}-api-{env}`         | REST API for Lambda functions        |

**Outputs:**

| Output Name             | Export Name Pattern                | Description                     |
| ----------------------- | ---------------------------------- | ------------------------------- |
| `ApiUrl`                | `{app-name}-api-url-{env}`         | API Gateway endpoint URL        |
| `ApiId`                 | `{app-name}-api-id-{env}`          | API Gateway ID                  |
| `ListTasksFunctionArn`  | `{app-name}-list-tasks-arn-{env}`  | List Tasks Lambda function ARN  |
| `GetTaskFunctionArn`    | `{app-name}-get-task-arn-{env}`    | Get Task Lambda function ARN    |
| `CreateTaskFunctionArn` | `{app-name}-create-task-arn-{env}` | Create Task Lambda function ARN |
| `UpdateTaskFunctionArn` | `{app-name}-update-task-arn-{env}` | Update Task Lambda function ARN |
| `DeleteTaskFunctionArn` | `{app-name}-delete-task-arn-{env}` | Delete Task Lambda function ARN |

---

## Resource Tagging

All resources are tagged for cost allocation and management:

| Tag     | Source         | Example Value       |
| ------- | -------------- | ------------------- |
| `App`   | `CDK_APP_NAME` | `lambda-starter`    |
| `Env`   | `CDK_ENV`      | `dev`, `qat`, `prd` |
| `OU`    | `CDK_OU`       | `leanstacks`        |
| `Owner` | `CDK_OWNER`    | `platform-team`     |

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
