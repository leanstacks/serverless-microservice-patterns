import {
  TASKFILE_PK_PREFIX,
  TASKFILE_SK,
  ProcessingStatus,
  TaskFile,
  TaskFileItem,
  TaskFileKeys,
  toTaskFile,
} from './task-file';

describe('task-file', () => {
  describe('TASKFILE_PK_PREFIX', () => {
    it('should have the correct prefix value', () => {
      // Assert
      expect(TASKFILE_PK_PREFIX).toBe('TASKFILE#');
    });
  });

  describe('TASKFILE_SK', () => {
    it('should have the correct sort key value', () => {
      // Assert
      expect(TASKFILE_SK).toBe('DETAIL');
    });
  });

  describe('ProcessingStatus enum', () => {
    it('should have the correct enum values', () => {
      // Assert
      expect(ProcessingStatus.NEW).toBe('NEW');
      expect(ProcessingStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(ProcessingStatus.COMPLETED).toBe('COMPLETED');
    });
  });

  describe('TaskFile type', () => {
    it('should create a valid TaskFile object', () => {
      // Arrange
      const taskFile: TaskFile = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fileName: 'tasks.csv',
        processingStatus: ProcessingStatus.NEW,
        recordCount: 100,
        processedCount: 0,
        unprocessedCount: 100,
        createdAt: '2025-01-13T10:00:00.000Z',
        updatedAt: '2025-01-13T10:00:00.000Z',
      };

      // Assert
      expect(taskFile.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(taskFile.fileName).toBe('tasks.csv');
      expect(taskFile.processingStatus).toBe(ProcessingStatus.NEW);
      expect(taskFile.recordCount).toBe(100);
      expect(taskFile.processedCount).toBe(0);
      expect(taskFile.unprocessedCount).toBe(100);
      expect(taskFile.createdAt).toBe('2025-01-13T10:00:00.000Z');
      expect(taskFile.updatedAt).toBe('2025-01-13T10:00:00.000Z');
    });
  });

  describe('TaskFileItem type', () => {
    it('should create a valid TaskFileItem object with all TaskFile properties plus pk and sk', () => {
      // Arrange
      const taskFileItem: TaskFileItem = {
        pk: 'TASKFILE#123e4567-e89b-12d3-a456-426614174000',
        sk: 'DETAIL',
        id: '123e4567-e89b-12d3-a456-426614174000',
        fileName: 'tasks.csv',
        processingStatus: ProcessingStatus.IN_PROGRESS,
        recordCount: 100,
        processedCount: 50,
        unprocessedCount: 50,
        createdAt: '2025-01-13T10:00:00.000Z',
        updatedAt: '2025-01-13T11:00:00.000Z',
      };

      // Assert
      expect(taskFileItem.pk).toBe('TASKFILE#123e4567-e89b-12d3-a456-426614174000');
      expect(taskFileItem.sk).toBe('DETAIL');
      expect(taskFileItem.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(taskFileItem.fileName).toBe('tasks.csv');
      expect(taskFileItem.processingStatus).toBe(ProcessingStatus.IN_PROGRESS);
      expect(taskFileItem.recordCount).toBe(100);
      expect(taskFileItem.processedCount).toBe(50);
      expect(taskFileItem.unprocessedCount).toBe(50);
    });
  });

  describe('toTaskFile', () => {
    it('should transform a TaskFileItem to a TaskFile by removing pk and sk', () => {
      // Arrange
      const taskFileItem: TaskFileItem = {
        pk: 'TASKFILE#123e4567-e89b-12d3-a456-426614174000',
        sk: 'DETAIL',
        id: '123e4567-e89b-12d3-a456-426614174000',
        fileName: 'tasks.csv',
        processingStatus: ProcessingStatus.COMPLETED,
        recordCount: 100,
        processedCount: 100,
        unprocessedCount: 0,
        createdAt: '2025-01-13T10:00:00.000Z',
        updatedAt: '2025-01-13T12:00:00.000Z',
      };

      // Act
      const taskFile = toTaskFile(taskFileItem);

      // Assert
      expect(taskFile).not.toHaveProperty('pk');
      expect(taskFile).not.toHaveProperty('sk');
      expect(taskFile.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(taskFile.fileName).toBe('tasks.csv');
      expect(taskFile.processingStatus).toBe(ProcessingStatus.COMPLETED);
      expect(taskFile.recordCount).toBe(100);
      expect(taskFile.processedCount).toBe(100);
      expect(taskFile.unprocessedCount).toBe(0);
      expect(taskFile.createdAt).toBe('2025-01-13T10:00:00.000Z');
      expect(taskFile.updatedAt).toBe('2025-01-13T12:00:00.000Z');
    });
  });

  describe('TaskFileKeys', () => {
    it('should generate correct partition key', () => {
      // Arrange
      const id = '123e4567-e89b-12d3-a456-426614174000';

      // Act
      const pk = TaskFileKeys.pk(id);

      // Assert
      expect(pk).toBe('TASKFILE#123e4567-e89b-12d3-a456-426614174000');
    });

    it('should generate correct sort key', () => {
      // Act
      const sk = TaskFileKeys.sk();

      // Assert
      expect(sk).toBe('DETAIL');
    });
  });
});
