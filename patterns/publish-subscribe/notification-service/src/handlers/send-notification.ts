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

  // Process each message in the batch
  for (const record of event.Records) {
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
        batchItemFailures.push({
          itemIdentifier: record.messageId,
        });
        continue;
      }

      // Call the notification service to send the notification
      await sendNotification(eventAttribute as NotificationEvent);

      logger.info('[SendNotificationHandler] Notification sent successfully', {
        messageId: record.messageId,
        event: eventAttribute,
      });
    } catch (error) {
      // Log the error and add to batch failures so the message will be retried
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
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  logger.info('[SendNotificationHandler] < handler - Returning batch response', {
    failureCount: batchItemFailures.length,
    totalCount: event.Records.length,
  });

  return {
    batchItemFailures,
  };
};
