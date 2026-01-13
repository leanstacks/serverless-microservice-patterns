import { CreateTaskFileDtoSchema } from './create-task-file-dto';

describe('create-task-file-dto', () => {
  describe('CreateTaskFileDtoSchema', () => {
    it('should validate a valid create task file DTO', () => {
      // Arrange
      const dto = {
        recordCount: 100,
        fileName: 'tasks.csv',
      };

      // Act
      const result = CreateTaskFileDtoSchema.parse(dto);

      // Assert
      expect(result).toEqual(dto);
    });

    it('should reject when recordCount is missing', () => {
      // Arrange
      const dto = {
        fileName: 'tasks.csv',
      };

      // Act & Assert
      expect(() => CreateTaskFileDtoSchema.parse(dto)).toThrow();
    });

    it('should reject when fileName is missing', () => {
      // Arrange
      const dto = {
        recordCount: 100,
      };

      // Act & Assert
      expect(() => CreateTaskFileDtoSchema.parse(dto)).toThrow();
    });

    it('should reject when fileName is empty', () => {
      // Arrange
      const dto = {
        recordCount: 100,
        fileName: '',
      };

      // Act & Assert
      expect(() => CreateTaskFileDtoSchema.parse(dto)).toThrow();
    });

    it('should reject when fileName exceeds 1024 characters', () => {
      // Arrange
      const dto = {
        recordCount: 100,
        fileName: 'a'.repeat(1025),
      };

      // Act & Assert
      expect(() => CreateTaskFileDtoSchema.parse(dto)).toThrow();
    });

    it('should accept fileName with exactly 1024 characters', () => {
      // Arrange
      const dto = {
        recordCount: 100,
        fileName: 'a'.repeat(1024),
      };

      // Act
      const result = CreateTaskFileDtoSchema.parse(dto);

      // Assert
      expect(result.fileName).toHaveLength(1024);
    });

    it('should reject when recordCount is negative', () => {
      // Arrange
      const dto = {
        recordCount: -1,
        fileName: 'tasks.csv',
      };

      // Act & Assert
      expect(() => CreateTaskFileDtoSchema.parse(dto)).toThrow();
    });

    it('should accept recordCount of zero', () => {
      // Arrange
      const dto = {
        recordCount: 0,
        fileName: 'empty.csv',
      };

      // Act
      const result = CreateTaskFileDtoSchema.parse(dto);

      // Assert
      expect(result.recordCount).toBe(0);
    });

    it('should reject when recordCount is not an integer', () => {
      // Arrange
      const dto = {
        recordCount: 100.5,
        fileName: 'tasks.csv',
      };

      // Act & Assert
      expect(() => CreateTaskFileDtoSchema.parse(dto)).toThrow();
    });
  });
});
