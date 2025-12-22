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
export const sendMessage = async (
  queueUrl: string,
  message: Record<string, unknown>,
  attributes?: MessageAttributes,
): Promise<string> => {
  logger.debug('[SqsClient] > sendMessage', { queueUrl });

  try {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      MessageAttributes: attributes,
    });

    logger.debug('[SqsClient] sendMessage - SendMessageCommand', { command });

    const response = await sqsClient.send(command);

    logger.debug('[SqsClient] < sendMessage - successfully sent message', {
      queueUrl,
      messageId: response.MessageId,
    });

    return response.MessageId ?? '';
  } catch (error) {
    logger.error('[SqsClient] < sendMessage - failed to send message to SQS', error as Error, {
      queueUrl,
    });
    throw error;
  }
};
