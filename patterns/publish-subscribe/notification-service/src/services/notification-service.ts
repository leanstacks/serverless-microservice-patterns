import { logger } from '@/utils/logger';

const NOTIFICATION_EVENTS = ['task_created', 'task_updated', 'task_deleted'] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

/**
 * Sends a notification of the specified type.
 * @param event The type of notification to send (e.g., 'task_created', 'task_updated', 'task_deleted').
 * @returns A promise that resolves when the notification is sent successfully, or rejects if the type is unsupported.
 */
const sendNotification = (event: NotificationEvent): Promise<void> => {
  return new Promise((resolve, reject) => {
    logger.info('[NotificationService] > sendNotification', { event });

    // Simulate an asynchronous operation to send a notification
    // In a real implementation, this would involve calling an external service
    // such as an email server, SMS gateway, or push notification service.
    setTimeout(() => {
      if (NOTIFICATION_EVENTS.includes(event)) {
        logger.info(`[NotificationService] < sendNotification - Notification with event: ${event} sent successfully.`);
        resolve();
      } else {
        logger.error(
          `[NotificationService] < sendNotification - Failed to send notification. Unsupported event: ${event}`,
        );
        reject(new Error(`Unsupported notification event: ${event}`));
      }
    }, 100);
  });
};

export { sendNotification };
