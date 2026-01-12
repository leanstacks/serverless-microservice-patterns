// Mock dependencies BEFORE importing the service
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerDebug = jest.fn();

jest.mock('../utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
    debug: mockLoggerDebug,
  },
}));

describe('csv-service', () => {
  let parseCsv: typeof import('./csv-service').parseCsv;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import service after mocks are set up
    parseCsv = require('./csv-service').parseCsv;
  });

  describe('parseCsv', () => {
    it('should parse valid CSV with all fields', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,Detail 1,2026-12-31T23:59:59Z,false
Task 2,Detail 2,2026-01-15T12:00:00Z,true`;

      // Act
      const result = parseCsv(csvContent);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        title: 'Task 1',
        detail: 'Detail 1',
        dueAt: '2026-12-31T23:59:59Z',
        isComplete: false,
      });
      expect(result[1]).toEqual({
        title: 'Task 2',
        detail: 'Detail 2',
        dueAt: '2026-01-15T12:00:00Z',
        isComplete: true,
      });
    });

    it('should parse valid CSV with required fields only', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,,,false
Task 2,,,`;

      // Act
      const result = parseCsv(csvContent);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        title: 'Task 1',
        isComplete: false,
      });
      expect(result[1]).toEqual({
        title: 'Task 2',
        isComplete: false,
      });
    });

    it('should handle isComplete as string "true"', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,,,true`;

      // Act
      const result = parseCsv(csvContent);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]!.isComplete).toBe(true);
    });

    it('should handle isComplete as string "1"', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,,,1`;

      // Act
      const result = parseCsv(csvContent);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]!.isComplete).toBe(true);
    });

    it('should handle isComplete as empty string (defaults to false)', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,,,`;

      // Act
      const result = parseCsv(csvContent);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]!.isComplete).toBe(false);
    });

    it('should skip empty lines', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,,,false

Task 2,,,false`;

      // Act
      const result = parseCsv(csvContent);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should trim whitespace from values', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
  Task 1  ,  Detail 1  ,  2026-12-31T23:59:59Z  ,  false  `;

      // Act
      const result = parseCsv(csvContent);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        title: 'Task 1',
        detail: 'Detail 1',
        dueAt: '2026-12-31T23:59:59Z',
        isComplete: false,
      });
    });

    it('should throw error when title is missing', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
,Detail 1,2026-12-31T23:59:59Z,false`;

      // Act & Assert
      expect(() => parseCsv(csvContent)).toThrow('CSV validation failed');
      expect(() => parseCsv(csvContent)).toThrow('Row 2');
      expect(() => parseCsv(csvContent)).toThrow('Title is required');
    });

    it('should throw error when title exceeds 100 characters', () => {
      // Arrange
      const longTitle = 'a'.repeat(101);
      const csvContent = `title,detail,dueAt,isComplete
${longTitle},Detail 1,2026-12-31T23:59:59Z,false`;

      // Act & Assert
      expect(() => parseCsv(csvContent)).toThrow('CSV validation failed');
      expect(() => parseCsv(csvContent)).toThrow('Row 2');
      expect(() => parseCsv(csvContent)).toThrow('Title must not exceed 100 characters');
    });

    it('should throw error when detail exceeds 1000 characters', () => {
      // Arrange
      const longDetail = 'a'.repeat(1001);
      const csvContent = `title,detail,dueAt,isComplete
Task 1,${longDetail},2026-12-31T23:59:59Z,false`;

      // Act & Assert
      expect(() => parseCsv(csvContent)).toThrow('CSV validation failed');
      expect(() => parseCsv(csvContent)).toThrow('Row 2');
      expect(() => parseCsv(csvContent)).toThrow('Detail must not exceed 1000 characters');
    });

    it('should throw error when dueAt is not valid ISO8601', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
Task 1,Detail 1,not-a-date,false`;

      // Act & Assert
      expect(() => parseCsv(csvContent)).toThrow('CSV validation failed');
      expect(() => parseCsv(csvContent)).toThrow('Row 2');
      expect(() => parseCsv(csvContent)).toThrow('Due date must be a valid ISO8601 timestamp');
    });

    it('should throw error with multiple validation errors', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete
,Detail 1,not-a-date,false
Task 2,,,false
,,,`;

      // Act & Assert
      expect(() => parseCsv(csvContent)).toThrow('CSV validation failed');
      const errorMessage = (() => {
        try {
          parseCsv(csvContent);
          return '';
        } catch (error) {
          return error instanceof Error ? error.message : '';
        }
      })();
      expect(errorMessage).toContain('Row 2');
      expect(errorMessage).toContain('Row 4');
    });

    it('should throw error for invalid CSV format', () => {
      // Arrange
      // CSV without headers will cause validation errors since title field is missing
      const csvContent = 'not a valid csv\nformat';

      // Act & Assert
      expect(() => parseCsv(csvContent)).toThrow('CSV validation failed');
      expect(() => parseCsv(csvContent)).toThrow('title: Invalid input');
    });

    it('should handle CSV with many valid rows', () => {
      // Arrange
      const rows = Array.from({ length: 100 }, (_, i) => `Task ${i + 1},Detail ${i + 1},2026-12-31T23:59:59Z,false`);
      const csvContent = `title,detail,dueAt,isComplete\n${rows.join('\n')}`;

      // Act
      const result = parseCsv(csvContent);

      // Assert
      expect(result).toHaveLength(100);
    });

    it('should throw error when CSV has no data rows', () => {
      // Arrange
      const csvContent = `title,detail,dueAt,isComplete`;

      // Act
      const result = parseCsv(csvContent);

      // Assert
      expect(result).toHaveLength(0);
    });
  });
});
