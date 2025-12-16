import { sendNotification } from './notification-service';
import { logger } from '@/utils/logger';

jest.mock('@/utils/logger');

describe('notification-service', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('sendNotification', () => {
    it('should resolve successfully for task_created event', async () => {
      // Arrange
      const event = 'task_created';

      // Act
      const promise = sendNotification(event);
      jest.advanceTimersByTime(250);
      await promise;

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[NotificationService] > sendNotification', { event });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[NotificationService] < sendNotification - Notification with event: task_created sent successfully.',
      );
    });

    it('should resolve successfully for task_updated event', async () => {
      // Arrange
      const event = 'task_updated';

      // Act
      const promise = sendNotification(event);
      jest.advanceTimersByTime(250);
      await promise;

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[NotificationService] > sendNotification', { event });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[NotificationService] < sendNotification - Notification with event: task_updated sent successfully.',
      );
    });

    it('should resolve successfully for task_deleted event', async () => {
      // Arrange
      const event = 'task_deleted';

      // Act
      const promise = sendNotification(event);
      jest.advanceTimersByTime(250);
      await promise;

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[NotificationService] > sendNotification', { event });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[NotificationService] < sendNotification - Notification with event: task_deleted sent successfully.',
      );
    });

    it('should reject for unsupported event', async () => {
      // Arrange
      const event = 'unsupported_event' as any;

      // Act & Assert
      const promise = sendNotification(event);
      jest.advanceTimersByTime(250);

      await expect(promise).rejects.toThrow('Unsupported notification event: unsupported_event');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[NotificationService] < sendNotification - Failed to send notification. Unsupported event: unsupported_event',
      );
    });

    it('should reject for null event', async () => {
      // Arrange
      const event = null as any;

      // Act & Assert
      const promise = sendNotification(event);
      jest.advanceTimersByTime(250);

      await expect(promise).rejects.toThrow('Unsupported notification event: null');
    });

    it('should call logger entry method', async () => {
      // Arrange
      const event = 'task_created';

      // Act
      const promise = sendNotification(event);
      jest.advanceTimersByTime(250);
      await promise;

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[NotificationService] > sendNotification', { event });
    });

    it('should complete asynchronously after 250ms', async () => {
      // Arrange
      const event = 'task_created';
      let resolved = false;

      // Act
      const promise = sendNotification(event);
      promise.then(() => {
        resolved = true;
      });

      // Assert - should not be resolved yet
      expect(resolved).toBe(false);

      // Advance timer
      jest.advanceTimersByTime(250);
      await promise;

      expect(resolved).toBe(true);
    });
  });
});
