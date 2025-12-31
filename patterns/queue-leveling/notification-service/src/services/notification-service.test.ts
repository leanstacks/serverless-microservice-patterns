import { sendNotification } from './notification-service';

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  resetLogger: jest.fn(),
  withRequestTracking: jest.fn(),
}));

describe('notification-service', () => {
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
      jest.advanceTimersByTime(100);
      await promise;

      // Assert
      expect(promise).resolves.toBeUndefined();
    });

    it('should resolve successfully for task_updated event', async () => {
      // Arrange
      const event = 'task_updated';

      // Act
      const promise = sendNotification(event);
      jest.advanceTimersByTime(100);
      await promise;

      // Assert
      expect(promise).resolves.toBeUndefined();
    });

    it('should resolve successfully for task_deleted event', async () => {
      // Arrange
      const event = 'task_deleted';

      // Act
      const promise = sendNotification(event);
      jest.advanceTimersByTime(100);
      await promise;

      // Assert
      expect(promise).resolves.toBeUndefined();
    });

    it('should reject for unsupported event', async () => {
      // Arrange
      const event = 'unsupported_event' as any;

      // Act & Assert
      const promise = sendNotification(event);
      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Unsupported notification event: unsupported_event');
    });

    it('should reject for null event', async () => {
      // Arrange
      const event = null as any;

      // Act & Assert
      const promise = sendNotification(event);
      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Unsupported notification event: null');
    });

    it('should complete asynchronously after 100ms', async () => {
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
      jest.advanceTimersByTime(100);
      await promise;

      expect(resolved).toBe(true);
    });
  });
});
