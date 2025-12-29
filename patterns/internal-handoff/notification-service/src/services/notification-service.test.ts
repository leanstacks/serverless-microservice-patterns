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
    it('should resolve successfully for task_created action', async () => {
      // Arrange
      const action = 'task_created';

      // Act
      const promise = sendNotification(action);
      jest.advanceTimersByTime(100);

      // Assert
      await expect(promise).resolves.not.toThrow();
    });

    it('should resolve successfully for task_completed action', async () => {
      // Arrange
      const action = 'task_completed';

      // Act
      const promise = sendNotification(action);
      jest.advanceTimersByTime(100);

      // Assert
      await expect(promise).resolves.not.toThrow();
    });

    it('should resolve successfully for task_deleted action', async () => {
      // Arrange
      const action = 'task_deleted';

      // Act
      const promise = sendNotification(action);
      jest.advanceTimersByTime(100);

      // Assert
      await expect(promise).resolves.not.toThrow();
    });

    it('should reject for unsupported action', async () => {
      // Arrange
      const action = 'unsupported_action' as any;

      // Act & Assert
      const promise = sendNotification(action);
      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Unsupported notification action: unsupported_action');
    });

    it('should reject for null action', async () => {
      // Arrange
      const action = null as any;

      // Act & Assert
      const promise = sendNotification(action);
      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Unsupported notification action: null');
    });

    it('should handle supported notification actions', async () => {
      // Arrange
      const action = 'task_created';

      // Act
      const promise = sendNotification(action);
      jest.advanceTimersByTime(100);

      // Assert
      await expect(promise).resolves.not.toThrow();
    });

    it('should complete asynchronously after 100ms', async () => {
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
      jest.advanceTimersByTime(100);
      await promise;

      expect(resolved).toBe(true);
    });
  });
});
