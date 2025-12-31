import { Context, SQSEvent, SQSBatchResponse, SQSBatchItemFailure } from 'aws-lambda';
import { z } from 'zod';

import { sendNotificationEventSchema } from '@/models/notification';
import { sendNotification, NotificationEvent } from '@/services/notification-service';
import { logger } from '@/utils/logger';

/**
 * Handles sending notifications from SQS messages.
 *
 * This Lambda function is triggered by an SQS event source mapping from the
 * Notification Queue. It processes messages in batches, validates that each
 * message has an 'event' message attribute, and delegates to the notification
 * service to send the notification.
 *
 * @param event - The SQS event containing one or more messages
 * @param context - The Lambda context
 * @returns A promise that resolves with batch item failures so SQS knows which messages need reprocessing
 */
export const handler = async (event: SQSEvent, context: Context): Promise<SQSBatchResponse> => {
  logger.info('[SendNotificationHandler] > handler');
  logger.debug({ event, context }, '[SendNotificationHandler] - event');

  // Array to track failed message processing
  const batchItemFailures: SQSBatchItemFailure[] = [];

  // Validate the SQS event structure
  try {
    sendNotificationEventSchema.parse(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors specifically
      const validationMessages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      logger.error({ error, validationMessages }, '[SendNotificationHandler] < handler - Event validation failed');
    } else if (error instanceof Error) {
      // Handle other error types
      logger.error({ error }, '[SendNotificationHandler] < handler - Unknown error validating event');
    } else {
      // Fallback for non-Error throwables
      logger.error({ error: String(error) }, '[SendNotificationHandler] < handler - Unknown error validating event');
    }
    // Return all messages as failures if event structure is invalid
    return {
      batchItemFailures: event.Records.map((record) => ({
        itemIdentifier: record.messageId,
      })),
    };
  }

  // Process each message in the batch in parallel
  const messageProcessingPromises = event.Records.map(async (record) => {
    try {
      logger.debug({ messageId: record.messageId }, '[SendNotificationHandler] Processing message');

      // Extract the event attribute from the message
      const eventAttribute = record.messageAttributes?.event?.stringValue;

      // Validate that the event attribute is present and is a string
      if (!eventAttribute || typeof eventAttribute !== 'string') {
        logger.error(
          {
            messageId: record.messageId,
            eventAttribute,
          },
          '[SendNotificationHandler] Event attribute is missing or invalid',
        );
        // Throw error to mark this message as failed
        throw new Error('Event attribute is missing or invalid');
      }

      // Call the notification service to send the notification
      await sendNotification(eventAttribute as NotificationEvent);

      // Record successful processing
      logger.info(
        {
          messageId: record.messageId,
          event: eventAttribute,
        },
        '[SendNotificationHandler] Notification sent successfully',
      );
      return { success: true, messageId: record.messageId };
    } catch (error) {
      // Log the error and mark this message as failed
      if (error instanceof Error) {
        logger.error({ error, messageId: record.messageId }, '[SendNotificationHandler] Failed to send notification');
      } else {
        logger.error(
          { error: String(error), messageId: record.messageId },
          '[SendNotificationHandler] Unknown error occurred',
        );
      }
      return { success: false, messageId: record.messageId };
    }
  });

  // Wait for all message processing to complete
  const results = await Promise.allSettled(messageProcessingPromises);

  // Collect batch item failures from rejected promises and returned failures
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const record = event.Records[i];

    // If the promise was rejected, or if it was fulfilled but indicated failure, add to batch failures
    if (result && result.status === 'rejected') {
      logger.error(
        { error: result.reason, messageId: record?.messageId },
        '[SendNotificationHandler] Message processing promise rejected',
      );
      if (record) {
        batchItemFailures.push({
          itemIdentifier: record.messageId,
        });
      }
    } else if (result && result.status === 'fulfilled' && result.value.success === false) {
      if (record) {
        batchItemFailures.push({
          itemIdentifier: record.messageId,
        });
      }
    }
  }

  logger.info(
    {
      failureCount: batchItemFailures.length,
      totalCount: event.Records.length,
    },
    '[SendNotificationHandler] < handler - Returning batch response',
  );

  // Return the batch item failures to SQS for retrying only the failed messages
  return {
    batchItemFailures,
  };
};
