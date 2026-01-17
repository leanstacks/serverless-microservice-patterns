import { Context, SQSEvent } from 'aws-lambda';

// Mock dependencies BEFORE importing handler
const mockUpdateTaskFileStatus = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerDebug = jest.fn();

jest.mock('../utils/config', () => ({
  config: {
    AWS_REGION: 'us-east-1',
    LOGGING_ENABLED: true,
    LOGGING_LEVEL: 'info',
  },
}));

jest.mock('../services/task-file-service', () => ({
  updateTaskFileStatus: mockUpdateTaskFileStatus,
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: mockLoggerDebug,
  },
  withRequestTracking: jest.fn(),
}));

describe('complete-task-file-subscriber handler', () => {
  let handler: typeof import('./complete-task-file-subscriber').handler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import handler after mocks are set up
    handler = require('./complete-task-file-subscriber').handler;
  });

  const createMockSQSEvent = (overrides?: Partial<SQSEvent>): SQSEvent => {
    return {
      Records: [
        {
          messageId: 'test-message-id-1',
          receiptHandle: 'test-receipt-handle-1',
          body: JSON.stringify({
            taskFile: {
              id: 'test-task-file-id-1',
              fileName: 'test-file.csv',
              processingStatus: 'COMPLETED',
              recordCount: 100,
              processedCount: 100,
              unprocessedCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: Date.now().toString(),
            SenderId: '123456789012',
            ApproximateFirstReceiveTimestamp: Date.now().toString(),
          },
          messageAttributes: {},
          md5OfBody: 'test-md5',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
          awsRegion: 'us-east-1',
        },
      ],
      ...overrides,
    };
  };

  const createMockContext = (): Context => {
    return {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '256',
      awsRequestId: 'test-aws-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2024/01/01/[$LATEST]test',
      getRemainingTimeInMillis: jest.fn(() => 30000),
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    };
  };

  describe('handler', () => {
    it('should successfully process a single message', async () => {
      // Arrange
      mockUpdateTaskFileStatus.mockResolvedValue({
        id: 'test-task-file-id-1',
        processingStatus: 'COMPLETED',
      });
      const event = createMockSQSEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(mockUpdateTaskFileStatus).toHaveBeenCalledTimes(1);
      expect(mockUpdateTaskFileStatus).toHaveBeenCalledWith('test-task-file-id-1', 'COMPLETED');
      expect(result).toEqual({ batchItemFailures: [] });
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          totalRecords: 1,
          successCount: 1,
          failureCount: 0,
        }),
        expect.any(String),
      );
    });

    it('should process multiple messages in parallel', async () => {
      // Arrange
      mockUpdateTaskFileStatus.mockResolvedValue({
        id: 'test-task-file-id',
        processingStatus: 'COMPLETED',
      });
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id-1',
            receiptHandle: 'test-receipt-handle-1',
            body: JSON.stringify({
              taskFile: {
                id: 'test-task-file-id-1',
              },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'test-message-id-2',
            receiptHandle: 'test-receipt-handle-2',
            body: JSON.stringify({
              taskFile: {
                id: 'test-task-file-id-2',
              },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
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
      expect(mockUpdateTaskFileStatus).toHaveBeenCalledTimes(2);
      expect(mockUpdateTaskFileStatus).toHaveBeenCalledWith('test-task-file-id-1', 'COMPLETED');
      expect(mockUpdateTaskFileStatus).toHaveBeenCalledWith('test-task-file-id-2', 'COMPLETED');
      expect(result).toEqual({ batchItemFailures: [] });
    });

    it('should handle parsing errors and return as batch item failure', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id-1',
            receiptHandle: 'test-receipt-handle-1',
            body: 'invalid-json',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
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
      expect(result).toEqual({ batchItemFailures: [{ itemIdentifier: 'test-message-id-1' }] });
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'test-message-id-1',
        }),
        expect.any(String),
      );
    });

    it('should handle validation errors and return as batch item failure', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id-1',
            receiptHandle: 'test-receipt-handle-1',
            body: JSON.stringify({
              taskFile: {
                // Missing 'id' property
              },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
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
      expect(result).toEqual({ batchItemFailures: [{ itemIdentifier: 'test-message-id-1' }] });
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'test-message-id-1',
        }),
        expect.any(String),
      );
    });

    it('should handle service errors and return as batch item failure', async () => {
      // Arrange
      mockUpdateTaskFileStatus.mockRejectedValue(new Error('DynamoDB error'));
      const event = createMockSQSEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({ batchItemFailures: [{ itemIdentifier: 'test-message-id-1' }] });
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'test-message-id-1',
        }),
        expect.any(String),
      );
    });

    it('should handle partial failures in batch', async () => {
      // Arrange
      // First call succeeds, second call fails
      mockUpdateTaskFileStatus
        .mockResolvedValueOnce({
          id: 'test-task-file-id-1',
          processingStatus: 'COMPLETED',
        })
        .mockRejectedValueOnce(new Error('DynamoDB error'));
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id-1',
            receiptHandle: 'test-receipt-handle-1',
            body: JSON.stringify({
              taskFile: {
                id: 'test-task-file-id-1',
              },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'test-message-id-2',
            receiptHandle: 'test-receipt-handle-2',
            body: JSON.stringify({
              taskFile: {
                id: 'test-task-file-id-2',
              },
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageAttributes: {},
            md5OfBody: 'test-md5',
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
      expect(result).toEqual({ batchItemFailures: [{ itemIdentifier: 'test-message-id-2' }] });
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.objectContaining({
          totalRecords: 2,
          successCount: 1,
          failureCount: 1,
        }),
        expect.any(String),
      );
    });

    it('should return all messages as failures if SQS event structure is invalid', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [],
      };
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({ batchItemFailures: [] });
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Object),
        }),
        expect.any(String),
      );
    });

    it('should return all messages as failures on unexpected error', async () => {
      // Arrange
      const event = createMockSQSEvent();
      const context = createMockContext();
      // Make updateTaskFileStatus throw an error during the first check
      mockUpdateTaskFileStatus.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result).toEqual({ batchItemFailures: [{ itemIdentifier: 'test-message-id-1' }] });
    });
  });
});
