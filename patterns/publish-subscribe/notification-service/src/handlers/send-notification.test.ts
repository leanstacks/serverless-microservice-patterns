import { Context, SQSEvent } from 'aws-lambda';
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

  // Helper to create a valid SQS record
  const createSqsRecord = (messageId: string, eventAttribute: string) => ({
    messageId,
    receiptHandle: `receipt-${messageId}`,
    body: '{"taskId": "task-456"}',
    attributes: {
      ApproximateReceiveCount: '1',
      SentTimestamp: '1609459200000',
      SenderId: '123456789012',
      ApproximateFirstReceiveTimestamp: '1609459201000',
      md5OfBody: 'abc123',
    },
    messageAttributes: {
      event: {
        stringValue: eventAttribute,
        stringListValues: [],
        binaryListValues: [],
        dataType: 'String',
      },
    },
    eventSource: 'aws:sqs',
    eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:notification-queue',
    awsRegion: 'us-east-1',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('valid SQS event', () => {
    it('should send notification when message has valid event attribute', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [createSqsRecord('msg-123', 'task_created') as any],
      };
      mockSendNotification.mockResolvedValue(undefined);

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(mockSendNotification).toHaveBeenCalledWith('task_created');
      expect(mockLogger.info).toHaveBeenCalledWith('[SendNotificationHandler] Notification sent successfully', {
        messageId: 'msg-123',
        event: 'task_created',
      });
      expect(result.batchItemFailures).toHaveLength(0);
    });

    it('should process multiple messages in batch', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          createSqsRecord('msg-123', 'task_created') as any,
          createSqsRecord('msg-124', 'task_completed') as any,
        ],
      };
      mockSendNotification.mockResolvedValue(undefined);

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(mockSendNotification).toHaveBeenCalledWith('task_created');
      expect(mockSendNotification).toHaveBeenCalledWith('task_completed');
      expect(result.batchItemFailures).toHaveLength(0);
    });
  });

  describe('invalid SQS event', () => {
    it('should return all messages as failed when event structure is invalid', async () => {
      // Arrange
      const event = {
        Records: [
          {
            messageId: 'msg-123',
            // Missing required fields
          },
        ],
      } as unknown as SQSEvent;

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.batchItemFailures?.length).toBe(1);
      expect(result.batchItemFailures?.[0]?.itemIdentifier).toBe('msg-123');
      expect(mockSendNotification).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[SendNotificationHandler] < handler - Event validation failed',
        expect.any(Error),
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
    });

    it('should fail message when event attribute is missing', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: '{"taskId": "task-456"}',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1609459200000',
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: '1609459201000',
              md5OfBody: 'abc123',
            },
            messageAttributes: {},
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:notification-queue',
            awsRegion: 'us-east-1',
          },
        ],
      } as unknown as SQSEvent;

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.batchItemFailures?.length).toBe(1);
      expect(result.batchItemFailures?.[0]?.itemIdentifier).toBe('msg-123');
      expect(mockSendNotification).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[SendNotificationHandler] < handler - Event validation failed',
        expect.any(Error),
        expect.objectContaining({
          issues: expect.any(Array),
        }),
      );
    });

    it('should fail message when event attribute is empty string', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            ...createSqsRecord('msg-123', ''),
            messageAttributes: {
              event: {
                stringValue: '',
                stringListValues: [],
                binaryListValues: [],
                dataType: 'String',
              },
            },
          } as any,
        ],
      };

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.batchItemFailures?.length).toBe(1);
      expect(result.batchItemFailures?.[0]?.itemIdentifier).toBe('msg-123');
      expect(mockSendNotification).not.toHaveBeenCalled();
    });
  });

  describe('service error handling', () => {
    it('should fail message when notification service throws error', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [createSqsRecord('msg-123', 'task_created') as any],
      };
      const error = new Error('Service failed');
      mockSendNotification.mockRejectedValue(error);

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.batchItemFailures?.length).toBe(1);
      expect(result.batchItemFailures?.[0]?.itemIdentifier).toBe('msg-123');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[SendNotificationHandler] Failed to send notification',
        error,
        expect.objectContaining({
          messageId: 'msg-123',
        }),
      );
    });

    it('should handle partial batch failures', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          createSqsRecord('msg-123', 'task_created') as any,
          createSqsRecord('msg-124', 'task_completed') as any,
        ],
      };
      mockSendNotification.mockResolvedValueOnce(undefined); // First succeeds
      mockSendNotification.mockRejectedValueOnce(new Error('Second failed')); // Second fails

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.batchItemFailures?.length).toBe(1);
      expect(result.batchItemFailures?.[0]?.itemIdentifier).toBe('msg-124');
    });
  });

  describe('logging', () => {
    it('should log entry with event and context', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [createSqsRecord('msg-123', 'task_created') as any],
      };
      mockSendNotification.mockResolvedValue(undefined);

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[SendNotificationHandler] > handler', {
        event,
        context: mockContext,
      });
    });

    it('should log batch response with failure count', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [createSqsRecord('msg-123', 'task_created') as any],
      };
      mockSendNotification.mockResolvedValue(undefined);

      // Act
      await handler(event, mockContext);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith('[SendNotificationHandler] < handler - Returning batch response', {
        failureCount: 0,
        totalCount: 1,
      });
    });
  });
});
