import { Context } from 'aws-lambda';
import { z } from 'zod';

import { SendNotificationEvent, sendNotificationEventSchema } from '@/models/notification';
import { sendNotification, NotificationAction } from '@/services/notification-service';
import { logger } from '@/utils/logger';

/**
 * Handles sending notifications asynchronously.
 *
 * This Lambda function is invoked asynchronously from another Lambda function
 * with InvokationType of 'Event'. It validates the incoming event payload and
 * delegates to the notification service to send the notification.
 *
 * @param event - The Lambda event containing notificationEvent and optional notificationPayload
 * @param context - The Lambda context
 * @returns A promise that resolves when the notification is sent successfully
 * @throws Will log errors but not throw to allow Lambda to complete
 */
export const handler = async (event: unknown, context: Context): Promise<void> => {
  logger.info('[SendNotificationHandler] > handler');
  logger.debug({ event, context }, '[SendNotificationHandler] - event');

  try {
    // Validate event payload
    const validatedEvent: SendNotificationEvent = sendNotificationEventSchema.parse(event);
    logger.debug({ validatedEvent }, '[SendNotificationHandler] Event validated');

    // Call the notification service to send the notification
    await sendNotification(validatedEvent.action as NotificationAction);

    logger.info(
      { action: validatedEvent.action },
      '[SendNotificationHandler] < handler - Notification sent successfully',
    );
  } catch (error) {
    // Log errors and throw to allow Lambda to retry if needed
    // If multiple retries fail, the event will go to the Dead Letter Queue (DLQ) if configured
    if (error instanceof z.ZodError) {
      const validationMessages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      logger.error(
        {
          error,
          validationMessages,
        },
        '[SendNotificationHandler] < handler - Event validation failed',
      );
      throw new Error(`Event validation failed: ${validationMessages}`);
    } else if (error instanceof Error) {
      logger.error({ error }, '[SendNotificationHandler] < handler - Failed to send notification');
      throw error;
    } else {
      logger.error({ error: String(error) }, '[SendNotificationHandler] < handler - Unknown error occurred');
      throw new Error('An unknown error occurred while sending notification');
    }
  }
};
