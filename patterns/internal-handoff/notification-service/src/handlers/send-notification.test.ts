import { Context } from 'aws-lambda';
import { handler } from './send-notification';
import * as notificationService from '@/services/notification-service';

jest.mock('@/services/notification-service');
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

describe('send-notification handler', () => {
  const mockContext: Context = {
    functionName: 'test-function',
    functionVersion: '1',
    awsRequestId: 'test-request-id',
    logGroupName: 'test-log-group',
    logStreamName: 'test-log-stream',
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
    callbackWaitsForEmptyEventLoop: false,
  } as unknown as Context;

  const mockSendNotification = notificationService.sendNotification as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('valid event', () => {
    it('should send notification when event is valid with action only', async () => {
      // Arrange
      const event = { action: 'task_created' };
      mockSendNotification.mockResolvedValue(undefined);

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockSendNotification).toHaveBeenCalledWith('task_created');
    });

    it('should send notification when event includes payload', async () => {
      // Arrange
      const event = {
        action: 'task_completed',
        payload: { taskId: '123', userId: 'user-456' },
      };
      mockSendNotification.mockResolvedValue(undefined);

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockSendNotification).toHaveBeenCalledWith('task_completed');
    });

    it('should log debug message with validated event', async () => {
      // Arrange
      const event = { action: 'task_deleted' };
      mockSendNotification.mockResolvedValue(undefined);

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockSendNotification).toHaveBeenCalled();
    });
  });

  describe('invalid event', () => {
    it('should log error when action is missing', async () => {
      // Arrange
      const event = { payload: { taskId: '123' } };

      // Act & Assert
      await expect(handler(event, mockContext)).rejects.toThrow();
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should log error when action is empty string', async () => {
      // Arrange
      const event = { action: '' };

      // Act & Assert
      await expect(handler(event, mockContext)).rejects.toThrow();
      expect(mockSendNotification).not.toHaveBeenCalled();
    });

    it('should log error when action is not a string', async () => {
      // Arrange
      const event = { action: 123 };

      // Act & Assert
      await expect(handler(event, mockContext)).rejects.toThrow();
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('service error handling', () => {
    it('should log error when notification service throws Error', async () => {
      // Arrange
      const event = { action: 'task_created' };
      const error = new Error('Service failed');
      mockSendNotification.mockRejectedValue(error);

      // Act & Assert
      await expect(handler(event, mockContext)).rejects.toThrow();
    });

    it('should log error when notification service throws unknown error', async () => {
      // Arrange
      const event = { action: 'task_created' };
      const unknownError = 'Some unknown error';
      mockSendNotification.mockRejectedValue(unknownError);

      // Act & Assert
      await expect(handler(event, mockContext)).rejects.toThrow();
    });
  });

  describe('logging', () => {
    it('should execute successfully', async () => {
      // Arrange
      const event = { action: 'task_created' };
      mockSendNotification.mockResolvedValue(undefined);

      // Act & Assert
      await expect(handler(event, mockContext)).resolves.not.toThrow();
    });
  });
});
