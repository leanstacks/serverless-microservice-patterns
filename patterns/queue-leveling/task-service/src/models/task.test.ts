import { TASK_PK_PREFIX, Task, TaskItem, TaskKeys, toTask } from './task';

describe('task', () => {
  describe('TASK_PK_PREFIX', () => {
    it('should have the correct prefix value', () => {
      // Assert
      expect(TASK_PK_PREFIX).toBe('TASK#');
    });
  });

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

  describe('TaskItem type', () => {
    it('should create a valid TaskItem object with all Task properties plus pk', () => {
      // Arrange
      const taskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        detail: 'Test detail',
        dueAt: '2025-12-01T10:00:00.000Z',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      // Assert
      expect(taskItem.pk).toBe('TASK#123e4567-e89b-12d3-a456-426614174000');
      expect(taskItem.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(taskItem.title).toBe('Test Task');
      expect(taskItem.detail).toBe('Test detail');
      expect(taskItem.dueAt).toBe('2025-12-01T10:00:00.000Z');
      expect(taskItem.isComplete).toBe(false);
    });

    it('should create a valid TaskItem object with optional fields omitted', () => {
      // Arrange
      const taskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: true,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      // Assert
      expect(taskItem.pk).toBe('TASK#123e4567-e89b-12d3-a456-426614174000');
      expect(taskItem.detail).toBeUndefined();
      expect(taskItem.dueAt).toBeUndefined();
    });
  });

  describe('toTask', () => {
    it('should transform TaskItem to Task by removing pk field', () => {
      // Arrange
      const taskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        detail: 'Test detail',
        dueAt: '2025-12-01T10:00:00.000Z',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      // Act
      const task = toTask(taskItem);

      // Assert
      expect(task).not.toHaveProperty('pk');
      expect(task.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(task.title).toBe('Test Task');
      expect(task.detail).toBe('Test detail');
      expect(task.dueAt).toBe('2025-12-01T10:00:00.000Z');
      expect(task.isComplete).toBe(false);
      expect(task.createdAt).toBe('2025-11-01T10:00:00.000Z');
      expect(task.updatedAt).toBe('2025-11-01T10:00:00.000Z');
    });

    it('should transform TaskItem to Task with optional fields omitted', () => {
      // Arrange
      const taskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: true,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      // Act
      const task = toTask(taskItem);

      // Assert
      expect(task).not.toHaveProperty('pk');
      expect(task.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(task.title).toBe('Test Task');
      expect(task.detail).toBeUndefined();
      expect(task.dueAt).toBeUndefined();
      expect(task.isComplete).toBe(true);
    });

    it('should not mutate the original TaskItem', () => {
      // Arrange
      const taskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };
      const originalPk = taskItem.pk;

      // Act
      toTask(taskItem);

      // Assert
      expect(taskItem.pk).toBe(originalPk);
      expect(taskItem).toHaveProperty('pk');
    });
  });

  describe('TaskKeys', () => {
    describe('pk', () => {
      it('should generate partition key with TASK prefix and UUID', () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';

        // Act
        const pk = TaskKeys.pk(id);

        // Assert
        expect(pk).toBe('TASK#123e4567-e89b-12d3-a456-426614174000');
      });

      it('should generate partition key for different UUIDs', () => {
        // Arrange
        const id1 = '123e4567-e89b-12d3-a456-426614174000';
        const id2 = '987e6543-e21b-98d7-a654-426614174999';

        // Act
        const pk1 = TaskKeys.pk(id1);
        const pk2 = TaskKeys.pk(id2);

        // Assert
        expect(pk1).toBe('TASK#123e4567-e89b-12d3-a456-426614174000');
        expect(pk2).toBe('TASK#987e6543-e21b-98d7-a654-426614174999');
        expect(pk1).not.toBe(pk2);
      });

      it('should use the correct prefix constant', () => {
        // Arrange
        const id = '123e4567-e89b-12d3-a456-426614174000';

        // Act
        const pk = TaskKeys.pk(id);

        // Assert
        expect(pk).toContain(TASK_PK_PREFIX);
        expect(pk.startsWith(TASK_PK_PREFIX)).toBe(true);
      });

      it('should handle empty string', () => {
        // Arrange
        // N/A

        // Act
        const pk = TaskKeys.pk('');

        // Assert
        expect(pk).toBe('TASK#');
      });
    });
  });
});
