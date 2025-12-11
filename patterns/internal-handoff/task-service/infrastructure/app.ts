#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { getConfig, getEnvironmentConfig, getTags } from './utils/config';
import { DataStack } from './stacks/data-stack';
import { LambdaStack } from './stacks/lambda-stack';

// Load and validate configuration
const config = getConfig();

// Create CDK app
const app = new cdk.App();

// Get standard tags
const tags = getTags(config);

// Get AWS environment configuration
const environmentConfig = getEnvironmentConfig(config);

// Create Data Stack
const dataStack = new DataStack(app, `${config.CDK_APP_NAME}-data-stack-${config.CDK_ENV}`, {
  appName: config.CDK_APP_NAME,
  envName: config.CDK_ENV,
  stackName: `${config.CDK_APP_NAME}-data-${config.CDK_ENV}`,
  description: `Data resources for ${config.CDK_APP_NAME} (${config.CDK_ENV})`,
  ...(environmentConfig && { env: environmentConfig }),
});

// Create Lambda Stack
new LambdaStack(app, `${config.CDK_APP_NAME}-lambda-stack-${config.CDK_ENV}`, {
  appName: config.CDK_APP_NAME,
  envName: config.CDK_ENV,
  stackName: `${config.CDK_APP_NAME}-lambda-${config.CDK_ENV}`,
  description: `Lambda functions and API Gateway for ${config.CDK_APP_NAME} (${config.CDK_ENV})`,
  taskTable: dataStack.taskTable,
  loggingEnabled: config.CDK_APP_LOGGING_ENABLED,
  loggingLevel: config.CDK_APP_LOGGING_LEVEL,
  loggingFormat: config.CDK_APP_LOGGING_FORMAT,
  corsAllowOrigin: config.CDK_CORS_ALLOW_ORIGIN,
  ...(environmentConfig && { env: environmentConfig }),
});

// Apply tags to all stacks in the app
Object.entries(tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});
