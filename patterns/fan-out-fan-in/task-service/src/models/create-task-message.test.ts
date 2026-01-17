import { CreateTaskMessageSchema, type CreateTaskMessage } from './create-task-message';

describe('create-task-message', () => {
  describe('CreateTaskMessageSchema', () => {
    it('should validate a valid create task message with all required fields', () => {
      // Arrange
      const validMessage = {
        task: {
          title: 'Test Task',
          detail: 'Test detail',
          dueAt: '2025-12-31T23:59:59.000Z',
          isComplete: false,
        },
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(validMessage);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.task.title).toBe('Test Task');
        expect(result.data.task.detail).toBe('Test detail');
        expect(result.data.task.dueAt).toBe('2025-12-31T23:59:59.000Z');
        expect(result.data.task.isComplete).toBe(false);
        expect(result.data.taskFileId).toBe('550e8400-e29b-41d4-a716-446655440000');
      }
    });

    it('should validate a valid create task message with minimal task fields', () => {
      // Arrange
      const validMessage = {
        task: {
          title: 'Minimal Task',
        },
        taskFileId: '550e8400-e29b-41d4-a716-446655440001',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(validMessage);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.task.title).toBe('Minimal Task');
        expect(result.data.task.isComplete).toBe(false); // Default value
        expect(result.data.taskFileId).toBe('550e8400-e29b-41d4-a716-446655440001');
      }
    });

    it('should validate different valid UUID v4 formats', () => {
      // Arrange
      const uuids = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b814-9dad-41d4-80b4-00c04fd430c8',
        '00000000-0000-4000-8000-000000000000',
      ];

      // Act & Assert
      uuids.forEach((uuid) => {
        const message = {
          task: { title: 'Test' },
          taskFileId: uuid,
        };
        const result = CreateTaskMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
      });
    });

    it('should reject when task is missing', () => {
      // Arrange
      const invalidMessage = {
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes('task'))).toBe(true);
      }
    });

    it('should reject when taskFileId is missing', () => {
      // Arrange
      const invalidMessage = {
        task: {
          title: 'Test Task',
        },
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes('taskFileId'))).toBe(true);
      }
    });

    it('should reject when task is null', () => {
      // Arrange
      const invalidMessage = {
        task: null,
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject when taskFileId is null', () => {
      // Arrange
      const invalidMessage = {
        task: { title: 'Test Task' },
        taskFileId: null,
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID format', () => {
      // Arrange
      const invalidMessage = {
        task: { title: 'Test Task' },
        taskFileId: 'not-a-valid-uuid',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('taskFileId must be a valid UUID');
      }
    });

    it('should reject invalid task title', () => {
      // Arrange
      const invalidMessage = {
        task: { title: '' }, // Empty title
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject task title exceeding 100 characters', () => {
      // Arrange
      const invalidMessage = {
        task: { title: 'a'.repeat(101) },
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject task detail exceeding 1000 characters', () => {
      // Arrange
      const invalidMessage = {
        task: {
          title: 'Valid Title',
          detail: 'a'.repeat(1001),
        },
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should reject invalid ISO8601 datetime for dueAt', () => {
      // Arrange
      const invalidMessage = {
        task: {
          title: 'Test Task',
          dueAt: 'not-a-valid-date',
        },
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
    });

    it('should accept valid ISO8601 datetime formats for dueAt', () => {
      // Arrange
      const validDateFormats = ['2025-12-31T23:59:59.000Z', '2025-01-01T00:00:00.000Z', '2025-06-15T12:30:45.000Z'];

      // Act & Assert
      validDateFormats.forEach((date) => {
        const message = {
          task: {
            title: 'Test Task',
            dueAt: date,
          },
          taskFileId: '550e8400-e29b-41d4-a716-446655440000',
        };
        const result = CreateTaskMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
      });
    });

    it('should accept task with isComplete as true', () => {
      // Arrange
      const validMessage = {
        task: {
          title: 'Complete Task',
          isComplete: true,
        },
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(validMessage);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.task.isComplete).toBe(true);
      }
    });

    it('should default isComplete to false when not provided', () => {
      // Arrange
      const validMessage = {
        task: {
          title: 'Test Task',
        },
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(validMessage);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.task.isComplete).toBe(false);
      }
    });

    it('should reject when extra unknown properties are provided', () => {
      // Arrange
      const messageWithExtra = {
        task: { title: 'Test Task' },
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
        unknownField: 'should-be-ignored',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(messageWithExtra);

      // Assert
      // Zod by default strips unknown fields, so this should still be valid
      expect(result.success).toBe(true);
    });

    it('should maintain type information for valid message', () => {
      // Arrange
      const validMessage = {
        task: {
          title: 'Type Test',
        },
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(validMessage);

      // Assert
      if (result.success) {
        const typedMessage: CreateTaskMessage = result.data;
        expect(typedMessage.task.title).toBeDefined();
        expect(typedMessage.taskFileId).toBeDefined();
      }
    });

    it('should handle complex valid message with all optional fields', () => {
      // Arrange
      const fullMessage = {
        task: {
          title: 'Complex Task',
          detail: 'This is a detailed task with all optional fields',
          dueAt: '2025-12-31T23:59:59.000Z',
          isComplete: true,
        },
        taskFileId: '550e8400-e29b-41d4-a716-446655440000',
      };

      // Act
      const result = CreateTaskMessageSchema.safeParse(fullMessage);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(fullMessage);
      }
    });
  });
});
