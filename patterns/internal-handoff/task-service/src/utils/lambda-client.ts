import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

import { logger } from './logger.js';

/**
 * AWS Lambda service client
 */
const _lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Invokes a Lambda function synchronously (RequestResponse)
 * @param functionName - The name or ARN of the Lambda function to invoke
 * @param payload - The JSON payload to pass to the Lambda function
 * @returns The response payload from the Lambda function
 * @throws Error if the Lambda invocation fails
 */
export const invokeLambdaSync = async <T = unknown>(functionName: string, payload: unknown): Promise<T> => {
  logger.info('[LambdaClient] > invokeLambdaSync', { functionName });

  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload),
    });

    logger.debug('[LambdaClient] invokeLambdaSync - InvokeCommand', { command });

    const response = await _lambdaClient.send(command);

    // Parse the response payload
    const responsePayload = response.Payload ? JSON.parse(new TextDecoder().decode(response.Payload)) : null;

    logger.info('[LambdaClient] < invokeLambdaSync - successfully invoked Lambda function', {
      functionName,
      statusCode: response.StatusCode,
    });

    // Check for function errors
    if (response.FunctionError) {
      logger.error(
        '[LambdaClient] < invokeLambdaSync - Lambda function returned an error',
        new Error(response.FunctionError),
        {
          functionName,
          FunctionError: response.FunctionError,
          responsePayload,
        },
      );
      throw new Error(`Lambda function error: ${response.FunctionError}`);
    }

    return responsePayload as T;
  } catch (error) {
    logger.error('[LambdaClient] < invokeLambdaSync - failed to invoke Lambda function', error as Error, {
      functionName,
    });
    throw error;
  }
};

/**
 * Invokes a Lambda function asynchronously (RequestResponse)
 * @param functionName - The name or ARN of the Lambda function to invoke
 * @param payload - The JSON payload to pass to the Lambda function
 * @returns The response payload from the Lambda function
 * @throws Error if the Lambda invocation fails
 */
export const invokeLambdaAsync = async <T = unknown>(functionName: string, payload: unknown): Promise<T> => {
  logger.info('[LambdaClient] > invokeLambdaAsync', { functionName });

  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload),
    });

    logger.debug('[LambdaClient] invokeLambdaAsync - InvokeCommand', { command });

    const response = await _lambdaClient.send(command);

    // Parse the response payload
    const responsePayload = response.Payload ? JSON.parse(new TextDecoder().decode(response.Payload)) : null;

    logger.info('[LambdaClient] < invokeLambdaAsync - successfully invoked Lambda function', {
      functionName,
      statusCode: response.StatusCode,
    });

    // Check for function errors
    if (response.FunctionError) {
      logger.error(
        '[LambdaClient] < invokeLambdaAsync - Lambda function returned an error',
        new Error(response.FunctionError),
        {
          functionName,
          FunctionError: response.FunctionError,
          responsePayload,
        },
      );
      throw new Error(`Lambda function error: ${response.FunctionError}`);
    }

    return responsePayload as T;
  } catch (error) {
    logger.error('[LambdaClient] < invokeLambdaAsync - failed to invoke Lambda function', error as Error, {
      functionName,
    });
    throw error;
  }
};
