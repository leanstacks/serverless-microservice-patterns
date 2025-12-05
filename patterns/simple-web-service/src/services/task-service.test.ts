import { CreateTaskDto } from '../models/create-task-dto';
import { UpdateTaskDto } from '../models/update-task-dto';
import { TaskItem } from '../models/task';

// Mock dependencies
const mockSend = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
const mockRandomUUID = jest.fn();

jest.mock('crypto', () => ({
  randomUUID: mockRandomUUID,
}));

jest.mock('../utils/dynamodb-client', () => ({
  dynamoDocClient: {
    send: mockSend,
  },
}));

jest.mock('../utils/logger', () => ({
  logger: {
    debug: mockLoggerDebug,
    info: mockLoggerInfo,
    error: mockLoggerError,
  },
}));

jest.mock('../utils/config', () => ({
  config: {
    TASKS_TABLE: 'test-tasks-table',
  },
}));

describe('task-service', () => {
  let listTasks: typeof import('./task-service').listTasks;
  let getTask: typeof import('./task-service').getTask;
  let createTask: typeof import('./task-service').createTask;
  let updateTask: typeof import('./task-service').updateTask;
  let deleteTask: typeof import('./task-service').deleteTask;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Import the module after mocks are set up
    const taskService = require('./task-service');
    listTasks = taskService.listTasks;
    getTask = taskService.getTask;
    createTask = taskService.createTask;
    updateTask = taskService.updateTask;
    deleteTask = taskService.deleteTask;
  });

  describe('listTasks', () => {
    it('should return an empty array when no tasks exist', async () => {
      // Arrange
      mockSend.mockResolvedValue({
        Items: [],
        ScannedCount: 0,
      });

      // Act
      const result = await listTasks();

      // Assert
      expect(result).toEqual([]);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerInfo).toHaveBeenCalledWith('[TaskService] > listTasks', {
        tableName: 'test-tasks-table',
      });
    });

    it('should return all tasks when they exist', async () => {
      // Arrange
      const mockTaskItems: TaskItem[] = [
        {
          pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task 1',
          detail: 'Test detail 1',
          isComplete: false,
          createdAt: '2025-11-01T10:00:00.000Z',
          updatedAt: '2025-11-01T10:00:00.000Z',
        },
        {
          pk: 'TASK#123e4567-e89b-12d3-a456-426614174001',
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Task 2',
          dueAt: '2025-12-01T10:00:00.000Z',
          isComplete: true,
          createdAt: '2025-11-02T10:00:00.000Z',
          updatedAt: '2025-11-03T10:00:00.000Z',
        },
      ];

      mockSend.mockResolvedValue({
        Items: mockTaskItems,
        ScannedCount: 2,
      });

      // Act
      const result = await listTasks();

      // Assert
      expect(result).toHaveLength(2);
      // Tasks should not include pk field
      expect(result[0]).not.toHaveProperty('pk');
      expect(result[1]).not.toHaveProperty('pk');
      expect(result[0].id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result[1].id).toBe('123e4567-e89b-12d3-a456-426614174001');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle DynamoDB errors and rethrow them', async () => {
      // Arrange
      const mockError = new Error('DynamoDB error');
      mockSend.mockRejectedValue(mockError);

      // Act & Assert
      await expect(listTasks()).rejects.toThrow('DynamoDB error');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should handle undefined Items in response', async () => {
      // Arrange
      mockSend.mockResolvedValue({
        ScannedCount: 0,
      });

      // Act
      const result = await listTasks();

      // Assert
      expect(result).toEqual([]);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTask', () => {
    it('should return a task when it exists', async () => {
      // Arrange
      const mockTaskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        detail: 'Test detail',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      mockSend.mockResolvedValue({
        Item: mockTaskItem,
      });

      // Act
      const result = await getTask('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        detail: 'Test detail',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      });
      expect(result).not.toHaveProperty('pk');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-tasks-table',
            Key: {
              pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
            },
          }),
        }),
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith('[TaskService] > getTask', {
        tableName: 'test-tasks-table',
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
    });

    it('should return null when task does not exist', async () => {
      // Arrange
      mockSend.mockResolvedValue({});

      // Act
      const result = await getTask('non-existent-id');

      // Assert
      expect(result).toBeNull();
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerInfo).toHaveBeenCalledWith('[TaskService] < getTask - task not found', {
        id: 'non-existent-id',
      });
    });

    it('should return a task with only required fields', async () => {
      // Arrange
      const mockTaskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      mockSend.mockResolvedValue({
        Item: mockTaskItem,
      });

      // Act
      const result = await getTask('123e4567-e89b-12d3-a456-426614174000');

      // Assert
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      });
      expect(result).not.toHaveProperty('detail');
      expect(result).not.toHaveProperty('dueAt');
    });

    it('should handle DynamoDB errors and rethrow them', async () => {
      // Arrange
      const mockError = new Error('DynamoDB error');
      mockSend.mockRejectedValue(mockError);

      // Act & Assert
      await expect(getTask('123e4567-e89b-12d3-a456-426614174000')).rejects.toThrow('DynamoDB error');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should construct correct DynamoDB key with task ID', async () => {
      // Arrange
      const taskId = 'test-task-id-123';
      mockSend.mockResolvedValue({});

      // Act
      await getTask(taskId);

      // Assert
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Key: {
              pk: 'TASK#test-task-id-123',
            },
          }),
        }),
      );
    });
  });

  describe('createTask', () => {
    beforeEach(() => {
      // Mock Date.now() for consistent timestamps
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-12-01T10:00:00.000Z'));

      // Mock UUID generation
      mockRandomUUID.mockReturnValue('123e4567-e89b-12d3-a456-426614174000');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a task with all fields', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        detail: 'Test detail',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: false,
      };

      mockSend.mockResolvedValue({});

      // Act
      const result = await createTask(createTaskDto);

      // Assert
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        detail: 'Test detail',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: false,
        createdAt: '2025-12-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-tasks-table',
            Item: expect.objectContaining({
              pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
              id: '123e4567-e89b-12d3-a456-426614174000',
              title: 'Test Task',
              detail: 'Test detail',
              dueAt: '2025-12-31T23:59:59.000Z',
              isComplete: false,
              createdAt: '2025-12-01T10:00:00.000Z',
              updatedAt: '2025-12-01T10:00:00.000Z',
            }),
          }),
        }),
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith('[TaskService] > createTask', {
        tableName: 'test-tasks-table',
      });
    });

    it('should create a task with only required fields', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        isComplete: false,
      };

      mockSend.mockResolvedValue({});

      // Act
      const result = await createTask(createTaskDto);

      // Assert
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: false,
        createdAt: '2025-12-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      });
      // Task should not include optional fields that were not provided
      expect(result).not.toHaveProperty('detail');
      expect(result).not.toHaveProperty('dueAt');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should create a task with isComplete defaulting to false when undefined', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        isComplete: false,
      };

      mockSend.mockResolvedValue({});

      // Act
      const result = await createTask(createTaskDto);

      // Assert
      expect(result.isComplete).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should create a task with isComplete set to true', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        isComplete: true,
      };

      mockSend.mockResolvedValue({});

      // Act
      const result = await createTask(createTaskDto);

      // Assert
      expect(result.isComplete).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should generate a unique UUID for each task', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        isComplete: false,
      };

      mockSend.mockResolvedValue({});

      // Act
      await createTask(createTaskDto);

      // Assert
      expect(mockRandomUUID).toHaveBeenCalledTimes(1);
    });

    it('should set createdAt and updatedAt to the current time', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        isComplete: false,
      };

      mockSend.mockResolvedValue({});

      // Act
      const result = await createTask(createTaskDto);

      // Assert
      expect(result.createdAt).toBe('2025-12-01T10:00:00.000Z');
      expect(result.updatedAt).toBe('2025-12-01T10:00:00.000Z');
    });

    it('should handle DynamoDB errors and rethrow them', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        isComplete: false,
      };

      const mockError = new Error('DynamoDB error');
      mockSend.mockRejectedValue(mockError);

      // Act & Assert
      await expect(createTask(createTaskDto)).rejects.toThrow('DynamoDB error');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should not include pk field in returned task', async () => {
      // Arrange
      const createTaskDto: CreateTaskDto = {
        title: 'Test Task',
        isComplete: false,
      };

      mockSend.mockResolvedValue({});

      // Act
      const result = await createTask(createTaskDto);

      // Assert
      expect(result).not.toHaveProperty('pk');
    });
  });

  describe('updateTask', () => {
    beforeEach(() => {
      // Mock Date.now to return a fixed timestamp
      jest.spyOn(global, 'Date').mockImplementation(() => {
        return {
          toISOString: () => '2025-12-01T10:00:00.000Z',
        } as Date;
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should update a task with all fields', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        detail: 'Updated detail',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: true,
      };

      const updatedTaskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: taskId,
        title: 'Updated Task',
        detail: 'Updated detail',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: true,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockSend.mockResolvedValue({
        Attributes: updatedTaskItem,
      });

      // Act
      const result = await updateTask(taskId, updateTaskDto);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Updated Task');
      expect(result?.detail).toBe('Updated detail');
      expect(result?.dueAt).toBe('2025-12-31T23:59:59.000Z');
      expect(result?.isComplete).toBe(true);
      expect(result?.updatedAt).toBe('2025-12-01T10:00:00.000Z');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerInfo).toHaveBeenCalledWith('[TaskService] > updateTask', {
        tableName: 'test-tasks-table',
        id: taskId,
      });
    });

    it('should update a task with only required fields', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        isComplete: false,
      };

      const updatedTaskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: taskId,
        title: 'Updated Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockSend.mockResolvedValue({
        Attributes: updatedTaskItem,
      });

      // Act
      const result = await updateTask(taskId, updateTaskDto);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Updated Task');
      expect(result?.detail).toBeUndefined();
      expect(result?.dueAt).toBeUndefined();
      expect(result?.isComplete).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return null when task is not found', async () => {
      // Arrange
      const taskId = 'non-existent-id';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        isComplete: false,
      };

      const mockError = new Error('The conditional request failed');
      mockError.name = 'ConditionalCheckFailedException';
      mockSend.mockRejectedValue(mockError);

      // Act
      const result = await updateTask(taskId, updateTaskDto);

      // Assert
      expect(result).toBeNull();
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerInfo).toHaveBeenCalledWith('[TaskService] < updateTask - task not found', {
        id: taskId,
      });
    });

    it('should update task and set updatedAt to current time', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        isComplete: false,
      };

      const updatedTaskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: taskId,
        title: 'Updated Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockSend.mockResolvedValue({
        Attributes: updatedTaskItem,
      });

      // Act
      const result = await updateTask(taskId, updateTaskDto);

      // Assert
      expect(result?.updatedAt).toBe('2025-12-01T10:00:00.000Z');
    });

    it('should handle DynamoDB errors and rethrow them', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        isComplete: false,
      };

      const mockError = new Error('DynamoDB error');
      mockSend.mockRejectedValue(mockError);

      // Act & Assert
      await expect(updateTask(taskId, updateTaskDto)).rejects.toThrow('DynamoDB error');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should not include pk field in returned task', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        isComplete: false,
      };

      const updatedTaskItem: TaskItem = {
        pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
        id: taskId,
        title: 'Updated Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockSend.mockResolvedValue({
        Attributes: updatedTaskItem,
      });

      // Act
      const result = await updateTask(taskId, updateTaskDto);

      // Assert
      expect(result).not.toHaveProperty('pk');
    });

    it('should use UpdateCommand with correct parameters', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        detail: 'Updated detail',
        isComplete: false,
      };

      mockSend.mockResolvedValue({
        Attributes: {
          pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
          id: taskId,
          title: 'Updated Task',
          detail: 'Updated detail',
          isComplete: false,
          createdAt: '2025-11-01T10:00:00.000Z',
          updatedAt: '2025-12-01T10:00:00.000Z',
        },
      });

      // Act
      await updateTask(taskId, updateTaskDto);

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(1);
      const command = mockSend.mock.calls[0][0];
      expect(command.input.TableName).toBe('test-tasks-table');
      expect(command.input.Key).toEqual({ pk: 'TASK#123e4567-e89b-12d3-a456-426614174000' });
      expect(command.input.ConditionExpression).toBe('attribute_exists(pk)');
      expect(command.input.ReturnValues).toBe('ALL_NEW');
    });

    it('should add detail to update expression when detail is provided', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        detail: 'New detail',
        isComplete: false,
      };

      mockSend.mockResolvedValue({
        Attributes: {
          pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
          id: taskId,
          title: 'Updated Task',
          detail: 'New detail',
          isComplete: false,
          createdAt: '2025-11-01T10:00:00.000Z',
          updatedAt: '2025-12-01T10:00:00.000Z',
        },
      });

      // Act
      await updateTask(taskId, updateTaskDto);

      // Assert
      const command = mockSend.mock.calls[0][0];
      expect(command.input.UpdateExpression).toContain('detail = :detail');
      expect(command.input.ExpressionAttributeValues[':detail']).toBe('New detail');
    });

    it('should add dueAt to update expression when dueAt is provided', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const updateTaskDto: UpdateTaskDto = {
        title: 'Updated Task',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: false,
      };

      mockSend.mockResolvedValue({
        Attributes: {
          pk: 'TASK#123e4567-e89b-12d3-a456-426614174000',
          id: taskId,
          title: 'Updated Task',
          dueAt: '2025-12-31T23:59:59.000Z',
          isComplete: false,
          createdAt: '2025-11-01T10:00:00.000Z',
          updatedAt: '2025-12-01T10:00:00.000Z',
        },
      });

      // Act
      await updateTask(taskId, updateTaskDto);

      // Assert
      const command = mockSend.mock.calls[0][0];
      expect(command.input.UpdateExpression).toContain('dueAt = :dueAt');
      expect(command.input.ExpressionAttributeValues[':dueAt']).toBe('2025-12-31T23:59:59.000Z');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      mockSend.mockResolvedValue({});

      // Act
      const result = await deleteTask(taskId);

      // Assert
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-tasks-table',
            Key: {
              pk: `TASK#${taskId}`,
            },
            ConditionExpression: 'attribute_exists(pk)',
          }),
        }),
      );
      expect(mockLoggerInfo).toHaveBeenCalledWith('[TaskService] > deleteTask', {
        tableName: 'test-tasks-table',
        id: taskId,
      });
      expect(mockLoggerInfo).toHaveBeenCalledWith('[TaskService] < deleteTask - successfully deleted task', {
        id: taskId,
      });
    });

    it('should return false when task does not exist', async () => {
      // Arrange
      const taskId = 'non-existent-id';
      const mockError = new Error('Conditional check failed');
      mockError.name = 'ConditionalCheckFailedException';
      mockSend.mockRejectedValue(mockError);

      // Act
      const result = await deleteTask(taskId);

      // Assert
      expect(result).toBe(false);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerInfo).toHaveBeenCalledWith('[TaskService] < deleteTask - task not found', {
        id: taskId,
      });
    });

    it('should handle DynamoDB errors and rethrow them', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const mockError = new Error('DynamoDB error');
      mockSend.mockRejectedValue(mockError);

      // Act & Assert
      await expect(deleteTask(taskId)).rejects.toThrow('DynamoDB error');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[TaskService] < deleteTask - failed to delete task from DynamoDB',
        mockError,
        {
          tableName: 'test-tasks-table',
          id: taskId,
        },
      );
    });

    it('should construct correct DynamoDB key with task ID', async () => {
      // Arrange
      const taskId = 'custom-task-id-456';
      mockSend.mockResolvedValue({});

      // Act
      await deleteTask(taskId);

      // Assert
      const command = mockSend.mock.calls[0][0];
      expect(command.input.Key).toEqual({
        pk: `TASK#${taskId}`,
      });
    });

    it('should include condition expression to ensure task exists', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      mockSend.mockResolvedValue({});

      // Act
      await deleteTask(taskId);

      // Assert
      const command = mockSend.mock.calls[0][0];
      expect(command.input.ConditionExpression).toBe('attribute_exists(pk)');
    });
  });
});
