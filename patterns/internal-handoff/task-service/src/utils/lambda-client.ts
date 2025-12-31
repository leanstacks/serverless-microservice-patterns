import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

import { config } from './config';
import { logger } from './logger';

/**
 * AWS Lambda service client
 */
const _lambdaClient = new LambdaClient({ region: config.AWS_REGION });

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
    // Create the InvokeCommand with RequestResponse invocation type
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
        {
          functionName,
          FunctionError: response.FunctionError,
          responsePayload,
        },
        '[LambdaClient] < invokeLambdaSync - Lambda function returned an error',
      );
      throw new Error(`Lambda function error: ${response.FunctionError}`);
    }

    logger.info(
      { functionName, statusCode: response.StatusCode },
      '[LambdaClient] < invokeLambdaSync - successfully invoked Lambda function',
    );
    // Return the response payload
    return responsePayload as T;
  } catch (error) {
    logger.error(
      {
        error,
        functionName,
      },
      '[LambdaClient] < invokeLambdaSync - failed to invoke Lambda function',
    );
    throw error;
  }
};

/**
 * Invokes a Lambda function asynchronously (Event)
 * @param functionName - The name or ARN of the Lambda function to invoke
 * @param payload - The JSON payload to pass to the Lambda function
 * @throws Error if the Lambda invocation fails
 */
export const invokeLambdaAsync = async (functionName: string, payload: unknown): Promise<void> => {
  logger.info({ functionName }, '[LambdaClient] > invokeLambdaAsync');

  try {
    // Create the InvokeCommand with Event invocation type
    const command = new InvokeCommand({
      FunctionName: functionName,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload),
    });
    logger.debug({ command }, '[LambdaClient] invokeLambdaAsync - InvokeCommand');

    // Send the command to invoke the Lambda function asynchronously
    const response = await _lambdaClient.send(command);

    // Check for function errors
    if (response.FunctionError) {
      logger.error(
        { functionName, response },
        '[LambdaClient] < invokeLambdaAsync - Lambda function returned an error',
      );
      throw new Error(`Lambda function error: ${response.FunctionError}`);
    }

    logger.info(
      {
        functionName,
        statusCode: response.StatusCode,
      },
      '[LambdaClient] < invokeLambdaAsync - successfully invoked Lambda function',
    );
  } catch (error) {
    logger.error(
      {
        error,
        functionName,
      },
      '[LambdaClient] < invokeLambdaAsync - failed to invoke Lambda function',
    );
    throw error;
  }
};
