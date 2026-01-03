# Task Service

## Getting started

### Prerequisites

Before you begin, ensure you have the following installed:

- **[Node Version Manager (NVM)](https://github.com/nvm-sh/nvm)** - Manages Node.js versions
- **Node.js** - JavaScript runtime (install via NVM)
- **npm** - Package manager (comes with Node.js)
- **AWS CLI** - For AWS credentials and configuration (recommended)

#### Setting up Node.js with NVM

This project uses the Node.js version specified in `.nvmrc`. See the [official nvm guide](https://github.com/nvm-sh/nvm) for additional information.

```bash
# Install NVM (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# Install and use the correct Node.js version
nvm install
nvm use

# Verify installation
node --version  # Should output same version as in .nvmrc
```

#### Installing Dependencies

```bash
# Install project dependencies
npm install
```

## Project structure

This is a high-level overview of the project structure. This structure separates the infrastructure as code from the Lambda application code. Within the Lambda microservice component, directories provide structure to implement DRY (Don't Repeat Yourself) code which follows the SRP (Single Responsibility Principle).

```
/docs                           # Project documentation

/infrastructure                 # AWS CDK infrastructure code
  /stacks                       # CDK stack definitions
  /utils                        # CDK utilities and helpers
  app.ts                        # CDK app entry point
  cdk.json                      # CDK configuration
  jest.config.ts                # Infrastructure Jest configuration
  package.json                  # Infrastructure dependencies and scripts
  tsconfig.json                 # Infrastructure TypeScript configuration
  .env.example                  # Infrastructure example .env

/src                            # Application source code
  /handlers                     # Lambda function handlers
  /models                       # Data models and types
  /services                     # Business logic services
  /utils                        # Utility functions and helpers

eslint.config.mjs               # ESLint configuration
jest.config.ts                  # Jest testing configuration
package.json                    # Project dependencies and scripts
tsconfig.json                   # TypeScript configuration
.nvmrc                          # Node.js version specification
.prettierrc                     # Prettier formatting configuration
.editorconfig                   # Editor configuration
```

## How to use

### Commands and scripts

#### Development Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Clean generated files and directories
npm run clean
```

#### Code Quality Commands

```bash
# Format code with Prettier
npm run format

# Check code formatting without making changes
npm run format:check

# Lint code with ESLint
npm run lint

# Lint and auto-fix issues
npm run lint:fix
```

#### Testing Commands

```bash
# Run tests without coverage
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (reruns on file changes)
npm run test:watch
```

## Technology Stack

- **Language:** TypeScript
- **Platform:** AWS Lambda
- **Runtime:** Node.js 24+ (see .nvmrc)
- **Package Manager:** npm
- **AWS SDK:** v3
- **Testing:** Jest
- **Linting/Formatting:** ESLint + Prettier
- **Validation:** Zod
- **Logging:** Pino + Pino Lambda
- **Infrastructure:** AWS CDK
- **DevOps:** GitHub Actions

## Key Dependencies

### Runtime Dependencies

- **[@aws-sdk/client-dynamodb](https://www.npmjs.com/package/@aws-sdk/client-dynamodb)** - AWS SDK v3 DynamoDB client
- **[@aws-sdk/lib-dynamodb](https://www.npmjs.com/package/@aws-sdk/lib-dynamodb)** - DynamoDB document client utilities
- **[@aws-sdk/client-sqs](https://www.npmjs.com/package/@aws-sdk/client-sqs)** - AWS SDK v3 SQS client
- **[csv-parse](https://www.npmjs.com/package/csv-parse)** - A parser converting CSV text input into JSON arrays or objects.
- **[zod](https://www.npmjs.com/package/zod)** - TypeScript-first schema validation
- **[pino](https://getpino.io/)** - Low overhead, fast logger for JavaScript

### Development Dependencies

- **[@types/aws-lambda](https://www.npmjs.com/package/@types/aws-lambda)** - TypeScript definitions for AWS Lambda
- **[jest](https://www.npmjs.com/package/jest)** - Testing framework
- **[eslint](https://www.npmjs.com/package/eslint)** - Linting utility
- **[prettier](https://www.npmjs.com/package/prettier)** - Code formatter

## Environments

The project supports multiple environments:

- **dev** - Development environment
- **qat** - Quality Assurance/Testing environment
- **prd** - Production environment

Each environment has its own AWS account and configuration.

## Further Reading

- [Project Documentation](./docs/README.md)
