import { Context, SQSEvent } from 'aws-lambda';

// Mock dependencies BEFORE importing handler
const mockGetObjectContent = jest.fn();
const mockParseCsvAndCreateTasks = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../utils/config', () => ({
  config: {
    AWS_REGION: 'us-east-1',
    LOGGING_ENABLED: true,
    LOGGING_LEVEL: 'info',
  },
}));

jest.mock('../utils/s3-client', () => ({
  getObjectContent: mockGetObjectContent,
}));

jest.mock('../services/task-file-service', () => ({
  parseCsvAndCreateTasks: mockParseCsvAndCreateTasks,
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: jest.fn(),
  },
  withRequestTracking: jest.fn(),
}));

describe('upload-task-subscriber handler', () => {
  let handler: typeof import('./upload-task-subscriber').handler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import handler after mocks are set up
    handler = require('./upload-task-subscriber').handler;
  });

  const createMockSQSEvent = (overrides?: Partial<SQSEvent>): SQSEvent => {
    return {
      Records: [
        {
          messageId: 'test-message-id-1',
          receiptHandle: 'test-receipt-handle-1',
          body: JSON.stringify({
            Records: [
              {
                s3: {
                  bucket: {
                    name: 'test-bucket',
                  },
                  object: {
                    key: 'uploads/test-file.csv',
                  },
                },
              },
            ],
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
    it('should successfully process S3 event from SQS message', async () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,Detail 1,2026-12-31T23:59:59Z,false
Task 2,Detail 2,2026-01-15T12:00:00Z,true`;

      mockGetObjectContent.mockResolvedValue(csvContent);
      mockParseCsvAndCreateTasks.mockResolvedValue(undefined);

      const event = createMockSQSEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.batchItemFailures).toHaveLength(0);
      expect(mockGetObjectContent).toHaveBeenCalledWith('test-bucket', 'uploads/test-file.csv');
      expect(mockParseCsvAndCreateTasks).toHaveBeenCalledWith(csvContent, 'uploads/test-file.csv');
    });

    it('should handle multiple SQS messages', async () => {
      // Arrange
      const csvContent = 'title,detail\nTask 1,Detail 1';

      mockGetObjectContent.mockResolvedValue(csvContent);
      mockParseCsvAndCreateTasks.mockResolvedValue(undefined);

      const event = createMockSQSEvent({
        Records: [
          {
            messageId: 'test-message-id-1',
            receiptHandle: 'test-receipt-handle-1',
            body: JSON.stringify({
              Records: [
                {
                  s3: {
                    bucket: { name: 'test-bucket' },
                    object: { key: 'uploads/file1.csv' },
                  },
                },
              ],
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'test-message-id-2',
            receiptHandle: 'test-receipt-handle-2',
            body: JSON.stringify({
              Records: [
                {
                  s3: {
                    bucket: { name: 'test-bucket' },
                    object: { key: 'uploads/file2.csv' },
                  },
                },
              ],
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.batchItemFailures).toHaveLength(0);
      expect(mockGetObjectContent).toHaveBeenCalledTimes(2);
      expect(mockParseCsvAndCreateTasks).toHaveBeenCalledTimes(2);
    });

    it('should return failed message ID when S3 retrieval fails', async () => {
      // Arrange
      mockGetObjectContent.mockRejectedValue(new Error('S3 access denied'));

      const event = createMockSQSEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures?.[0]?.itemIdentifier).toBe('test-message-id-1');
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should return failed message ID when CSV parsing fails', async () => {
      // Arrange
      mockGetObjectContent.mockResolvedValue('invalid,csv\ndata');
      mockParseCsvAndCreateTasks.mockRejectedValue(new Error('CSV validation failed'));

      const event = createMockSQSEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures?.[0]?.itemIdentifier).toBe('test-message-id-1');
    });

    it('should handle partial failures with multiple messages', async () => {
      // Arrange
      mockGetObjectContent.mockImplementation((bucket: string, key: string) => {
        if (key.includes('file1')) {
          return Promise.resolve('title,detail\nTask 1,Detail 1');
        }
        return Promise.reject(new Error('S3 error'));
      });

      mockParseCsvAndCreateTasks.mockResolvedValue(undefined);

      const event = createMockSQSEvent({
        Records: [
          {
            messageId: 'test-message-id-1',
            receiptHandle: 'test-receipt-handle-1',
            body: JSON.stringify({
              Records: [
                {
                  s3: {
                    bucket: { name: 'test-bucket' },
                    object: { key: 'uploads/file1.csv' },
                  },
                },
              ],
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'test-message-id-2',
            receiptHandle: 'test-receipt-handle-2',
            body: JSON.stringify({
              Records: [
                {
                  s3: {
                    bucket: { name: 'test-bucket' },
                    object: { key: 'uploads/file2.csv' },
                  },
                },
              ],
            }),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageAttributes: {},
            md5OfBody: 'test-md5-2',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures?.[0]?.itemIdentifier).toBe('test-message-id-2');
    });

    it('should return all messages as failures when invalid SQS event structure', async () => {
      // Arrange
      const event: SQSEvent = {
        Records: [] as any, // Empty records array
      };
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.batchItemFailures).toHaveLength(0); // Empty records means no failures
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should return failed message when S3 event structure is invalid', async () => {
      // Arrange
      const event = createMockSQSEvent({
        Records: [
          {
            messageId: 'test-message-id-1',
            receiptHandle: 'test-receipt-handle-1',
            body: JSON.stringify({ Records: [] }), // Invalid S3 event structure
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
      });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.batchItemFailures).toHaveLength(1);
      expect(result.batchItemFailures?.[0]?.itemIdentifier).toBe('test-message-id-1');
    });
  });
});
