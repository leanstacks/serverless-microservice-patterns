import { APIGatewayProxyEvent, Context } from 'aws-lambda';

import { Task } from '../models/task';

// Mock dependencies BEFORE importing handler
const mockCreateTask = jest.fn();
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
  createTask: mockCreateTask,
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  },
}));

describe('create-task handler', () => {
  let handler: typeof import('./create-task').handler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import handler after mocks are set up
    handler = require('./create-task').handler;
  });

  const createMockEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => {
    return {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/tasks',
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {
        accountId: '123456789012',
        apiId: 'test-api-id',
        authorizer: null,
        protocol: 'HTTP/1.1',
        httpMethod: 'POST',
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
        path: '/tasks',
        stage: 'test',
        requestId: 'test-request-id',
        requestTimeEpoch: Date.now(),
        resourceId: 'test-resource-id',
        resourcePath: '/tasks',
      },
      resource: '/tasks',
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
    it('should create a task and return 201 with created task', async () => {
      // Arrange
      const requestBody = {
        title: 'Test Task',
        detail: 'Test detail',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: false,
      };

      const mockTask: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        detail: 'Test detail',
        dueAt: '2025-12-31T23:59:59.000Z',
        isComplete: false,
        createdAt: '2025-12-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockCreateTask.mockResolvedValue(mockTask);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual(mockTask);
      expect(mockCreateTask).toHaveBeenCalledTimes(1);
      expect(mockCreateTask).toHaveBeenCalledWith(requestBody);
      expect(mockLoggerInfo).toHaveBeenCalledWith('[CreateTask] > handler', expect.any(Object));
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        '[CreateTask] < handler - successfully created task',
        expect.any(Object),
      );
    });

    it('should create a task with only required fields', async () => {
      // Arrange
      const requestBody = {
        title: 'Test Task',
      };

      const mockTask: Task = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        isComplete: false,
        createdAt: '2025-12-01T10:00:00.000Z',
        updatedAt: '2025-12-01T10:00:00.000Z',
      };

      mockCreateTask.mockResolvedValue(mockTask);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(201);
      expect(JSON.parse(result.body)).toEqual(mockTask);
      expect(mockCreateTask).toHaveBeenCalledTimes(1);
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
      expect(mockCreateTask).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith('[CreateTask] < handler - missing request body', expect.any(Object));
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
      expect(mockCreateTask).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        '[CreateTask] < handler - invalid JSON in request body',
        expect.any(Object),
      );
    });

    it('should return 400 when title is missing', async () => {
      // Arrange
      const requestBody = {
        detail: 'Test detail',
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
      expect(mockCreateTask).not.toHaveBeenCalled();
      expect(mockLoggerWarn).toHaveBeenCalledWith('[CreateTask] < handler - validation error', expect.any(Object));
    });

    it('should return 400 when title is empty', async () => {
      // Arrange
      const requestBody = {
        title: '',
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
      expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it('should return 400 when title exceeds 100 characters', async () => {
      // Arrange
      const requestBody = {
        title: 'a'.repeat(101),
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(responseBody.message).toContain('100 characters');
      expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it('should return 400 when detail exceeds 1000 characters', async () => {
      // Arrange
      const requestBody = {
        title: 'Test Task',
        detail: 'a'.repeat(1001),
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(responseBody.message).toContain('1000 characters');
      expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it('should return 400 when dueAt is not a valid ISO8601 timestamp', async () => {
      // Arrange
      const requestBody = {
        title: 'Test Task',
        dueAt: '2025-12-31',
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(responseBody.message).toContain('ISO8601');
      expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it('should return 400 when isComplete is not a boolean', async () => {
      // Arrange
      const requestBody = {
        title: 'Test Task',
        isComplete: 'true',
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(mockCreateTask).not.toHaveBeenCalled();
    });

    it('should return 500 when service throws an error', async () => {
      // Arrange
      const requestBody = {
        title: 'Test Task',
      };

      const mockError = new Error('DynamoDB error');
      mockCreateTask.mockRejectedValue(mockError);
      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({ message: 'Failed to create task' });
      expect(mockCreateTask).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[CreateTask] < handler - failed to create task',
        mockError,
        expect.any(Object),
      );
    });

    it('should handle multiple validation errors', async () => {
      // Arrange
      const requestBody = {
        title: '',
        detail: 'a'.repeat(1001),
      };

      const event = createMockEvent({ body: JSON.stringify(requestBody) });
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(400);
      const responseBody = JSON.parse(result.body);
      expect(responseBody.message).toContain('Validation failed');
      expect(mockCreateTask).not.toHaveBeenCalled();
    });
  });
});
