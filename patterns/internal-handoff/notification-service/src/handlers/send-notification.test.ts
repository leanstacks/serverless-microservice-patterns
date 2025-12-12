import { Context } from 'aws-lambda';
import { handler } from './send-notification';
import * as notificationService from '@/services/notification-service';
import { logger } from '@/utils/logger';

jest.mock('@/services/notification-service');
jest.mock('@/utils/logger');

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

  const mockLogger = logger as jest.Mocked<typeof logger>;
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
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[SendNotificationHandler] < handler - Notification sent successfully',
        { action: 'task_created' },
      );
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
      expect(mockLogger.info).toHaveBeenCalledWith(
        '[SendNotificationHandler] < handler - Notification sent successfully',
        { action: 'task_completed' },
      );
    });

    it('should log debug message with validated event', async () => {
      // Arrange
      const event = { action: 'task_deleted' };
      mockSendNotification.mockResolvedValue(undefined);

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[SendNotificationHandler] Event validated',
        expect.objectContaining({
          validatedEvent: { action: 'task_deleted' },
        }),
      );
    });
  });

  describe('invalid event', () => {
    it('should log error when action is missing', async () => {
      // Arrange
      const event = { payload: { taskId: '123' } };

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockSendNotification).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[SendNotificationHandler] < handler - Event validation failed',
        expect.any(Error),
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
    });

    it('should log error when action is empty string', async () => {
      // Arrange
      const event = { action: '' };

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockSendNotification).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[SendNotificationHandler] < handler - Event validation failed',
        expect.any(Error),
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
    });

    it('should log error when action is not a string', async () => {
      // Arrange
      const event = { action: 123 };

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockSendNotification).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[SendNotificationHandler] < handler - Event validation failed',
        expect.any(Error),
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
    });
  });

  describe('service error handling', () => {
    it('should log error when notification service throws Error', async () => {
      // Arrange
      const event = { action: 'task_created' };
      const error = new Error('Service failed');
      mockSendNotification.mockRejectedValue(error);

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[SendNotificationHandler] < handler - Failed to send notification',
        error,
      );
    });

    it('should log error when notification service throws unknown error', async () => {
      // Arrange
      const event = { action: 'task_created' };
      const unknownError = 'Some unknown error';
      mockSendNotification.mockRejectedValue(unknownError);

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[SendNotificationHandler] < handler - Unknown error occurred',
        undefined,
        expect.objectContaining({
          errorValue: 'Some unknown error',
        }),
      );
    });
  });

  describe('logging', () => {
    it('should log entry with event and context', async () => {
      // Arrange
      const event = { action: 'task_created' };
      mockSendNotification.mockResolvedValue(undefined);

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[SendNotificationHandler] > handler', {
        event,
        context: mockContext,
      });
    });
  });
});
