import { Context, SQSEvent } from 'aws-lambda';

// Mock dependencies
const mockCreateTask = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../services/task-service', () => ({
  createTask: mockCreateTask,
}));

jest.mock('../utils/logger', () => ({
  logger: {
    debug: mockLoggerDebug,
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
  withRequestTracking: jest.fn(),
}));

describe('create-task-subscriber', () => {
  let handler: typeof import('./create-task-subscriber').handler;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Import the module after mocks are set up
    const subscriberModule = require('./create-task-subscriber');
    handler = subscriberModule.handler;
  });

  const createMockContext = (): Context =>
    ({
      functionName: 'test-function',
      functionVersion: '$LATEST',
      requestId: 'test-request-id',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '512',
      awsRequestId: 'test-aws-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2026/01/02/[$LATEST]test-stream',
      getRemainingTimeInMillis: () => 30000,
      callbackWaitsForEmptyEventLoop: true,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    }) as Context;

  describe('handler', () => {
    it('should successfully process valid SQS messages and create tasks', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({ title: 'Task 1', isComplete: false }),
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'msg-2',
            receiptHandle: 'receipt-2',
            body: JSON.stringify({ title: 'Task 2', detail: 'Details for task 2', isComplete: true }),
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };
      const context = createMockContext();
      mockCreateTask.mockResolvedValueOnce({ id: 'task-1', title: 'Task 1', isComplete: false });
      mockCreateTask.mockResolvedValueOnce({ id: 'task-2', title: 'Task 2', isComplete: true });

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({ batchItemFailures: [] });
      expect(mockCreateTask).toHaveBeenCalledTimes(2);
      expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Task 1', isComplete: false });
      expect(mockCreateTask).toHaveBeenCalledWith({ title: 'Task 2', detail: 'Details for task 2', isComplete: true });
    });

    it('should return failed message IDs when task creation fails', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-success',
            receiptHandle: 'receipt-success',
            body: JSON.stringify({ title: 'Success Task', isComplete: false }),
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-success',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'msg-failure',
            receiptHandle: 'receipt-failure',
            body: JSON.stringify({ title: 'Failure Task', isComplete: false }),
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-failure',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };
      const context = createMockContext();
      mockCreateTask.mockResolvedValueOnce({ id: 'task-success', title: 'Success Task', isComplete: false });
      mockCreateTask.mockRejectedValueOnce(new Error('DynamoDB error'));

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: 'msg-failure' }],
      });
      expect(mockCreateTask).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid message body JSON', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-invalid-json',
            receiptHandle: 'receipt-invalid-json',
            body: 'invalid json',
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-invalid',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: 'msg-invalid-json' }],
      });
      expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it('should handle invalid CreateTaskDto schema', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-invalid-schema',
            receiptHandle: 'receipt-invalid-schema',
            body: JSON.stringify({ invalidField: 'value' }), // Missing required 'title' field
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-invalid-schema',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: 'msg-invalid-schema' }],
      });
      expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it('should return all messages as failures if event structure is invalid', async () => {
      // Arrange
      const invalidEvent = { Records: [] } as SQSEvent; // Empty records array
      const context = createMockContext();

      // Act
      const result = await handler(invalidEvent, context);

      // Assert
      expect(result).toEqual({ batchItemFailures: [] });
      expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it('should process messages in parallel using Promise.allSettled', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({ title: 'Task 1', isComplete: false }),
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'msg-2',
            receiptHandle: 'receipt-2',
            body: JSON.stringify({ title: 'Task 2', isComplete: false }),
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'msg-3',
            receiptHandle: 'receipt-3',
            body: JSON.stringify({ title: 'Task 3', isComplete: false }),
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-3',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };
      const context = createMockContext();
      mockCreateTask.mockResolvedValueOnce({ id: 'task-1', title: 'Task 1', isComplete: false });
      mockCreateTask.mockRejectedValueOnce(new Error('Task 2 failed'));
      mockCreateTask.mockResolvedValueOnce({ id: 'task-3', title: 'Task 3', isComplete: false });

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: 'msg-2' }],
      });
      expect(mockCreateTask).toHaveBeenCalledTimes(3);
    });

    it('should handle unexpected errors during processing', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({ title: 'Task 1', isComplete: false }),
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };
      const context = createMockContext();
      mockCreateTask.mockImplementation(() => {
        throw new Error('Unexpected synchronous error');
      });

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: 'msg-1' }],
      });
    });

    it('should process all messages successfully when all are valid', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({ title: 'Task 1', isComplete: false }),
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'msg-2',
            receiptHandle: 'receipt-2',
            body: JSON.stringify({ title: 'Task 2', isComplete: true }),
            attributes: {} as never,
            messageAttributes: {},
            md5OfBody: 'md5-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };
      const context = createMockContext();
      mockCreateTask.mockResolvedValueOnce({ id: 'task-1', title: 'Task 1', isComplete: false });
      mockCreateTask.mockResolvedValueOnce({ id: 'task-2', title: 'Task 2', isComplete: true });

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({ batchItemFailures: [] });
      expect(mockCreateTask).toHaveBeenCalledTimes(2);
    });
  });
});
