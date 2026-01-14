import { createTaskFile, parseCsvAndCreateTasks, incrementTaskFileProcessedCount } from './task-file-service';
import { CreateTaskFileDto } from '../models/create-task-file-dto';
import { ProcessingStatus } from '../models/task-file';

jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../utils/config', () => ({
  config: {
    TASK_FILE_TABLE: 'test-task-file-table',
    CREATE_TASK_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
  },
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

jest.mock('../utils/dynamodb-client', () => ({
  dynamoDocClient: {
    send: jest.fn(),
  },
}));

jest.mock('../utils/sqs-client', () => ({
  sendToQueue: jest.fn(),
}));

jest.mock('./csv-service', () => ({
  parseCsv: jest.fn(),
}));

// Mock dependencies - reference after jest.mock calls for proper hoisting
const mockSend = jest.requireMock('../utils/dynamodb-client').dynamoDocClient.send;
const mockLoggerInfo = jest.requireMock('../utils/logger').logger.info;
const mockLoggerError = jest.requireMock('../utils/logger').logger.error;
const mockRandomUUID = jest.requireMock('crypto').randomUUID;
const mockSendToQueue = jest.requireMock('../utils/sqs-client').sendToQueue;
const mockParseCsv = jest.requireMock('./csv-service').parseCsv;

describe('task-file-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('123e4567-e89b-12d3-a456-426614174000');
  });

  describe('createTaskFile', () => {
    it('should create a new task file item in DynamoDB with NEW status and zero processed count', async () => {
      // Arrange
      const createTaskFileDto: CreateTaskFileDto = {
        recordCount: 100,
        fileName: 'tasks.csv',
      };

      const now = new Date().toISOString();
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(now);

      mockSend.mockResolvedValue({});

      // Act
      const result = await createTaskFile(createTaskFileDto);

      // Assert
      expect(result).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        fileName: 'tasks.csv',
        processingStatus: ProcessingStatus.NEW,
        recordCount: 100,
        processedCount: 0,
        unprocessedCount: 100,
        createdAt: now,
        updatedAt: now,
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const putCommand = mockSend.mock.calls[0][0];
      expect(putCommand.input.TableName).toBe('test-task-file-table');
      expect(putCommand.input.Item).toEqual({
        pk: 'TASKFILE#123e4567-e89b-12d3-a456-426614174000',
        sk: 'DETAIL',
        id: '123e4567-e89b-12d3-a456-426614174000',
        fileName: 'tasks.csv',
        processingStatus: ProcessingStatus.NEW,
        recordCount: 100,
        processedCount: 0,
        unprocessedCount: 100,
        createdAt: now,
        updatedAt: now,
      });

      expect(mockLoggerInfo).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if DynamoDB put operation fails', async () => {
      // Arrange
      const createTaskFileDto: CreateTaskFileDto = {
        recordCount: 50,
        fileName: 'failed-upload.csv',
      };

      const error = new Error('DynamoDB error');
      mockSend.mockRejectedValue(error);

      // Act & Assert
      await expect(createTaskFile(createTaskFileDto)).rejects.toThrow('DynamoDB error');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('parseCsvAndCreateTasks', () => {
    it('should parse CSV, create TaskFile, and fan out tasks', async () => {
      // Arrange
      const csvContent = 'title,detail,dueAt,isComplete\nTask 1,Detail 1,,false';
      const taskFileId = '123e4567-e89b-12d3-a456-426614174000';
      const mockCreateTaskDto = { title: 'Task 1', detail: 'Detail 1', isComplete: false };

      mockParseCsv.mockReturnValue([mockCreateTaskDto]);
      mockSend.mockResolvedValue({});
      mockSendToQueue.mockResolvedValue('msg-id-1');

      // Act
      const result = await parseCsvAndCreateTasks(csvContent, 'tasks.csv');

      // Assert
      expect(result).toBe(taskFileId);
      expect(mockParseCsv).toHaveBeenCalledWith(csvContent);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSendToQueue).toHaveBeenCalledTimes(1);
      expect(mockSendToQueue).toHaveBeenCalledWith('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue', {
        task: mockCreateTaskDto,
        taskFileId,
      });
    });

    it('should return the TaskFile ID after successfully fanning out tasks', async () => {
      // Arrange
      const csvContent = 'title,detail,dueAt,isComplete\nTask 1,,2025-12-01T10:00:00.000Z,false\nTask 2,Detail 2,,true';
      const mockCreateTaskDtos = [
        { title: 'Task 1', isComplete: false, dueAt: '2025-12-01T10:00:00.000Z' },
        { title: 'Task 2', detail: 'Detail 2', isComplete: true },
      ];

      mockParseCsv.mockReturnValue(mockCreateTaskDtos);
      mockSend.mockResolvedValue({});
      mockSendToQueue.mockResolvedValueOnce('msg-1');
      mockSendToQueue.mockResolvedValueOnce('msg-2');

      // Act
      const result = await parseCsvAndCreateTasks(csvContent, 'tasks-batch.csv');

      // Assert
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(mockParseCsv).toHaveBeenCalledWith(csvContent);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSendToQueue).toHaveBeenCalledTimes(2);
      expect(mockSendToQueue).toHaveBeenNthCalledWith(
        1,
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        {
          task: mockCreateTaskDtos[0],
          taskFileId: '123e4567-e89b-12d3-a456-426614174000',
        },
      );
      expect(mockSendToQueue).toHaveBeenNthCalledWith(
        2,
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        {
          task: mockCreateTaskDtos[1],
          taskFileId: '123e4567-e89b-12d3-a456-426614174000',
        },
      );
    });

    it('should throw error if CSV parsing fails', async () => {
      // Arrange
      const invalidCsvContent = 'invalid csv,,,\n,,,';
      const parseError = new Error('CSV validation failed');

      mockParseCsv.mockImplementation(() => {
        throw parseError;
      });

      // Act & Assert
      await expect(parseCsvAndCreateTasks(invalidCsvContent, 'invalid.csv')).rejects.toThrow('CSV validation failed');
      expect(mockSend).not.toHaveBeenCalled();
      expect(mockSendToQueue).not.toHaveBeenCalled();
    });

    it('should throw error if TaskFile creation fails', async () => {
      // Arrange
      const csvContent = 'title,detail,dueAt,isComplete\nTask 1,Detail 1,,false';
      const mockCreateTaskDto = { title: 'Task 1', detail: 'Detail 1', isComplete: false };
      const dynamoDbError = new Error('DynamoDB error');

      mockParseCsv.mockReturnValue([mockCreateTaskDto]);
      mockSend.mockRejectedValue(dynamoDbError);

      // Act & Assert
      await expect(parseCsvAndCreateTasks(csvContent, 'tasks.csv')).rejects.toThrow('DynamoDB error');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSendToQueue).not.toHaveBeenCalled();
    });

    it('should throw error if fanning out tasks fails', async () => {
      // Arrange
      const csvContent = 'title,detail,dueAt,isComplete\nTask 1,,2025-12-01T10:00:00.000Z,false';
      const mockCreateTaskDto = { title: 'Task 1', isComplete: false, dueAt: '2025-12-01T10:00:00.000Z' };
      const sqsError = new Error('SQS error');

      mockParseCsv.mockReturnValue([mockCreateTaskDto]);
      mockSend.mockResolvedValue({});
      mockSendToQueue.mockRejectedValue(sqsError);

      // Act & Assert
      await expect(parseCsvAndCreateTasks(csvContent, 'tasks.csv')).rejects.toThrow('SQS error');
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSendToQueue).toHaveBeenCalledTimes(1);
    });

    it('should create TaskFile with correct recordCount matching parsed CSV rows', async () => {
      // Arrange
      const csvContent =
        'title,detail,dueAt,isComplete\nTask 1,,2025-12-01T10:00:00.000Z,false\nTask 2,Detail 2,,true\nTask 3,,2025-12-15T10:00:00.000Z,false';
      const mockCreateTaskDtos = [
        { title: 'Task 1', isComplete: false, dueAt: '2025-12-01T10:00:00.000Z' },
        { title: 'Task 2', detail: 'Detail 2', isComplete: true },
        { title: 'Task 3', isComplete: false, dueAt: '2025-12-15T10:00:00.000Z' },
      ];

      mockParseCsv.mockReturnValue(mockCreateTaskDtos);
      mockSend.mockResolvedValue({});
      mockSendToQueue.mockResolvedValue('msg-id');

      const now = new Date().toISOString();
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(now);

      // Act
      await parseCsvAndCreateTasks(csvContent, 'multi-task.csv');

      // Assert
      expect(mockParseCsv).toHaveBeenCalledWith(csvContent);
      expect(mockSend).toHaveBeenCalledTimes(1);
      // Verify the PutCommand for TaskFile has correct recordCount
      const putCommand = mockSend.mock.calls[0][0];
      expect(putCommand.input.Item.recordCount).toBe(3);
      expect(putCommand.input.Item.fileName).toBe('multi-task.csv');
      expect(mockSendToQueue).toHaveBeenCalledTimes(3);
    });
  });

  describe('incrementTaskFileProcessedCount', () => {
    it('should increment processed count and decrement unprocessed count', async () => {
      // Arrange
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const now = '2026-01-14T10:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(now);

      const mockTaskFile = {
        pk: `TASK_FILE#${taskFileId}`,
        sk: 'METADATA',
        id: taskFileId,
        fileName: 'test.csv',
        processingStatus: ProcessingStatus.IN_PROGRESS,
        recordCount: 5,
        processedCount: 2,
        unprocessedCount: 3,
        createdAt: now,
        updatedAt: now,
      };

      mockSend.mockResolvedValueOnce({ Attributes: mockTaskFile });

      // Act
      const result = await incrementTaskFileProcessedCount(taskFileId);

      // Assert
      expect(mockSend).toHaveBeenCalledTimes(1);
      const updateCommand = mockSend.mock.calls[0][0];
      expect(updateCommand.input.TableName).toBe('test-task-file-table');
      expect(updateCommand.input.Key).toEqual({
        pk: `TASKFILE#${taskFileId}`,
        sk: 'DETAIL',
      });
      expect(updateCommand.input.UpdateExpression).toContain('processedCount = processedCount + :inc');
      expect(updateCommand.input.UpdateExpression).toContain('unprocessedCount = unprocessedCount - :inc');
      expect(updateCommand.input.ExpressionAttributeValues[':inc']).toBe(1);
      expect(updateCommand.input.ExpressionAttributeValues[':processingStatus']).toBe(ProcessingStatus.IN_PROGRESS);
      expect(result.id).toBe(taskFileId);
      expect(result.processedCount).toBe(2);
      expect(result.unprocessedCount).toBe(3);
    });

    it('should set status to IN_PROGRESS', async () => {
      // Arrange
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const now = '2026-01-14T10:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(now);

      const mockTaskFile = {
        pk: `TASKFILE#${taskFileId}`,
        sk: 'DETAIL',
        id: taskFileId,
        fileName: 'test.csv',
        processingStatus: ProcessingStatus.IN_PROGRESS,
        recordCount: 5,
        processedCount: 1,
        unprocessedCount: 4,
        createdAt: now,
        updatedAt: now,
      };

      mockSend.mockResolvedValueOnce({ Attributes: mockTaskFile });

      // Act
      await incrementTaskFileProcessedCount(taskFileId);

      // Assert
      const updateCommand = mockSend.mock.calls[0][0];
      expect(updateCommand.input.ExpressionAttributeValues[':processingStatus']).toBe(ProcessingStatus.IN_PROGRESS);
    });

    it('should update the updatedAt timestamp', async () => {
      // Arrange
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const now = '2026-01-14T10:00:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(now);

      const mockTaskFile = {
        pk: `TASKFILE#${taskFileId}`,
        sk: 'DETAIL',
        id: taskFileId,
        fileName: 'test.csv',
        processingStatus: ProcessingStatus.IN_PROGRESS,
        recordCount: 5,
        processedCount: 1,
        unprocessedCount: 4,
        createdAt: '2026-01-14T09:00:00.000Z',
        updatedAt: now,
      };

      mockSend.mockResolvedValueOnce({ Attributes: mockTaskFile });

      // Act
      await incrementTaskFileProcessedCount(taskFileId);

      // Assert
      const updateCommand = mockSend.mock.calls[0][0];
      expect(updateCommand.input.ExpressionAttributeValues[':updatedAt']).toBe(now);
    });

    it('should return a TaskFile object', async () => {
      // Arrange
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const now = '2026-01-14T10:00:00.000Z';

      const mockTaskFile = {
        pk: `TASKFILE#${taskFileId}`,
        sk: 'DETAIL',
        id: taskFileId,
        fileName: 'test.csv',
        processingStatus: ProcessingStatus.IN_PROGRESS,
        recordCount: 10,
        processedCount: 5,
        unprocessedCount: 5,
        createdAt: '2026-01-14T09:00:00.000Z',
        updatedAt: now,
      };

      mockSend.mockResolvedValueOnce({ Attributes: mockTaskFile });

      // Act
      const result = await incrementTaskFileProcessedCount(taskFileId);

      // Assert
      expect(result).toEqual({
        id: taskFileId,
        fileName: 'test.csv',
        processingStatus: ProcessingStatus.IN_PROGRESS,
        recordCount: 10,
        processedCount: 5,
        unprocessedCount: 5,
        createdAt: '2026-01-14T09:00:00.000Z',
        updatedAt: now,
      });
    });

    it('should handle DynamoDB errors gracefully', async () => {
      // Arrange
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const dbError = new Error('DynamoDB UpdateCommand failed');
      mockSend.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(incrementTaskFileProcessedCount(taskFileId)).rejects.toThrow('DynamoDB UpdateCommand failed');
      expect(mockLoggerError).toHaveBeenCalled();
    });

    it('should log success message with taskFileId', async () => {
      // Arrange
      const taskFileId = '550e8400-e29b-41d4-a716-446655440000';
      const now = '2026-01-14T10:00:00.000Z';

      const mockTaskFile = {
        pk: `TASKFILE#${taskFileId}`,
        sk: 'DETAIL',
        id: taskFileId,
        fileName: 'test.csv',
        processingStatus: ProcessingStatus.IN_PROGRESS,
        recordCount: 5,
        processedCount: 2,
        unprocessedCount: 3,
        createdAt: now,
        updatedAt: now,
      };

      mockSend.mockResolvedValueOnce({ Attributes: mockTaskFile });

      // Act
      await incrementTaskFileProcessedCount(taskFileId);

      // Assert
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        expect.objectContaining({ taskFileId }),
        expect.stringContaining('incrementTaskFileProcessedCount'),
      );
    });
  });
});
