import { createTaskFile, parseCsvAndCreateTasks } from './task-file-service';
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
      expect(mockSendToQueue).toHaveBeenCalledWith(
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        mockCreateTaskDto,
      );
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
});
