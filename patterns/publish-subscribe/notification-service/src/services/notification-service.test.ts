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
    it('should resolve successfully for task_created action', async () => {
      // Arrange
      const action = 'task_created';

      // Act
      const promise = sendNotification(action);
      jest.advanceTimersByTime(250);
      await promise;

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[NotificationService] > sendNotification', { action });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[NotificationService] < sendNotification - Notification with action: task_created sent successfully.',
      );
    });

    it('should resolve successfully for task_completed action', async () => {
      // Arrange
      const action = 'task_completed';

      // Act
      const promise = sendNotification(action);
      jest.advanceTimersByTime(250);
      await promise;

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[NotificationService] > sendNotification', { action });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[NotificationService] < sendNotification - Notification with action: task_completed sent successfully.',
      );
    });

    it('should resolve successfully for task_deleted action', async () => {
      // Arrange
      const action = 'task_deleted';

      // Act
      const promise = sendNotification(action);
      jest.advanceTimersByTime(250);
      await promise;

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[NotificationService] > sendNotification', { action });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[NotificationService] < sendNotification - Notification with action: task_deleted sent successfully.',
      );
    });

    it('should reject for unsupported action', async () => {
      // Arrange
      const action = 'unsupported_action' as any;

      // Act & Assert
      const promise = sendNotification(action);
      jest.advanceTimersByTime(250);

      await expect(promise).rejects.toThrow('Unsupported notification action: unsupported_action');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[NotificationService] < sendNotification - Failed to send notification. Unsupported action: unsupported_action',
      );
    });

    it('should reject for null action', async () => {
      // Arrange
      const action = null as any;

      // Act & Assert
      const promise = sendNotification(action);
      jest.advanceTimersByTime(250);

      await expect(promise).rejects.toThrow('Unsupported notification action: null');
    });

    it('should call logger entry method', async () => {
      // Arrange
      const action = 'task_created';

      // Act
      const promise = sendNotification(action);
      jest.advanceTimersByTime(250);
      await promise;

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[NotificationService] > sendNotification', { action });
    });

    it('should complete asynchronously after 250ms', async () => {
      // Arrange
      const action = 'task_created';
      let resolved = false;

      // Act
      const promise = sendNotification(action);
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
