#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

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

// Import the API Gateway and authorizer from the auth-service stack
// These are exported from auth-service infrastructure
const apiId = cdk.Fn.importValue(`auth-service-api-id-${config.CDK_ENV}`);
const authorizerId = cdk.Fn.importValue(`auth-service-authorizer-id-${config.CDK_ENV}`);

// Get references to the shared API and authorizer
const api = apigateway.RestApi.fromRestApiAttributes(app, 'SharedApi', {
  restApiId: apiId,
  rootResourceId: cdk.Fn.importValue(`auth-service-api-root-resource-id-${config.CDK_ENV}`),
});

const authorizer = apigateway.Authorizer.fromAuthorizerAttributes(app, 'SharedAuthorizer', {
  authorizerId,
});

// Create Lambda Stack with references to shared API and authorizer
new LambdaStack(app, `${config.CDK_APP_NAME}-lambda-stack-${config.CDK_ENV}`, {
  appName: config.CDK_APP_NAME,
  envName: config.CDK_ENV,
  stackName: `${config.CDK_APP_NAME}-lambda-${config.CDK_ENV}`,
  description: `Lambda functions for ${config.CDK_APP_NAME} (${config.CDK_ENV})`,
  taskTable: dataStack.taskTable,
  api: api as apigateway.RestApi,
  authorizer: authorizer as apigateway.TokenAuthorizer,
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
