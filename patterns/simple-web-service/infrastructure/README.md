# Infrastructure

AWS CDK infrastructure for this project.

## Technology Stack

- **AWS CDK:** v2
- **Language:** TypeScript 5.9+
- **Node.js:** v24+
- **Package Manager:** npm
- **Testing:** Jest
- **Validation:** Zod

## Project Structure

```
/infrastructure
   /stacks
      data-stack.ts           # DynamoDB tables and data resources
      data-stack.test.ts      # Unit tests for data stack
      lambda-stack.ts         # Lambda/API Gateway resources
      lambda-stack.test.ts    # Unit tests for lambda stack
   /utils
      config.ts               # Configuration management with Zod validation
      config.test.ts          # Unit tests for config
   app.ts                     # CDK application entry point
   cdk.context.json           # CDK context values
   cdk.json                   # CDK configuration and feature flags
   jest.config.ts             # Jest configuration
   jest.setup.ts              # Jest setup
   package.json               # Dependencies and scripts
   tsconfig.json              # TypeScript configuration
   .env                       # Local environment variables (not committed)
   .env.example               # Example environment configuration
   README.md                  # This file
```

## Prerequisites

Before you begin, ensure you have the following installed and configured:

1. **Node.js v24 or later** (use NVM to manage Node.js versions)

   ```bash
   # Install NVM (if not already installed)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

   # Install and use the Node.js version specified in .nvmrc
   nvm install
   nvm use

   # Verify installation
   node --version  # Should match the version in .nvmrc
   ```

2. **AWS CLI** configured with appropriate credentials

   ```bash
   aws configure
   aws sts get-caller-identity  # Verify credentials
   ```

3. **AWS Account(s)** for target environment(s)
   - Separate accounts recommended for dev, qat, and prd
   - Appropriate IAM permissions to create resources

4. **CDK Bootstrap** (first-time setup per account/region)
   ```bash
   cdk bootstrap aws://ACCOUNT-ID/REGION
   ```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set the required variables:

```bash
# Required
CDK_ENV=dev

# Optional - Application name (default: lambda-starter)
# CDK_APP_NAME=my-app

# Optional - Override AWS credentials (uses CDK_DEFAULT_ACCOUNT/REGION from AWS CLI by default)
# CDK_ACCOUNT=123456789012
# CDK_REGION=us-east-1

# Optional - Resource tagging
# CDK_OU=leanstacks
# CDK_OWNER=team-name
```

**Important:** The `.env` file is excluded from version control. Never commit credentials or secrets.

### 3. Build the Infrastructure Code

```bash
npm run build
```

### 4. Run Tests

```bash
npm test
```

### 5. Synthesize CloudFormation Templates

```bash
npm run synth
```

This generates CloudFormation templates in the `cdk.out` directory. Review them to understand what will be deployed.

### 6. Deploy (Optional)

```bash
npm run deploy:all
```

## Configuration

### Environment Variables

See the [Configuration Guide](../docs/ConfigurationGuide.md) for a comprehensive list of variables and secrets.

### AWS Account and Region Resolution

The CDK automatically detects your AWS account and region from your AWS CLI configuration:

- **CDK_DEFAULT_ACCOUNT**: Set by CDK from your AWS credentials
- **CDK_DEFAULT_REGION**: Set by CDK from your AWS profile

You can override these by setting `CDK_ACCOUNT` and `CDK_REGION` in your `.env` file.

### Configuration Validation

Configuration is validated using Zod at synthesis time. Invalid configurations will fail with descriptive error messages:

```bash
# Missing CDK_ENV
Error: CDK configuration validation failed: CDK_ENV: Required

# Invalid CDK_ENV value
Error: CDK configuration validation failed: CDK_ENV: CDK_ENV must be one of: dev, qat, prd
```

## Available Commands

| Command                 | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `npm run build`         | Compile TypeScript to JavaScript (outputs to `cdk.out`) |
| `npm run clean`         | Remove build artifacts and coverage reports             |
| `npm test`              | Run unit tests                                          |
| `npm run test:coverage` | Run tests with coverage report                          |
| `npm run test:watch`    | Run tests in watch mode                                 |
| `npm run synth`         | Synthesize CloudFormation templates                     |
| `npm run cdk <command>` | Run any CDK CLI command                                 |
| `npm run deploy`        | Deploy all stacks to AWS                                |
| `npm run diff`          | Show differences between deployed and local             |
| `npm run destroy`       | Destroy deployed stacks                                 |

### Common CDK Commands

```bash
# List all stacks
npm run cdk list

# Show differences for a specific stack
npm run cdk diff lambda-starter-data-dev

# Deploy a specific stack
npm run cdk deploy lambda-starter-data-dev

# View stack outputs
npm run cdk list --long

# Destroy all stacks
npm run cdk destroy --all
```

## Stacks

See the [Infrastructure Guide](../docs/InfrastructureGuide.md) for a comprehensive list of stacks, resources, and outputs.

## Further Reading

- [Project Documentation](../docs/README.md)
- [AWS CDK Developer Guide](https://docs.aws.amazon.com/cdk/latest/guide/)
- [AWS CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html)
