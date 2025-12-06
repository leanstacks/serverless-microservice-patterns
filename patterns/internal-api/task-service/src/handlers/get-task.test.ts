import { APIGatewayProxyEvent, Context } from 'aws-lambda';

import { Task } from '../models/task';

// Mock dependencies BEFORE importing handler
const mockGetTask = jest.fn();
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
  getTask: mockGetTask,
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

describe('get-task handler', () => {
  let handler: typeof import('./get-task').handler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import handler after mocks are set up
    handler = require('./get-task').handler;
  });

  const createMockEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => {
    return {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/tasks/123e4567-e89b-12d3-a456-426614174000',
      pathParameters: {
        taskId: '123e4567-e89b-12d3-a456-426614174000',
      },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api-id',
        authorizer: null,
        protocol: 'HTTP/1.1',
        httpMethod: 'GET',
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
    it('should return task when it exists', async () => {
      // Arrange
      const mockTask: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        detail: 'Test detail',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      mockGetTask.mockResolvedValue(mockTask);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockTask);
      expect(mockGetTask).toHaveBeenCalledTimes(1);
      expect(mockGetTask).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[GetTask] > handler', expect.any(Object));
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        '[GetTask] < handler - successfully retrieved task',
        expect.any(Object),
      );
    });

    it('should return 404 when task does not exist', async () => {
      // Arrange
      mockGetTask.mockResolvedValue(null);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Task not found',
      });
      expect(mockGetTask).toHaveBeenCalledTimes(1);
      expect(mockGetTask).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
      expect(mockLoggerInfo).toHaveBeenCalledWith('[GetTask] < handler - task not found', expect.any(Object));
    });

    it('should return 404 when taskId path parameter is missing', async () => {
      // Arrange
      const event = createMockEvent({
        pathParameters: null,
      });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Task not found',
      });
      expect(mockGetTask).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        '[GetTask] < handler - missing taskId path parameter',
        expect.any(Object),
      );
    });

    it('should return 404 when taskId is undefined', async () => {
      // Arrange
      const event = createMockEvent({
        pathParameters: {},
      });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(404);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Task not found',
      });
      expect(mockGetTask).not.toHaveBeenCalled();
    });

    it('should return 500 error when service throws an error', async () => {
      // Arrange
      const mockError = new Error('Service error');
      mockGetTask.mockRejectedValue(mockError);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Failed to retrieve task',
      });
      expect(mockGetTask).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[GetTask] < handler - failed to get task',
        mockError,
        expect.any(Object),
      );
    });

    it('should include CORS headers in response', async () => {
      // Arrange
      const mockTask: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      mockGetTask.mockResolvedValue(mockTask);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.headers).toBeDefined();
      expect(result.headers?.['Content-Type']).toBe('application/json');
      expect(result.headers?.['Access-Control-Allow-Origin']).toBeDefined();
    });

    it('should log request context information', async () => {
      // Arrange
      const mockTask: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      mockGetTask.mockResolvedValue(mockTask);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      await handler(event, context);

      // Assert
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        '[GetTask] > handler',
        expect.objectContaining({
          requestId: 'test-request-id',
          event: expect.any(Object),
        }),
      );
    });

    it('should return task with only required fields', async () => {
      // Arrange
      const mockTask: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: false,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      mockGetTask.mockResolvedValue(mockTask);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toEqual(mockTask);
      expect(body).not.toHaveProperty('detail');
      expect(body).not.toHaveProperty('dueAt');
    });

    it('should handle different task IDs', async () => {
      // Arrange
      const taskId = 'different-task-id';
      const mockTask: Task = {
        id: taskId,
        title: 'Different Task',
        isComplete: true,
        createdAt: '2025-11-01T10:00:00.000Z',
        updatedAt: '2025-11-01T10:00:00.000Z',
      };

      mockGetTask.mockResolvedValue(mockTask);
      const event = createMockEvent({
        pathParameters: { taskId },
        path: `/tasks/${taskId}`,
      });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(mockGetTask).toHaveBeenCalledWith(taskId);
      expect(JSON.parse(result.body)).toEqual(mockTask);
    });
  });
});
