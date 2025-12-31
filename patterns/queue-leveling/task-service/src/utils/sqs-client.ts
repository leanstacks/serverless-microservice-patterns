import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

import { config } from './config.js';
import { logger } from './logger.js';

/**
 * SQS client instance for sending messages to SQS queues.
 */
const sqsClient = new SQSClient({
  region: config.AWS_REGION,
});

/**
 * Interface for SQS message attributes.
 */
export interface MessageAttributes {
  [key: string]: {
    DataType: 'String' | 'Number' | 'Binary';
    StringValue?: string;
    BinaryValue?: Uint8Array;
  };
}

/**
 * Sends a message to an SQS queue.
 * @param queueUrl - The URL of the SQS queue to send to
 * @param message - The message content (will be converted to JSON string)
 * @param attributes - Optional message attributes for filtering
 * @returns Promise that resolves to the message ID
 * @throws Error if the SQS send operation fails
 */
export const sendToQueue = async (
  queueUrl: string,
  message: Record<string, unknown>,
  attributes?: MessageAttributes,
): Promise<string> => {
  logger.info({ queueUrl }, '[SqsClient] > sendToQueue');

  try {
    // Create the SendMessageCommand with the provided parameters
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: attributes,
    });
    logger.debug({ command }, '[SqsClient] sendToQueue - SendMessageCommand');

    // Send the message using the SQS client
    const response = await sqsClient.send(command);

    // Return the message ID from the response
    logger.info(
      {
        queueUrl,
        messageId: response.MessageId,
      },
      '[SqsClient] < sendToQueue - successfully sent message',
    );
    return response.MessageId ?? '';
  } catch (error) {
    // Handle any errors that occur during the send operation
    logger.error({ error, queueUrl }, '[SqsClient] < sendToQueue - failed to send message to SQS');
    throw error;
  }
};
