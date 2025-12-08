# Main Project Guidelines

## Project Overview

This is an project which illustrates multiple Serverless Microservice Patterns using AWS Lambda and related AWS Serverless services. The code is written in **Node.js** and **TypeScript**. The pattern projects use the **AWS CDK** for infrastructure as code. The pattern projects use **Jest** for unit tests of the infrastructure and application code.

---

## Technology Stack

Each pattern project uses the following technology stack:

- **Language:** TypeScript
- **Platform:** AWS Lambda
- **Runtime:** Node.js 24+
- **AWS SDK:** v3 (modular packages)
- **Testing:** Jest
- **Linting/Formatting:** ESLint + Prettier
- **Validation:** Zod
- **Logging:** Pino + Pino-Lambda
- **Package Manager:** npm
- **Infrastructure:** AWS CDK

---

## Pattern Project Structure

Each pattern project follows a consistent directory and file structure to promote maintainability and scalability. Below is an example structure:

```
/docs                           # Project documentation
  README.md                     # Documentation table of contents

/src
  /handlers
    get-task.ts                 # Lambda handler
    get-task.test.ts            # Unit tests for get-task
  /services
    task-service.ts             # Business logic
    task-service.test.ts        # Unit tests for task-service
  /models
    task.ts                     # Task data model
  /utils
    dynamodb-client.ts          # AWS SDK client for DynamoDB
    config.ts                   # App configuration helper
    response.ts                 # Helper for formatting Lambda responses
    response.test.ts

/infrastructure
  /stacks
    lambda-stack.ts             # CDK stack for Lambdas
  /utils
    config.ts                   # CDK config helper
  app.ts                        # CDK app entry point
  cdk.json                      # CDK config
  jest.config.ts                # CDK Jest config
  jest.setup.ts                 # CDK Jest setup
  package.json                  # CDK NPM package config
  README.md                     # CDK README
  tsconfig.json                 # CDK TypeScript config

.editorconfig                   # Editor config
.gitignore                      # Git ignore rules
.nvmrc                          # Node version manager config
.prettierrc                     # Prettier config
eslint.config.mjs               # ESLint config
jest.config.ts                  # App Jest config
jest.setup.ts                   # App Jest setup
package.json                    # App NPM package config
README.md                       # Project README
tsconfig.json                   # Project TypeScript config
```

---

## Source Code Guidelines

Each pattern project follows best practices for source code organization, naming conventions, and coding standards. Below are the key guidelines:

- Use **TypeScript** for all source and infrastructure code.
- Use arrow functions for defining functions.
- Use path aliases for cleaner imports (e.g., `@utils`, `@models`).
- Handlers parse input, call services, and return responses reside in `/handlers`.
- Core business logic should reside in `/services`.
- Create types and interfaces in `/models` for data structures and DTOs.
- Create reusable utilities in `/utils` (e.g., AWS clients, response helpers, config helpers, logging).
- Validate configuration and input data with **Zod**.
- Organize import statements: external packages first, then internal modules.
- Use async/await for asynchronous operations.
- Handle errors gracefully and return meaningful error responses.
- Document functions and modules with JSDoc comments.

### Source Code Commands & Scripts

- Use `npm run build` to compile TypeScript.
- Use `npm run test` to run tests.
- Use `npm run test:coverage` to run tests with coverage report.
- Use `npm run lint` to run ESLint.
- Use `npm run lint:fix` to fix ESLint issues.
- Use `npm run format` to run Prettier to format code.
- Use `npm run format:check` to check code formatting with Prettier.

---

## Unit Testing Guidelines

Each pattern project includes comprehensive unit tests for both application and infrastructure code. Below are the key guidelines for writing unit tests:

- Use the **Jest** testing framework.
- Place test files next to the source file, with `.test.ts` suffix.
- Use `describe` and `it` blocks for organization.
- Use `beforeEach` for setup and `afterEach` for cleanup.
- Use `expect` assertions for results.
- Mock dependencies to isolate the component under test.
- Mock external calls (e.g., AWS SDK, databases).
- Structure your tests using the Arrange-Act-Assert pattern:
  - **Arrange:** Set up the test environment, including any necessary mocks and test data.
  - **Act:** Execute the function or service being tested.
  - **Assert:** Verify that the results are as expected.
  - Add comments to separate these sections for clarity.

---

## AWS CDK Guidelines

Each pattern project uses AWS CDK for infrastructure as code. Below are the key guidelines for using AWS CDK:

- Design philosophy prioritizes cost efficiency, scalability, and security.
- Self-contained AWS CDK project for infrastructure as code.
- Use **TypeScript** for all infrastructure code.
- Use **AWS CDK v2**.
- Define one CDK stack per major grouping of resources (e.g., lambda stack, data stack).
- Never commit secrets or hardcoded credentials.
- Use **.env** for local development configuration, but do not commit to source control.
- Use **.env.example** to document required environment variables.
- Prefix environment variables with `CDK_` to avoid conflicts.
- Use **AWS SSM Parameter Store** for secure configuration.
- All CDK resources must be tagged for cost allocation and management:
  - `App`: Application name
  - `Env`: Environment (e.g., dev, qat, prd)
  - `OU`: Organizational Unit, e.g. `leanstacks` or `shared-services`
  - `Owner`: Team or individual responsible
- Tag all CDK resources appropriately (`App`, `Env`, `OU`, `Owner`).

### DynamoDB Tables

- Prefer using single-table design where feasible.
- Use composite primary keys (partition key + sort key) for efficient querying.

### Lambda Functions

- Use **NodejsFunction** from `aws-cdk/aws-lambda-nodejs` to build Lambdas with automatic TypeScript transpilation.

### AWS CDK Commands & Scripts

- Use `npm run build` to compile TypeScript.
- Use `npm run test` to run tests.
- Use `npm run synth` to synthesize CDK stacks.
- Use `npm run cdk <command>` to run CDK commands (e.g., deploy, diff).
