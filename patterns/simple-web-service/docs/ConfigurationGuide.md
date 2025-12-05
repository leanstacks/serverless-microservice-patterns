# Configuration Guide

This guide provides comprehensive information about configuring the Lambda Starter application and its infrastructure.

## Application Configuration

The application configuration is managed through environment variables. These variables are validated using Zod schemas at runtime to ensure proper configuration.

### Environment Variables

The following environment variables are available for configuring the application:

| Variable            | Type    | Description                                      | Default     | Required |
| ------------------- | ------- | ------------------------------------------------ | ----------- | -------- |
| `TASKS_TABLE`       | string  | The name of the DynamoDB table for storing tasks | -           | Yes      |
| `AWS_REGION`        | string  | The AWS region where resources are deployed      | `us-east-1` | No       |
| `LOGGING_ENABLED`   | boolean | Enable or disable application logging            | `true`      | No       |
| `LOGGING_LEVEL`     | enum    | Logging level: `debug`, `info`, `warn`, `error`  | `debug`     | No       |
| `LOGGING_FORMAT`    | enum    | Logging format: `text`, `json`                   | `json`      | No       |
| `CORS_ALLOW_ORIGIN` | string  | CORS allow origin header value                   | `*`         | No       |

### Usage

Application configuration is accessed through the `config` object exported from `src/utils/config.ts`:

```typescript
import { config } from './utils/config';

console.log(`Tasks table: ${config.TASKS_TABLE}`);
console.log(`Logging enabled: ${config.LOGGING_ENABLED}`);
```

### Configuration Validation

The application uses Zod to validate environment variables at startup. If validation fails, the application will throw an error with details about the validation issues.

---

## Infrastructure Configuration

The infrastructure configuration is managed through environment variables prefixed with `CDK_`. These variables control how AWS resources are provisioned using the AWS CDK.

### Environment Variables

The following environment variables are available for configuring the infrastructure:

| Variable                  | Type    | Description                                            | Default          | Required |
| ------------------------- | ------- | ------------------------------------------------------ | ---------------- | -------- |
| `CDK_APP_NAME`            | string  | The application name used in resource naming           | `lambda-starter` | No       |
| `CDK_ENV`                 | enum    | Environment: `dev`, `qat`, `prd`                       | -                | Yes      |
| `CDK_ACCOUNT`             | string  | AWS account ID for deployment                          | -                | No       |
| `CDK_REGION`              | string  | AWS region for deployment                              | -                | No       |
| `CDK_OU`                  | string  | Organizational Unit for resource tagging               | `leanstacks`     | No       |
| `CDK_OWNER`               | string  | Owner tag for resource tracking                        | `unknown`        | No       |
| `CDK_CORS_ALLOW_ORIGIN`   | string  | CORS allow origin for API Gateway and Lambda functions | `*`              | No       |
| `CDK_APP_LOGGING_ENABLED` | boolean | Enable logging in Lambda functions                     | `true`           | No       |
| `CDK_APP_LOGGING_LEVEL`   | enum    | Logging level: `debug`, `info`, `warn`, `error`        | `info`           | No       |
| `CDK_APP_LOGGING_FORMAT`  | enum    | Logging format: `text`, `json`                         | `json`           | No       |

### Usage

Infrastructure configuration is managed through the `getConfig()` function in `infrastructure/utils/config.ts`:

```typescript
import { getConfig } from './utils/config';

const config = getConfig();
console.log(`Environment: ${config.CDK_ENV}`);
console.log(`App name: ${config.CDK_APP_NAME}`);
```

### Configuration Files

Infrastructure configuration can be provided through:

1. **Environment variables** - Set directly in your shell or CI/CD pipeline
2. **.env file** - Create a `.env` file in the `infrastructure/` directory for local development

Example `.env` file:

```bash
CDK_ENV=dev
CDK_ACCOUNT=123456789012
CDK_REGION=us-east-1
CDK_OU=leanstacks
CDK_OWNER=platform-team
CDK_CORS_ALLOW_ORIGIN=https://example.com
CDK_APP_LOGGING_ENABLED=true
CDK_APP_LOGGING_LEVEL=debug
CDK_APP_LOGGING_FORMAT=json
```

**Important:** Never commit `.env` files containing sensitive information to source control.

### Resource Tagging

All AWS resources created by the CDK are automatically tagged with the following tags:

| Tag     | Description                    | Source         |
| ------- | ------------------------------ | -------------- |
| `App`   | Application name               | `CDK_APP_NAME` |
| `Env`   | Environment (dev, qat, prd)    | `CDK_ENV`      |
| `OU`    | Organizational Unit            | `CDK_OU`       |
| `Owner` | Team or individual responsible | `CDK_OWNER`    |

These tags are used for cost allocation, resource management, and identifying resources in AWS.

### Environment-Specific Settings

Different environments may require different configuration values. Consider these recommendations:

#### Development (dev)

- `CDK_APP_LOGGING_LEVEL=debug` - Verbose logging for development
- `CDK_CORS_ALLOW_ORIGIN=*` - Allow all origins for easier testing
- Use minimal resource sizes to reduce costs

#### QA Testing (qat)

- `CDK_APP_LOGGING_LEVEL=info` - Balanced logging
- `CDK_CORS_ALLOW_ORIGIN=https://qat.example.com` - Restrict to QA environment
- Use production-like resource sizes

#### Production (prd)

- `CDK_APP_LOGGING_LEVEL=warn` or `error` - Minimal logging for performance
- `CDK_CORS_ALLOW_ORIGIN=https://example.com` - Restrict to production domain
- Use appropriate resource sizes and retention policies
- Enable additional monitoring and alerting

---

## Configuration Flow

The configuration flow from infrastructure to application is as follows:

1. **Infrastructure Deployment**
   - CDK reads `CDK_*` environment variables
   - CDK provisions AWS resources with configured values
   - Lambda functions receive environment variables from CDK configuration

2. **Application Runtime**
   - Lambda functions read their environment variables
   - Application config validates variables using Zod schemas
   - Application uses validated configuration for runtime behavior

### Mapping: Infrastructure → Application

Infrastructure configuration variables are passed to Lambda functions with modified names:

| Infrastructure Variable   | Lambda Environment Variable |
| ------------------------- | --------------------------- |
| `CDK_APP_LOGGING_ENABLED` | `LOGGING_ENABLED`           |
| `CDK_APP_LOGGING_LEVEL`   | `LOGGING_LEVEL`             |
| `CDK_APP_LOGGING_FORMAT`  | `LOGGING_FORMAT`            |
| `CDK_CORS_ALLOW_ORIGIN`   | `CORS_ALLOW_ORIGIN`         |
| (DynamoDB table name)     | `TASKS_TABLE`               |
| (AWS Region)              | `AWS_REGION`                |

---

## Troubleshooting

### Configuration Validation Errors

If you encounter configuration validation errors:

1. **Check required variables** - Ensure all required variables are set
2. **Verify enum values** - Check that enum values match allowed options
3. **Review error messages** - Validation errors include the field name and specific issue

Example error:

```
Configuration validation failed:
LOGGING_LEVEL: Invalid enum value. Expected 'debug' | 'info' | 'warn' | 'error', received 'verbose'
```

### Environment Variable Precedence

Environment variables can be set in multiple places. The precedence order is:

1. System environment variables (highest priority)
2. `.env` file (infrastructure only)
3. Default values in schema (lowest priority)

---

## Best Practices

1. **Never commit secrets** - Use AWS Secrets Manager or Parameter Store for sensitive data
2. **Use .env for local development** - Keep local configuration separate from code
3. **Document custom variables** - Update this guide when adding new configuration options
4. **Validate early** - Use Zod schemas to catch configuration errors at startup
5. **Use environment-specific values** - Configure resources appropriately for each environment
6. **Tag all resources** - Ensure proper tagging for cost allocation and management
