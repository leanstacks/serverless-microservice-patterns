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
  logger.info({ functionName }, '[LambdaClient] > invokeLambdaSync');

  try {
    // Create the InvokeCommand
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload),
    });
    logger.debug({ command }, '[LambdaClient] invokeLambdaSync - InvokeCommand');

    // Send the command to invoke the Lambda function synchronously
    const response = await _lambdaClient.send(command);

    // Parse the response payload
    const responsePayload = response.Payload ? JSON.parse(new TextDecoder().decode(response.Payload)) : null;

    // Check for function errors
    if (response.FunctionError) {
      logger.error(
        { functionName, FunctionError: response.FunctionError, responsePayload },
        '[LambdaClient] < invokeLambdaSync - Lambda function returned an error',
      );
      throw new Error(`Lambda function error: ${response.FunctionError}`);
    }

    logger.debug({ responsePayload }, '[LambdaClient] invokeLambdaSync - response payload');
    logger.info(
      { functionName, statusCode: response.StatusCode },
      '[LambdaClient] < invokeLambdaSync - successfully invoked Lambda function',
    );
    return responsePayload as T;
  } catch (error) {
    logger.error({ error, functionName }, '[LambdaClient] < invokeLambdaSync - failed to invoke Lambda function');
    throw error;
  }
};
