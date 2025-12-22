import { SQSClient } from '@aws-sdk/client-sqs';

// Mock the SQS client and logger before importing the module under test
const mockSend = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@aws-sdk/client-sqs', () => {
  const actualModule = jest.requireActual('@aws-sdk/client-sqs');
  return {
    ...actualModule,
    SQSClient: jest.fn(),
  };
});

jest.mock('./logger.js', () => ({
  logger: {
    debug: mockLoggerDebug,
    info: jest.fn(),
    warn: jest.fn(),
    error: mockLoggerError,
  },
}));

jest.mock('./config.js', () => ({
  config: {
    TASKS_TABLE: 'test-tasks-table',
    NOTIFICATION_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-notification-queue',
    AWS_REGION: 'us-east-1',
    LOGGING_ENABLED: true,
    LOGGING_LEVEL: 'debug',
    LOGGING_FORMAT: 'json',
    CORS_ALLOW_ORIGIN: '*',
  },
}));

describe('sqs-client', () => {
  let sendMessage: typeof import('./sqs-client').sendMessage;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SQSClient constructor
    (SQSClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    // Import after mocks are set up
    const sqsClient = require('./sqs-client');
    sendMessage = sqsClient.sendMessage;
  });

  describe('sendMessage', () => {
    it('should send a message to SQS queue successfully', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const message = { action: 'task_created', payload: { taskId: '123' } };

      mockSend.mockResolvedValue({
        MessageId: 'message-id-123',
      });

      // Act
      const result = await sendMessage(queueUrl, message);

      // Assert
      expect(result).toBe('message-id-123');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerDebug).toHaveBeenCalledWith('[SqsClient] > sendMessage', { queueUrl });
    });

    it('should convert message object to JSON string', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const message = { action: 'task_updated', payload: { taskId: '456' } };

      mockSend.mockResolvedValue({
        MessageId: 'message-id-456',
      });

      // Act
      await sendMessage(queueUrl, message);

      // Assert
      const sendCommand = mockSend.mock.calls[0][0];
      expect(sendCommand.input.MessageBody).toBe(JSON.stringify(message));
    });

    it('should include message attributes when provided', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const message = { action: 'task_created' };
      const attributes = {
        event: {
          DataType: 'String' as const,
          StringValue: 'task_created',
        },
      };

      mockSend.mockResolvedValue({
        MessageId: 'message-id-789',
      });

      // Act
      await sendMessage(queueUrl, message, attributes);

      // Assert
      const sendCommand = mockSend.mock.calls[0][0];
      expect(sendCommand.input.MessageAttributes).toEqual(attributes);
    });

    it('should return empty string when MessageId is undefined', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const message = { action: 'test' };

      mockSend.mockResolvedValue({
        MessageId: undefined,
      });

      // Act
      const result = await sendMessage(queueUrl, message);

      // Assert
      expect(result).toBe('');
    });

    it('should log send success with message details', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const message = { action: 'task_deleted' };

      mockSend.mockResolvedValue({
        MessageId: 'msg-delete-123',
      });

      // Act
      await sendMessage(queueUrl, message);

      // Assert
      expect(mockLoggerDebug).toHaveBeenCalledWith('[SqsClient] < sendMessage - successfully sent message', {
        queueUrl,
        messageId: 'msg-delete-123',
      });
    });

    it('should handle SQS send errors and rethrow them', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const message = { action: 'test' };
      const error = new Error('SQS service error');

      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(sendMessage(queueUrl, message)).rejects.toThrow('SQS service error');
      expect(mockLoggerError).toHaveBeenCalledWith('[SqsClient] < sendMessage - failed to send message to SQS', error, {
        queueUrl,
      });
    });

    it('should not include attributes parameter when not provided', async () => {
      // Arrange
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const message = { action: 'simple_message' };

      mockSend.mockResolvedValue({
        MessageId: 'msg-simple-123',
      });

      // Act
      await sendMessage(queueUrl, message);

      // Assert
      const sendCommand = mockSend.mock.calls[0][0];
      expect(sendCommand.input.MessageAttributes).toBeUndefined();
    });
  });
});
