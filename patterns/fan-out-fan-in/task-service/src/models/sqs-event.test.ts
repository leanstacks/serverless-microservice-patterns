/**
 * @module models/sqs-event
 * @description Unit tests for SQS event validation schema.
 */

import { SqsEventSchema } from './sqs-event';

describe('sqs-event', () => {
  describe('SqsEventSchema', () => {
    it('should validate a valid SQS event with a single record', () => {
      // Arrange
      const validEvent = {
        Records: [
          {
            messageId: 'msg-123',
            body: 'Test message body',
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(validEvent);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.Records).toHaveLength(1);
        expect(result.data.Records[0]!.messageId).toBe('msg-123');
        expect(result.data.Records[0]!.body).toBe('Test message body');
      }
    });

    it('should validate a valid SQS event with multiple records', () => {
      // Arrange
      const validEvent = {
        Records: [
          {
            messageId: 'msg-1',
            body: 'Message 1',
          },
          {
            messageId: 'msg-2',
            body: 'Message 2',
          },
          {
            messageId: 'msg-3',
            body: 'Message 3',
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(validEvent);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.Records).toHaveLength(3);
        expect(result.data.Records.map((r) => r.messageId)).toEqual(['msg-1', 'msg-2', 'msg-3']);
      }
    });

    it('should validate a valid SQS event with empty string messageId', () => {
      // Arrange
      const validEvent = {
        Records: [
          {
            messageId: '',
            body: 'Test message body',
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(validEvent);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.Records[0]!.messageId).toBe('');
      }
    });

    it('should validate a valid SQS event with empty string body', () => {
      // Arrange
      const validEvent = {
        Records: [
          {
            messageId: 'msg-123',
            body: '',
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(validEvent);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.Records[0]!.body).toBe('');
      }
    });

    it('should validate a valid SQS event with complex JSON body', () => {
      // Arrange
      const complexBody = JSON.stringify({
        taskId: '123',
        action: 'process',
        data: {
          nested: true,
        },
      });

      const validEvent = {
        Records: [
          {
            messageId: 'msg-123',
            body: complexBody,
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(validEvent);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.Records[0]!.body).toBe(complexBody);
      }
    });

    it('should reject when Records is missing', () => {
      // Arrange
      const invalidEvent = {};

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when Records is null', () => {
      // Arrange
      const invalidEvent = {
        Records: null,
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when Records is undefined', () => {
      // Arrange
      const invalidEvent = {
        Records: undefined,
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when Records is an empty array', () => {
      // Arrange
      const invalidEvent = {
        Records: [],
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]!.message).toContain('At least one SQS record is required');
      }
    });

    it('should reject when Records is not an array', () => {
      // Arrange
      const invalidEvent = {
        Records: 'not-an-array',
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when a record is missing messageId', () => {
      // Arrange
      const invalidEvent = {
        Records: [
          {
            body: 'Test message body',
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when a record is missing body', () => {
      // Arrange
      const invalidEvent = {
        Records: [
          {
            messageId: 'msg-123',
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when messageId is not a string', () => {
      // Arrange
      const invalidEvent = {
        Records: [
          {
            messageId: 123,
            body: 'Test message body',
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when body is not a string', () => {
      // Arrange
      const invalidEvent = {
        Records: [
          {
            messageId: 'msg-123',
            body: 123,
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when a record has null messageId', () => {
      // Arrange
      const invalidEvent = {
        Records: [
          {
            messageId: null,
            body: 'Test message body',
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when a record has null body', () => {
      // Arrange
      const invalidEvent = {
        Records: [
          {
            messageId: 'msg-123',
            body: null,
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should strip extra properties not in schema (Zod default behavior)', () => {
      // Arrange
      const validEvent = {
        Records: [
          {
            messageId: 'msg-123',
            body: 'Test message body',
            extraField: 'should be ignored',
          },
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(validEvent);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.Records[0]).toEqual({
          messageId: 'msg-123',
          body: 'Test message body',
        });
        expect(result.data.Records[0]).not.toHaveProperty('extraField');
      }
    });

    it('should reject when Records has a malformed record object', () => {
      // Arrange
      const invalidEvent = {
        Records: [
          {
            messageId: 'msg-123',
            body: 'Test message body',
          },
          'not-an-object',
        ],
      };

      // Act
      const result = SqsEventSchema.safeParse(invalidEvent);

      // Assert
      expect(result.success).toBe(false);
    });
  });
});
