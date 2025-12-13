import { sendNotificationEventSchema, SendNotificationEvent } from './notification';

describe('notification models', () => {
  describe('sendNotificationEventSchema', () => {
    it('should validate event with required action property', () => {
      // Arrange
      const event = {
        action: 'task_created',
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ action: 'task_created' });
      }
    });

    it('should validate event with action and payload', () => {
      // Arrange
      const event = {
        action: 'task_completed',
        payload: {
          taskId: '123',
          userId: 'user-456',
          timestamp: '2023-01-01T00:00:00Z',
        },
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(event);
      }
    });

    it('should validate event with nested payload objects', () => {
      // Arrange
      const event = {
        action: 'task_deleted',
        payload: {
          taskId: '123',
          metadata: {
            source: 'api',
            region: 'us-east-1',
          },
        },
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(event);
      }
    });

    it('should reject event without action', () => {
      // Arrange
      const event = {
        payload: { taskId: '123' },
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.code).toBe('invalid_type');
      }
    });

    it('should reject event with empty action string', () => {
      // Arrange
      const event = {
        action: '',
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.code).toBe('too_small');
      }
    });

    it('should reject event with non-string action', () => {
      // Arrange
      const event = {
        action: 123,
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.code).toBe('invalid_type');
      }
    });

    it('should reject event with null action', () => {
      // Arrange
      const event = {
        action: null,
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.code).toBe('invalid_type');
      }
    });

    it('should reject event with undefined action', () => {
      // Arrange
      const event = {
        action: undefined,
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
      }
    });

    it('should allow optional payload property', () => {
      // Arrange
      const event = {
        action: 'task_created',
        payload: undefined,
      };

      // Act
      const result = sendNotificationEventSchema.safeParse(event);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        // payload should be undefined or excluded
        expect(result.data.action).toBe('task_created');
      }
    });

    it('should parse using parse method for valid data', () => {
      // Arrange
      const event = {
        action: 'task_created',
      };

      // Act & Assert - parse should not throw
      expect(() => {
        sendNotificationEventSchema.parse(event);
      }).not.toThrow();
    });

    it('should throw error using parse method for invalid data', () => {
      // Arrange
      const event = {
        action: '',
      };

      // Act & Assert
      expect(() => {
        sendNotificationEventSchema.parse(event);
      }).toThrow();
    });
  });

  describe('SendNotificationEvent type', () => {
    it('should have correct type structure', () => {
      // Arrange & Act
      const event: SendNotificationEvent = {
        action: 'task_created',
        payload: { taskId: '123' },
      };

      // Assert
      expect(event.action).toBe('task_created');
      expect(event.payload).toEqual({ taskId: '123' });
    });

    it('should allow event without payload', () => {
      // Arrange & Act
      const event: SendNotificationEvent = {
        action: 'task_completed',
      };

      // Assert
      expect(event.action).toBe('task_completed');
      expect(event.payload).toBeUndefined();
    });
  });
});
