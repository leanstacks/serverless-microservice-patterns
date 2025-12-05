import { APIGatewayProxyEvent, Context } from 'aws-lambda';

import { Task } from '../models/task';

// Mock dependencies BEFORE importing handler
const mockUpdateTask = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('../utils/config', () => ({
  config: {
    TASKS_TABLE: 'test-tasks-table',
    AWS_REGION: 'us-east-1',
    LOGGING_ENABLED: true,
    LOGGING_LEVEL: 'info',
    CORS_ALLOW_ORIGIN: '*',
  },
}));

jest.mock('../services/task-service', () => ({
  updateTask: mockUpdateTask,
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

describe('update-task handler', () => {
  let handler: typeof import('./update-task').handler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import handler after mocks are set up
    handler = require('./update-task').handler;
  });

  const createMockEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => {
    return {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'PUT',
      isBase64Encoded: false,
      path: '/tasks/123e4567-e89b-12d3-a456-426614174000',
      pathParameters: { taskId: '123e4567-e89b-12d3-a456-426614174000' },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api-id',
        authorizer: null,
        protocol: 'HTTP/1.1',
        httpMethod: 'PUT',
        identity: {
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          clientCert: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: '127.0.0.1',
          user: null,
          userAgent: 'test-agent',
          userArn: null,
        },
        path: '/tasks/123e4567-e89b-12d3-a456-426614174000',
        stage: 'test',
        requestId: 'test-request-id',
        requestTimeEpoch: Date.now(),
        resourceId: 'test-resource-id',
        resourcePath: '/tasks/{taskId}',
      },
      resource: '/tasks/{taskId}',
      ...overrides,
    };
  };

  const createMockContext = (): Context => {
    return {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-aws-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2025/12/01/[$LATEST]test',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {},
    };
  };

  describe('handler', () => {
    it('should update a task and return 200 with updated task', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const requestBody = {
        title: 'Updated Task',
        detail: 'Updated detail',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: true,
      };

      const mockTask: Task = {
        id: taskId,
        title: 'Updated Task',
        detail: 'Updated detail',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: true,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockUpdateTask.mockResolvedValue(mockTask);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockTask);
      expect(mockUpdateTask).toHaveBeenCalledTimes(1);
      expect(mockUpdateTask).toHaveBeenCalledWith(taskId, requestBody);
      expect(mockLoggerInfo).toHaveBeenCalledWith('[UpdateTask] > handler', expect.any(Object));
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        '[UpdateTask] < handler - successfully updated task',
        expect.any(Object),
      );
    });

    it('should update a task with only required fields', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const requestBody = {
        title: 'Updated Task',
        isComplete: false,
      };

      const mockTask: Task = {
        id: taskId,
        title: 'Updated Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockUpdateTask.mockResolvedValue(mockTask);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockTask);
      expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when taskId is missing', async () => {
      // Arrange
      const requestBody = {
        title: 'Updated Task',
        isComplete: false,
      };

      const event = createMockEvent({
        body: JSON.stringify(requestBody),
        pathParameters: null,
      });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message: 'Task ID is required' });
      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith('[UpdateTask] < handler - missing taskId', expect.any(Object));
    });

    it('should return 400 when request body is missing', async () => {
      // Arrange
      const event = createMockEvent({ body: null });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message: 'Request body is required' });
      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith('[UpdateTask] < handler - missing request body', expect.any(Object));
    });

    it('should return 400 when request body is not valid JSON', async () => {
      // Arrange
      const event = createMockEvent({ body: 'invalid-json' });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({ message: 'Invalid JSON in request body' });
      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        '[UpdateTask] < handler - invalid JSON in request body',
        expect.any(Object),
      );
    });

    it('should return 404 when task is not found', async () => {
      // Arrange
      const requestBody = {
        title: 'Updated Task',
        isComplete: false,
      };

      mockUpdateTask.mockResolvedValue(null);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(mockUpdateTask).toHaveBeenCalledTimes(1);
      expect(mockLoggerInfo).toHaveBeenCalledWith('[UpdateTask] < handler - task not found', expect.any(Object));
    });

    it('should return 400 when title is missing', async () => {
      // Arrange
      const requestBody = {
        detail: 'Updated detail',
        isComplete: false,
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(responseBody.message).toContain('title');
      expect(mockUpdateTask).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith('[UpdateTask] < handler - validation error', expect.any(Object));
    });

    it('should return 400 when title is empty', async () => {
      // Arrange
      const requestBody = {
        title: '',
        isComplete: false,
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(responseBody.message).toContain('Title is required');
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it('should return 400 when title exceeds 100 characters', async () => {
      // Arrange
      const requestBody = {
        title: 'a'.repeat(101),
        isComplete: false,
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(responseBody.message).toContain('Title must not exceed 100 characters');
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it('should return 400 when detail exceeds 1000 characters', async () => {
      // Arrange
      const requestBody = {
        title: 'Updated Task',
        detail: 'a'.repeat(1001),
        isComplete: false,
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(responseBody.message).toContain('Detail must not exceed 1000 characters');
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it('should return 400 when dueAt is not a valid ISO8601 timestamp', async () => {
      // Arrange
      const requestBody = {
        title: 'Updated Task',
        dueAt: 'not-a-date',
        isComplete: false,
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(responseBody.message).toContain('Due date must be a valid ISO8601 timestamp');
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it('should return 400 when isComplete is missing', async () => {
      // Arrange
      const requestBody = {
        title: 'Updated Task',
        detail: 'Updated detail',
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(responseBody.message).toContain('isComplete');
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it('should return 400 when isComplete is not a boolean', async () => {
      // Arrange
      const requestBody = {
        title: 'Updated Task',
        isComplete: 'true', // string instead of boolean
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(mockUpdateTask).not.toHaveBeenCalled();
    });

    it('should allow extra fields like createdAt and updatedAt', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const requestBody = {
        title: 'Updated Task',
        isComplete: false,
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-12-02T10:00:00.000Z',
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const mockTask: Task = {
        id: taskId,
        title: 'Updated Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockUpdateTask.mockResolvedValue(mockTask);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockUpdateTask).toHaveBeenCalledTimes(1);
      // Verify only the validated DTO fields are passed to the service
      expect(mockUpdateTask).toHaveBeenCalledWith(taskId, {
        title: 'Updated Task',
        isComplete: false,
      });
    });

    it('should return 500 when update fails with unexpected error', async () => {
      // Arrange
      const requestBody = {
        title: 'Updated Task',
        isComplete: false,
      };

      const mockError = new Error('DynamoDB error');
      mockUpdateTask.mockRejectedValue(mockError);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({ message: 'Failed to update task' });
      expect(mockUpdateTask).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[UpdateTask] < handler - failed to update task',
        mockError,
        expect.any(Object),
      );
    });

    it('should handle updating task with detail', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const requestBody = {
        title: 'Updated Task',
        detail: 'New detail',
        isComplete: false,
      };

      const mockTask: Task = {
        id: taskId,
        title: 'Updated Task',
        detail: 'New detail',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockUpdateTask.mockResolvedValue(mockTask);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).detail).toBe('New detail');
    });

    it('should handle updating task with dueAt', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const requestBody = {
        title: 'Updated Task',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: false,
      };

      const mockTask: Task = {
        id: taskId,
        title: 'Updated Task',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockUpdateTask.mockResolvedValue(mockTask);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).dueAt).toBe('2025-12-31T23:59:59.000Z');
    });

    it('should handle marking task as complete', async () => {
      // Arrange
      const taskId = '123e4567-e89b-12d3-a456-426614174000';
      const requestBody = {
        title: 'Updated Task',
        isComplete: true,
      };

      const mockTask: Task = {
        id: taskId,
        title: 'Updated Task',
        isComplete: true,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockUpdateTask.mockResolvedValue(mockTask);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body).isComplete).toBe(true);
    });
  });
});
