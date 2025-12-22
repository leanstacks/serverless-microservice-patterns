#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { getConfig, getEnvironmentConfig, getTags } from './utils/config';
import { SqsStack } from './stacks/sqs-stack';
import { LambdaStack } from './stacks/lambda-stack';

// Load and validate configuration
const config = getConfig();

// Create CDK app
const app = new cdk.App();

// Get standard tags
const tags = getTags(config);

// Get AWS environment configuration
const environmentConfig = getEnvironmentConfig(config);

// Create SQS Stack
const sqsStack = new SqsStack(app, `${config.CDK_APP_NAME}-sqs-stack-${config.CDK_ENV}`, {
  appName: config.CDK_APP_NAME,
  envName: config.CDK_ENV,
  stackName: `${config.CDK_APP_NAME}-sqs-${config.CDK_ENV}`,
  description: `SQS queues for ${config.CDK_APP_NAME} (${config.CDK_ENV})`,
  ...(environmentConfig && { env: environmentConfig }),
});

// Create Lambda Stack
const lambdaStack = new LambdaStack(app, `${config.CDK_APP_NAME}-lambda-stack-${config.CDK_ENV}`, {
  appName: config.CDK_APP_NAME,
  envName: config.CDK_ENV,
  stackName: `${config.CDK_APP_NAME}-lambda-${config.CDK_ENV}`,
  description: `Lambda functions for ${config.CDK_APP_NAME} (${config.CDK_ENV})`,
  loggingEnabled: config.CDK_APP_LOGGING_ENABLED,
  loggingLevel: config.CDK_APP_LOGGING_LEVEL,
  loggingFormat: config.CDK_APP_LOGGING_FORMAT,
  notificationQueue: sqsStack.notificationQueue,
  ...(environmentConfig && { env: environmentConfig }),
});

// Add dependency to ensure SQS stack is created before Lambda stack
lambdaStack.addDependency(sqsStack);

// Apply tags to all stacks in the app
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});
