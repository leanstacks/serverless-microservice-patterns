import { Context, SQSEvent } from 'aws-lambda';

jest.mock('../../services/task-service', () => ({
  createTask: jest.fn(),
}));

jest.mock('../../services/task-file-service', () => ({
  incrementTaskFileProcessedCount: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  withRequestTracking: jest.fn(),
}));

// Mock dependencies - reference after jest.mock calls for proper hoisting
const mockCreateTask = jest.requireMock('../../services/task-service').createTask;
const mockIncrementTaskFileProcessedCount = jest.requireMock(
  '../../services/task-file-service',
).incrementTaskFileProcessedCount;

// Set up default implementation
mockIncrementTaskFileProcessedCount.mockImplementation(async () => ({
  id: 'default-id',
  fileName: 'default.csv',
  processingStatus: 'IN_PROGRESS',
  recordCount: 1,
  processedCount: 1,
  unprocessedCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

// Import the module once after all mocks are set up
const handler = require('./create-task-subscriber').handler;

describe('create-task-subscriber', () => {
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
    beforeEach(() => {
      jest.clearAllMocks();
      mockCreateTask.mockClear();
      mockIncrementTaskFileProcessedCount.mockClear();
      mockIncrementTaskFileProcessedCount.mockImplementation(async () => ({
        id: 'default-id',
        fileName: 'default.csv',
        processingStatus: 'IN_PROGRESS',
        recordCount: 1,
        processedCount: 1,
        unprocessedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('should successfully process valid SQS messages and create tasks', async () => {
      // Arrange
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({ task: { title: 'Task 1', isComplete: false }, taskFileId }),
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
            body: JSON.stringify({
              task: { title: 'Task 2', detail: 'Details for task 2', isComplete: true },
              taskFileId,
            }),
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
      expect(mockIncrementTaskFileProcessedCount).toHaveBeenCalledTimes(2);
      expect(mockIncrementTaskFileProcessedCount).toHaveBeenCalledWith(taskFileId);
    });

    it('should return failed message IDs when task creation fails', async () => {
      // Arrange
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-success',
            receiptHandle: 'receipt-success',
            body: JSON.stringify({ task: { title: 'Success Task', isComplete: false }, taskFileId }),
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
            body: JSON.stringify({ task: { title: 'Failure Task', isComplete: false }, taskFileId }),
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
      mockIncrementTaskFileProcessedCount.mockResolvedValueOnce({
        id: 'file-id',
        fileName: 'file.csv',
        processingStatus: 'IN_PROGRESS',
        recordCount: 2,
        processedCount: 1,
        unprocessedCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: 'msg-failure' }],
      });
      expect(mockCreateTask).toHaveBeenCalledTimes(2);
      expect(mockIncrementTaskFileProcessedCount).toHaveBeenCalledTimes(1);
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
      const taskFileId = '123e4567-e89b-12d3-a456-426614174000';
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-invalid-schema',
            receiptHandle: 'receipt-invalid-schema',
            body: JSON.stringify({ task: { invalidField: 'value' }, taskFileId }), // Missing required 'title' field in task
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
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({ task: { title: 'Task 1', isComplete: false }, taskFileId }),
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
            body: JSON.stringify({ task: { title: 'Task 2', isComplete: false }, taskFileId }),
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
            body: JSON.stringify({ task: { title: 'Task 3', isComplete: false }, taskFileId }),
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
      mockIncrementTaskFileProcessedCount.mockResolvedValueOnce({
        id: 'file-id',
        fileName: 'file.csv',
        processingStatus: 'IN_PROGRESS',
        recordCount: 3,
        processedCount: 1,
        unprocessedCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      mockIncrementTaskFileProcessedCount.mockResolvedValueOnce({
        id: 'file-id',
        fileName: 'file.csv',
        processingStatus: 'IN_PROGRESS',
        recordCount: 3,
        processedCount: 2,
        unprocessedCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({
        batchItemFailures: [{ itemIdentifier: 'msg-2' }],
      });
      expect(mockCreateTask).toHaveBeenCalledTimes(3);
      expect(mockIncrementTaskFileProcessedCount).toHaveBeenCalledTimes(2);
    });

    it('should handle unexpected errors during processing', async () => {
      // Arrange
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({ task: { title: 'Task 1', isComplete: false }, taskFileId }),
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
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'msg-1',
            receiptHandle: 'receipt-1',
            body: JSON.stringify({ task: { title: 'Task 1', isComplete: false }, taskFileId }),
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
            body: JSON.stringify({ task: { title: 'Task 2', isComplete: true }, taskFileId }),
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
      mockIncrementTaskFileProcessedCount.mockResolvedValueOnce({
        id: 'file-id',
        fileName: 'file.csv',
        processingStatus: 'IN_PROGRESS',
        recordCount: 2,
        processedCount: 1,
        unprocessedCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      mockIncrementTaskFileProcessedCount.mockResolvedValueOnce({
        id: 'file-id',
        fileName: 'file.csv',
        processingStatus: 'IN_PROGRESS',
        recordCount: 2,
        processedCount: 2,
        unprocessedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({ batchItemFailures: [] });
      expect(mockCreateTask).toHaveBeenCalledTimes(2);
      expect(mockIncrementTaskFileProcessedCount).toHaveBeenCalledTimes(2);
    });
  });
});
