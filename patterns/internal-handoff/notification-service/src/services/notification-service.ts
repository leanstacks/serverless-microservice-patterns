import { logger } from '@/utils/logger';

const NOTIFICATION_ACTIONS = ['task_created', 'task_completed', 'task_deleted'] as const;

export type NotificationAction = (typeof NOTIFICATION_ACTIONS)[number];

/**
 * Sends a notification of the specified type.
 * @param action The type of notification to send (e.g., 'task_created', 'task_completed', 'task_deleted').
 * @returns A promise that resolves when the notification is sent successfully, or rejects if the type is unsupported.
 */
const sendNotification = (action: NotificationAction): Promise<void> => {
  return new Promise((resolve, reject) => {
    logger.info('[NotificationService] > sendNotification', { action });

    // Simulate an asynchronous operation to send a notification
    // In a real implementation, this would involve calling an external service
    // such as an email server, SMS gateway, or push notification service.
    setTimeout(() => {
      if (NOTIFICATION_ACTIONS.includes(action)) {
        logger.info(
          `[NotificationService] < sendNotification - Notification with action: ${action} sent successfully.`,
        );
        resolve();
      } else {
        logger.error(
          `[NotificationService] < sendNotification - Failed to send notification. Unsupported action: ${action}`,
        );
        reject(new Error(`Unsupported notification action: ${action}`));
      }
    }, 250);
  });
};

export { sendNotification };
