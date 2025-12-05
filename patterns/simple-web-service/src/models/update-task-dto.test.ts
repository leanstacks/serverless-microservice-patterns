import { UpdateTaskDtoSchema } from './update-task-dto';

describe('update-task-dto', () => {
  describe('UpdateTaskDtoSchema', () => {
    it('should validate a valid update task DTO with all fields', () => {
      // Arrange
      const validDto = {
        title: 'Test Task',
        detail: 'Test detail',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: false,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(validDto);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validDto);
      }
    });

    it('should validate a valid update task DTO with only required fields', () => {
      // Arrange
      const validDto = {
        title: 'Test Task',
        isComplete: true,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(validDto);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validDto);
      }
    });

    it('should validate a valid update task DTO with detail but no dueAt', () => {
      // Arrange
      const validDto = {
        title: 'Test Task',
        detail: 'Test detail',
        isComplete: false,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(validDto);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validDto);
      }
    });

    it('should validate a valid update task DTO with dueAt but no detail', () => {
      // Arrange
      const validDto = {
        title: 'Test Task',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: true,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(validDto);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validDto);
      }
    });

    it('should reject when title is missing', () => {
      // Arrange
      const invalidDto = {
        detail: 'Test detail',
        isComplete: false,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(invalidDto);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].path).toEqual(['title']);
      }
    });

    it('should reject when title is empty string', () => {
      // Arrange
      const invalidDto = {
        title: '',
        isComplete: false,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(invalidDto);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Title is required');
      }
    });

    it('should reject when title exceeds 100 characters', () => {
      // Arrange
      const invalidDto = {
        title: 'a'.repeat(101),
        isComplete: false,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(invalidDto);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Title must not exceed 100 characters');
      }
    });

    it('should reject when detail exceeds 1000 characters', () => {
      // Arrange
      const invalidDto = {
        title: 'Test Task',
        detail: 'a'.repeat(1001),
        isComplete: false,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(invalidDto);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Detail must not exceed 1000 characters');
      }
    });

    it('should reject when dueAt is not a valid ISO8601 timestamp', () => {
      // Arrange
      const invalidDto = {
        title: 'Test Task',
        dueAt: 'not-a-date',
        isComplete: false,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(invalidDto);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Due date must be a valid ISO8601 timestamp');
      }
    });

    it('should reject when isComplete is missing', () => {
      // Arrange
      const invalidDto = {
        title: 'Test Task',
        detail: 'Test detail',
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(invalidDto);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].path).toEqual(['isComplete']);
      }
    });

    it('should reject when isComplete is not a boolean', () => {
      // Arrange
      const invalidDto = {
        title: 'Test Task',
        isComplete: 'true', // string instead of boolean
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(invalidDto);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['isComplete']);
      }
    });

    it('should allow extra fields like createdAt and updatedAt', () => {
      // Arrange
      const validDto = {
        title: 'Test Task',
        isComplete: false,
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-12-02T10:00:00.000Z',
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(validDto);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        // Validated DTO only contains the fields we defined in the schema
        expect(result.data.title).toBe('Test Task');
        expect(result.data.isComplete).toBe(false);
      }
    });

    it('should accept 100 character title', () => {
      // Arrange
      const validDto = {
        title: 'a'.repeat(100),
        isComplete: false,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(validDto);

      // Assert
      expect(result.success).toBe(true);
    });

    it('should accept 1000 character detail', () => {
      // Arrange
      const validDto = {
        title: 'Test Task',
        detail: 'a'.repeat(1000),
        isComplete: false,
      };

      // Act
      const result = UpdateTaskDtoSchema.safeParse(validDto);

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
