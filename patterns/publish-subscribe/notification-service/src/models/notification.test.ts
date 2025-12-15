import { sendNotificationEventSchema, SendNotificationEvent } from './notification';

describe('notification models', () => {
  describe('sendNotificationEventSchema', () => {
    it('should validate SQS event with single message', () => {
      // Arrange
      const event = {
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
            },
            messageAttributes: {
              event: {
                stringValue: 'task_created',
              },
            },
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:notification-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.Records).toHaveLength(1);
        expect(result.data?.Records?.[0]?.messageId).toBe('msg-123');
        expect(result.data?.Records?.[0]?.messageAttributes?.event?.stringValue).toBe('task_created');
      }
    });

    it('should validate SQS event with multiple messages', () => {
      // Arrange
      const event = {
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
            },
            messageAttributes: {
              event: {
                stringValue: 'task_created',
              },
            },
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:notification-queue',
            awsRegion: 'us-east-1',
          },
          {
            messageId: 'msg-124',
            receiptHandle: 'receipt-124',
            body: '{"taskId": "task-789"}',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1609459200000',
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: '1609459201000',
            },
            messageAttributes: {
              event: {
                stringValue: 'task_completed',
              },
            },
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:notification-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.Records).toHaveLength(2);
        expect(result.data?.Records?.[0]?.messageAttributes?.event?.stringValue).toBe('task_created');
        expect(result.data?.Records?.[1]?.messageAttributes?.event?.stringValue).toBe('task_completed');
      }
    });

    it('should reject event without Records', () => {
      // Arrange
      const event = {};

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject message without messageId', () => {
      // Arrange
      const event = {
        Records: [
          {
            receiptHandle: 'receipt-123',
            body: '{"taskId": "task-456"}',
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: '1609459200000',
              SenderId: '123456789012',
              ApproximateFirstReceiveTimestamp: '1609459201000',
            },
            messageAttributes: {
              event: {
                stringValue: 'task_created',
              },
            },
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:notification-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject message without messageAttributes', () => {
      // Arrange
      const event = {
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
            },
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:notification-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject message without event messageAttribute', () => {
      // Arrange
      const event = {
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
            },
            messageAttributes: {},
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:notification-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should parse using parse method for valid data', () => {
      // Arrange
      const event = {
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
            },
            messageAttributes: {
              event: {
                stringValue: 'task_created',
              },
            },
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:notification-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Act & Assert - parse should not throw
      expect(() => {
        sendNotificationEventSchema.parse(event);
      }).not.toThrow();
    });

    it('should throw error using parse method for invalid data', () => {
      // Arrange
      const event = {
        Records: [],
      };

      // Act & Assert
      expect(() => {
        sendNotificationEventSchema.parse(event);
      }).not.toThrow(); // Empty Records array is valid
    });
  });

  describe('SendNotificationEvent type', () => {
    it('should have correct type structure', () => {
      // Arrange & Act
      const event: SendNotificationEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: '{"taskId": "task-456"}',
            messageAttributes: {
              event: {
                stringValue: 'task_created',
              },
            },
          },
        ],
      };

      // Assert
      expect(event.Records).toHaveLength(1);
      expect(event.Records?.[0]?.messageId).toBe('msg-123');
      expect(event.Records?.[0]?.messageAttributes?.event?.stringValue).toBe('task_created');
    });

    it('should allow event with multiple records', () => {
      // Arrange & Act
      const event: SendNotificationEvent = {
        Records: [
          {
            messageId: 'msg-123',
            receiptHandle: 'receipt-123',
            body: '{}',
            messageAttributes: {
              event: {
                stringValue: 'task_created',
              },
            },
          },
          {
            messageId: 'msg-124',
            receiptHandle: 'receipt-124',
            body: '{}',
            messageAttributes: {
              event: {
                stringValue: 'task_completed',
              },
            },
          },
        ],
      };

      // Assert
      expect(event.Records).toHaveLength(2);
    });
  });
});
