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
  logger.info('[SendNotificationHandler] > handler', { event, context });

  // Array to track failed message processing
  const batchItemFailures: SQSBatchItemFailure[] = [];

  // Validate the SQS event structure
  try {
    sendNotificationEventSchema.parse(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      logger.error('[SendNotificationHandler] < handler - Event validation failed', new Error(message), {
        issues: error.issues,
        message,
      });
    } else if (error instanceof Error) {
      logger.error('[SendNotificationHandler] < handler - Unknown error validating event', error);
    } else {
      logger.error('[SendNotificationHandler] < handler - Unknown error validating event', new Error(String(error)));
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
      logger.debug('[SendNotificationHandler] Processing message', { messageId: record.messageId });

      // Extract the event attribute from the message
      const eventAttribute = record.messageAttributes?.event?.stringValue;

      // Validate that the event attribute is present and is a string
      if (!eventAttribute || typeof eventAttribute !== 'string') {
        logger.error('[SendNotificationHandler] Event attribute is missing or invalid', undefined, {
          messageId: record.messageId,
          eventAttribute,
        });
        // Throw error to mark this message as failed
        throw new Error('Event attribute is missing or invalid');
      }

      // Call the notification service to send the notification
      await sendNotification(eventAttribute as NotificationEvent);

      logger.info('[SendNotificationHandler] Notification sent successfully', {
        messageId: record.messageId,
        event: eventAttribute,
      });

      return { success: true, messageId: record.messageId };
    } catch (error) {
      // Log the error and mark this message as failed
      if (error instanceof Error) {
        logger.error('[SendNotificationHandler] Failed to send notification', error, {
          messageId: record.messageId,
        });
      } else {
        logger.error('[SendNotificationHandler] Unknown error occurred', new Error(String(error)), {
          messageId: record.messageId,
          errorValue: String(error),
        });
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
      logger.error('[SendNotificationHandler] Message processing promise rejected', result.reason as Error, {
        messageId: record?.messageId,
      });
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

  logger.info('[SendNotificationHandler] < handler - Returning batch response', {
    failureCount: batchItemFailures.length,
    totalCount: event.Records.length,
  });

  // Return the batch item failures to SQS for retrying only the failed messages
  return {
    batchItemFailures,
  };
};
