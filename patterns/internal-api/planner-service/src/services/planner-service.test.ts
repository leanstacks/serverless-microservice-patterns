import { APIGatewayProxyResult } from 'aws-lambda';

import { Task } from '../models/task';
import { DailyPlanner } from '../models/daily-planner';

// Mock dependencies
const mockInvokeLambda = jest.fn();

jest.mock('../utils/config', () => ({
  config: {
    LIST_TASKS_FUNCTION_NAME: 'test-list-tasks-function',
  },
}));

jest.mock('../utils/lambda-client', () => ({
  invokeLambdaSync: mockInvokeLambda,
}));

jest.mock('../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('planner-service', () => {
  let getDailyPlanner: typeof import('./planner-service').getDailyPlanner;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import the module after mocks are set up
    getDailyPlanner = require('./planner-service').getDailyPlanner;
  });

  describe('getDailyPlanner', () => {
    it('should retrieve daily planner with tasks', async () => {
      // Arrange
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Test Task 1',
          isComplete: false,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Test Task 2',
          detail: 'Task detail',
          isComplete: true,
          createdAt: '2025-01-02T00:00:00Z',
          updatedAt: '2025-01-02T00:00:00Z',
        },
      ];

      const listTasksResponse: APIGatewayProxyResult = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockTasks),
      };

      mockInvokeLambda.mockResolvedValueOnce(listTasksResponse);

      // Act
      const result: DailyPlanner = await getDailyPlanner();

      // Assert
      expect(result).toBeDefined();
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0]?.id).toBe('1');
      expect(result.tasks[1]?.id).toBe('2');
      expect(mockInvokeLambda).toHaveBeenCalledTimes(1);
    });

    it('should return empty tasks array when ListTasks returns empty list', async () => {
      // Arrange
      const listTasksResponse: APIGatewayProxyResult = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]),
      };

      mockInvokeLambda.mockResolvedValueOnce(listTasksResponse);

      // Act
      const result: DailyPlanner = await getDailyPlanner();

      // Assert
      expect(result).toBeDefined();
      expect(result.tasks).toHaveLength(0);
    });

    it('should return empty tasks array when ListTasks returns empty body', async () => {
      // Arrange
      const listTasksResponse: APIGatewayProxyResult = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: '',
      };

      mockInvokeLambda.mockResolvedValueOnce(listTasksResponse);

      // Act
      const result: DailyPlanner = await getDailyPlanner();

      // Assert
      expect(result).toBeDefined();
      expect(result.tasks).toHaveLength(0);
    });

    it('should throw error when Lambda invocation fails', async () => {
      // Arrange
      const error = new Error('Lambda invocation failed');
      mockInvokeLambda.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(getDailyPlanner()).rejects.toThrow('Lambda invocation failed');
    });

    it('should invoke Lambda with correct parameters', async () => {
      // Arrange
      const mockTasks: Task[] = [];

      const listTasksResponse: APIGatewayProxyResult = {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockTasks),
      };

      mockInvokeLambda.mockResolvedValueOnce(listTasksResponse);

      // Act
      await getDailyPlanner();

      // Assert
      expect(mockInvokeLambda).toHaveBeenCalledWith('test-list-tasks-function', expect.any(Object));
    });
  });
});
