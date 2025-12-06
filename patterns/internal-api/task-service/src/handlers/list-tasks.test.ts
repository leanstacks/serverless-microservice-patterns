import { APIGatewayProxyEvent, Context } from 'aws-lambda';

import { Task } from '../models/task';

// Mock dependencies BEFORE importing handler
const mockListTasks = jest.fn();
const mockLoggerInfo = jest.fn();
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
  listTasks: mockListTasks,
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
  },
}));

describe('list-tasks handler', () => {
  let handler: typeof import('./list-tasks').handler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Import handler after mocks are set up
    handler = require('./list-tasks').handler;
  });

  const createMockEvent = (overrides?: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent => {
    return {
      body: null,
      headers: {},
      multiValueHeaders: {},
      httpMethod: 'GET',
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
    it('should return tasks when service returns successfully', async () => {
      // Arrange
      const mockTasks: Task[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task 1',
          detail: 'Test detail 1',
          isComplete: false,
          createdAt: '2025-11-01T10:00:00.000Z',
          updatedAt: '2025-11-01T10:00:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          title: 'Test Task 2',
          isComplete: true,
          createdAt: '2025-11-02T10:00:00.000Z',
          updatedAt: '2025-11-03T10:00:00.000Z',
        },
      ];

      mockListTasks.mockResolvedValue(mockTasks);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual(mockTasks);
      expect(mockListTasks).toHaveBeenCalledTimes(1);
      expect(mockLoggerInfo).toHaveBeenCalledWith('[ListTasks] > handler', expect.any(Object));
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        '[ListTasks] < handler - successfully retrieved tasks',
        expect.any(Object),
      );
    });

    it('should return empty array when no tasks exist', async () => {
      // Arrange
      mockListTasks.mockResolvedValue([]);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual([]);
      expect(mockListTasks).toHaveBeenCalledTimes(1);
    });

    it('should return 500 error when service throws an error', async () => {
      // Arrange
      const mockError = new Error('Service error');
      mockListTasks.mockRejectedValue(mockError);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      const result = await handler(event, context);

      // Assert
      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        message: 'Failed to retrieve tasks',
      });
      expect(mockListTasks).toHaveBeenCalledTimes(1);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[ListTasks] < handler - failed to list tasks',
        mockError,
        expect.any(Object),
      );
    });

    it('should include CORS headers in response', async () => {
      // Arrange
      mockListTasks.mockResolvedValue([]);
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
      mockListTasks.mockResolvedValue([]);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      await handler(event, context);

      // Assert
      expect(mockLoggerInfo).toHaveBeenCalledWith('[ListTasks] > handler', {
        requestId: 'test-request-id',
        event,
      });
    });

    it('should log successful response with count', async () => {
      // Arrange
      const mockTasks: Task[] = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          isComplete: false,
          createdAt: '2025-11-01T10:00:00.000Z',
          updatedAt: '2025-11-01T10:00:00.000Z',
        },
      ];
      mockListTasks.mockResolvedValue(mockTasks);
      const event = createMockEvent();
      const context = createMockContext();

      // Act
      await handler(event, context);

      // Assert
      expect(mockLoggerInfo).toHaveBeenCalledWith('[ListTasks] < handler - successfully retrieved tasks', {
        count: 1,
        requestId: 'test-request-id',
      });
    });
  });
});
