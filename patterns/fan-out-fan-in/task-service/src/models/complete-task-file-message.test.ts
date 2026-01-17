import { CompleteTaskFileMessageSchema } from './complete-task-file-message';

describe('complete-task-file-message', () => {
  describe('CompleteTaskFileMessageSchema', () => {
    it('should validate a valid complete task file message', () => {
      // Arrange
      const validMessage = {
        taskFile: {
          id: 'test-task-file-id',
        },
      };

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(validMessage);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validMessage);
      }
    });

    it('should validate a complete task file message with UUID id', () => {
      // Arrange
      const validMessage = {
        taskFile: {
          id: '550e8400-e29b-41d4-a716-446655440000',
        },
      };

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(validMessage);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskFile.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      }
    });

    it('should validate a complete task file message with numeric string id', () => {
      // Arrange
      const validMessage = {
        taskFile: {
          id: '12345',
        },
      };

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(validMessage);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskFile.id).toBe('12345');
      }
    });

    it('should reject when taskFile is missing', () => {
      // Arrange
      const invalidMessage = {};

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.path).toEqual(['taskFile']);
      }
    });

    it('should reject when taskFile is null', () => {
      // Arrange
      const invalidMessage = {
        taskFile: null,
      };

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.path).toEqual(['taskFile']);
      }
    });

    it('should reject when taskFile.id is missing', () => {
      // Arrange
      const invalidMessage = {
        taskFile: {},
      };

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.path).toEqual(['taskFile', 'id']);
      }
    });

    it('should validate when taskFile.id is empty string', () => {
      // Arrange
      const messageWithEmptyId = {
        taskFile: {
          id: '',
        },
      };

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(messageWithEmptyId);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskFile.id).toBe('');
      }
    });

    it('should reject when taskFile.id is not a string', () => {
      // Arrange
      const invalidMessage = {
        taskFile: {
          id: 12345,
        },
      };

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.path).toEqual(['taskFile', 'id']);
      }
    });

    it('should reject when taskFile.id is null', () => {
      // Arrange
      const invalidMessage = {
        taskFile: {
          id: null,
        },
      };

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(invalidMessage);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0]?.path).toEqual(['taskFile', 'id']);
      }
    });

    it('should reject when taskFile has extra properties', () => {
      // Arrange
      const messageWithExtra = {
        taskFile: {
          id: 'test-id',
          extra: 'property',
        },
      };

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(messageWithExtra);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskFile).not.toHaveProperty('extra');
        expect(result.data.taskFile.id).toBe('test-id');
      }
    });

    it('should reject when message has extra top-level properties', () => {
      // Arrange
      const messageWithExtra = {
        taskFile: {
          id: 'test-id',
        },
        extra: 'property',
      };

      // Act
      const result = CompleteTaskFileMessageSchema.safeParse(messageWithExtra);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('extra');
        expect(result.data.taskFile.id).toBe('test-id');
      }
    });
  });
});
