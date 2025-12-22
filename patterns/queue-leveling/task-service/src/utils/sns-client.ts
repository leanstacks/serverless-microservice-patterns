import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

import { config } from './config.js';
import { logger } from './logger.js';

/**
 * SNS client instance for publishing messages to SNS topics.
 */
const snsClient = new SNSClient({
  region: config.AWS_REGION,
});

/**
 * Interface for SNS message attributes.
 */
export interface MessageAttributes {
  [key: string]: {
    DataType: 'String' | 'Number' | 'Binary';
    StringValue?: string;
    BinaryValue?: Uint8Array;
  };
}

/**
 * Publishes a message to an SNS topic.
 * @param topicArn - The ARN of the SNS topic to publish to
 * @param message - The message content (will be converted to JSON string)
 * @param attributes - Optional message attributes for filtering
 * @returns Promise that resolves to the message ID
 * @throws Error if the SNS publish operation fails
 */
export const publishToTopic = async (
  topicArn: string,
  message: Record<string, unknown>,
  attributes?: MessageAttributes,
): Promise<string> => {
  logger.debug('[SnsClient] > publishToTopic', { topicArn });

  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(message),
      MessageAttributes: attributes,
    });

    logger.debug('[SnsClient] publishToTopic - PublishCommand', { command });

    const response = await snsClient.send(command);

    logger.debug('[SnsClient] < publishToTopic - successfully published message', {
      topicArn,
      messageId: response.MessageId,
    });

    return response.MessageId ?? '';
  } catch (error) {
    logger.error('[SnsClient] < publishToTopic - failed to publish message to SNS', error as Error, {
      topicArn,
    });
    throw error;
  }
};
