import { Task } from './task';

describe('task', () => {
  describe('Task type', () => {
    it('should create a valid Task object', () => {
      // Arrange
      const task: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        detail: 'Test detail',
        dueAt: '2025-12-01T10:00:00.000Z',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      // Assert
      expect(task.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(task.title).toBe('Test Task');
      expect(task.detail).toBe('Test detail');
      expect(task.dueAt).toBe('2025-12-01T10:00:00.000Z');
      expect(task.isComplete).toBe(false);
      expect(task.createdAt).toBe('2025-11-01T10:00:00.000Z');
      expect(task.updatedAt).toBe('2025-11-01T10:00:00.000Z');
    });

    it('should create a valid Task object with optional fields omitted', () => {
      // Arrange
      const task: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: true,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      // Assert
      expect(task.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(task.title).toBe('Test Task');
      expect(task.detail).toBeUndefined();
      expect(task.dueAt).toBeUndefined();
      expect(task.isComplete).toBe(true);
    });
  });
});
