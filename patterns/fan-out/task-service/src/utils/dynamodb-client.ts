import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Configuration for the DynamoDB client
 */
const clientConfig: DynamoDBClientConfig = {
  region: config.AWS_REGION,
};

/**
 * Singleton DynamoDB client configured with the application's region
 */
export const dynamoClient = new DynamoDBClient(clientConfig);

/**
 * Singleton DynamoDB Document client for easier interaction with DynamoDB
 */
export const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

logger.info({ dynamoDBClientConfig: clientConfig }, '[DynamoDBClient] - Initialized AWS DynamoDB client');
