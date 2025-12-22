import { SNSClient } from '@aws-sdk/client-sns';

// Mock the SNS client and logger before importing the module under test
const mockSend = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@aws-sdk/client-sns', () => {
  const actualModule = jest.requireActual('@aws-sdk/client-sns');
  return {
    ...actualModule,
    SNSClient: jest.fn(),
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
    TASK_TOPIC_ARN: 'arn:aws:sns:us-east-1:123456789012:test-task-topic',
    AWS_REGION: 'us-east-1',
    LOGGING_ENABLED: true,
    LOGGING_LEVEL: 'debug',
    LOGGING_FORMAT: 'json',
    CORS_ALLOW_ORIGIN: '*',
  },
}));

describe('sns-client', () => {
  let publishToTopic: typeof import('./sns-client').publishToTopic;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SNSClient constructor
    (SNSClient as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));

    // Import after mocks are set up
    const snsClient = require('./sns-client');
    publishToTopic = snsClient.publishToTopic;
  });

  describe('publishToTopic', () => {
    it('should publish a message to SNS topic successfully', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = { action: 'task_created', payload: { taskId: '123' } };

      mockSend.mockResolvedValue({
        MessageId: 'message-id-123',
      });

      // Act
      const result = await publishToTopic(topicArn, message);

      // Assert
      expect(result).toBe('message-id-123');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerDebug).toHaveBeenCalledWith('[SnsClient] > publishToTopic', { topicArn });
    });

    it('should convert message object to JSON string', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = { action: 'task_updated', payload: { taskId: '456' } };

      mockSend.mockResolvedValue({
        MessageId: 'message-id-456',
      });

      // Act
      await publishToTopic(topicArn, message);

      // Assert
      const publishCommand = mockSend.mock.calls[0][0];
      expect(publishCommand.input.Message).toBe(JSON.stringify(message));
    });

    it('should include message attributes when provided', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = { action: 'task_created' };
      const attributes = {
        eventType: {
          DataType: 'String' as const,
          StringValue: 'task_created',
        },
      };

      mockSend.mockResolvedValue({
        MessageId: 'message-id-789',
      });

      // Act
      await publishToTopic(topicArn, message, attributes);

      // Assert
      const publishCommand = mockSend.mock.calls[0][0];
      expect(publishCommand.input.MessageAttributes).toEqual(attributes);
    });

    it('should return empty string when MessageId is undefined', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = { action: 'test' };

      mockSend.mockResolvedValue({
        MessageId: undefined,
      });

      // Act
      const result = await publishToTopic(topicArn, message);

      // Assert
      expect(result).toBe('');
    });

    it('should log publish success with message details', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = { action: 'task_deleted' };

      mockSend.mockResolvedValue({
        MessageId: 'msg-delete-123',
      });

      // Act
      await publishToTopic(topicArn, message);

      // Assert
      expect(mockLoggerDebug).toHaveBeenCalledWith('[SnsClient] < publishToTopic - successfully published message', {
        topicArn,
        messageId: 'msg-delete-123',
      });
    });

    it('should handle SNS publish errors and rethrow them', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = { action: 'test' };
      const mockError = new Error('SNS publish failed');

      mockSend.mockRejectedValue(mockError);

      // Act & Assert
      await expect(publishToTopic(topicArn, message)).rejects.toThrow('SNS publish failed');
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[SnsClient] < publishToTopic - failed to publish message to SNS',
        mockError,
        {
          topicArn,
        },
      );
    });

    it('should handle complex message payloads', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = {
        action: 'task_created',
        payload: {
          task: {
            id: 'task-123',
            title: 'New Task',
            detail: 'Task details',
            isComplete: false,
            createdAt: '2025-12-01T10:00:00.000Z',
            updatedAt: '2025-12-01T10:00:00.000Z',
          },
        },
        timestamp: '2025-12-01T10:00:00.000Z',
      };

      mockSend.mockResolvedValue({
        MessageId: 'complex-msg-id',
      });

      // Act
      const result = await publishToTopic(topicArn, message);

      // Assert
      expect(result).toBe('complex-msg-id');
      const publishCommand = mockSend.mock.calls[0][0];
      const publishedMessage = JSON.parse(publishCommand.input.Message);
      expect(publishedMessage.action).toBe('task_created');
      expect(publishedMessage.payload.task.title).toBe('New Task');
    });

    it('should handle messages with empty objects', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = {};

      mockSend.mockResolvedValue({
        MessageId: 'empty-msg-id',
      });

      // Act
      const result = await publishToTopic(topicArn, message);

      // Assert
      expect(result).toBe('empty-msg-id');
      const publishCommand = mockSend.mock.calls[0][0];
      expect(publishCommand.input.Message).toBe('{}');
    });

    it('should not include message attributes when not provided', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = { action: 'test' };

      mockSend.mockResolvedValue({
        MessageId: 'msg-no-attrs',
      });

      // Act
      await publishToTopic(topicArn, message);

      // Assert
      const publishCommand = mockSend.mock.calls[0][0];
      expect(publishCommand.input.MessageAttributes).toBeUndefined();
    });

    it('should use correct topic ARN in publish call', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-west-2:987654321098:custom-topic';
      const message = { action: 'test' };

      mockSend.mockResolvedValue({
        MessageId: 'custom-topic-msg',
      });

      // Act
      await publishToTopic(topicArn, message);

      // Assert
      const publishCommand = mockSend.mock.calls[0][0];
      expect(publishCommand.input.TopicArn).toBe(topicArn);
    });
  });

  describe('MessageAttributes interface', () => {
    it('should allow String type attributes', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = { action: 'test' };
      const attributes = {
        eventType: {
          DataType: 'String' as const,
          StringValue: 'task_event',
        },
      };

      mockSend.mockResolvedValue({ MessageId: 'test-msg' });

      // Act
      const result = await publishToTopic(topicArn, message, attributes);

      // Assert
      expect(result).toBe('test-msg');
      const publishCommand = mockSend.mock.calls[0][0];
      expect(publishCommand.input.MessageAttributes.eventType.DataType).toBe('String');
    });

    it('should allow Number type attributes', async () => {
      // Arrange
      const topicArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
      const message = { action: 'test' };
      const attributes = {
        priority: {
          DataType: 'Number' as const,
          StringValue: '1',
        },
      };

      mockSend.mockResolvedValue({ MessageId: 'test-msg' });

      // Act
      const result = await publishToTopic(topicArn, message, attributes);

      // Assert
      expect(result).toBe('test-msg');
    });
  });
});
